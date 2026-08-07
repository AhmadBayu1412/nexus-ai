/**
 * app/api/chat/route.ts
 *
 * POST /api/chat - Streaming AI chat endpoint
 *
 * Normal requests: AI SDK streamText with toDataStreamResponse()
 * Scoring requests: Two-phase approach:
 *   1. AI calls researchCompanyTool → auto-executed → result sent back
 *   2. AI calls scoreLeadTool → auto-executed → result sent back
 *   3. AI generates summary text with the score data
 *   4. Final text streamed to client
 */

import { streamText, tool } from 'ai';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { saveChatAndMessages, updateChatTitle, createChat, getChatWithMessages } from '@/lib/db/queries';
import { generateChatTitle } from '@/lib/ai/title-generator';
import { openai, SYSTEM_PROMPT, MODEL_CONFIG } from '@/lib/ai/config';
import { logger } from '@/lib/logger';
import { verifyIdToken } from '@/lib/auth/firebaseAdmin';

export const maxDuration = 60;

// ──────────────────────────────────────────────────────────────────────────────
// Tool executors
// ──────────────────────────────────────────────────────────────────────────────

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const TAVILY_BASE = 'https://api.tavily.com/search';

interface TavilyResponse { results: Array<{ title: string; url: string; content: string }>; answer?: string; }

async function executeResearchCompany(args: {
  companyName: string; industry?: string;
}): Promise<Record<string, unknown>> {
  const { companyName, industry } = args;
  const query = industry
    ? `${companyName} company profile funding employees market ${industry}`
    : `${companyName} company profile funding employees market`;

  try {
    const res = await fetch(TAVILY_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TAVILY_API_KEY}` },
      body: JSON.stringify({ query, search_depth: 'basic', max_results: 5, include_answer: true, include_raw_content: false }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const status = res.status;
      if (status === 401 || status === 403) return { error: 'Tavily API key tidak valid.' };
      if (status === 429) return { error: 'Batas penggunaan Tavily tercapai.' };
      return { error: 'Gagal mengambil data dari Google Search.' };
    }

    const data = (await res.json()) as TavilyResponse;
    const rawContent = data.results.slice(0, 3).map((r) => r.content).join(' ');
    const snippet = data.results[0]?.content ?? '';
    const title = data.results[0]?.title ?? companyName;

    let employees = 'Unknown';
    if (/\b(500|ribu|thousand|billion|trillion)\b/i.test(rawContent)) employees = '500+';
    else if (/\b(5[1-9]|[6-9]\d{2})\s*(employee|staf)\b/i.test(rawContent)) employees = '51-500';
    else if (/\b(1[0-9]|2[0-9]|3[0-9]|4[0-9]|50)\s*(employee|staf)\b/i.test(rawContent)) employees = '1-50';

    let funding = 'Unknown';
    if (/series\s*[d-h]\b/i.test(rawContent)) funding = 'Series D+';
    else if (/series\s*c\b/i.test(rawContent)) funding = 'Series C';
    else if (/series\s*b\b/i.test(rawContent)) funding = 'Series B';
    else if (/series\s*a\b/i.test(rawContent)) funding = 'Series A';
    else if (/\b(ipo|public|listed)\b/i.test(rawContent)) funding = 'IPO/Public';

    const isLarge = /Shopee|Tokopedia|Gojek|Grab|Uber|Google|Microsoft|Amazon|Meta|Apple/i.test(companyName);
    if (isLarge && employees === 'Unknown') employees = '500+';
    if (isLarge && funding === 'Unknown') funding = 'Series F+';

    return {
      companyName, industry: industry ?? 'Not specified', title,
      snippet: snippet.slice(0, 300),
      employees, funding,
      sources: data.results.slice(0, 3).map((r) => ({ title: r.title, url: r.url })),
      rawContent: rawContent.slice(0, 2000),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      error: msg.includes('timeout') ? 'Request timeout.' : 'Gagal mengambil data.'
    };
  }
}

function executeScoreLead(args: {
  companyName: string; industry: string;
  employees?: string; funding?: string; snippet?: string; rawContent?: string;
}): { score: number; verdict: string; analysis: string[]; hasResearch: boolean } {
  const { companyName, industry, employees: emp, funding: fund, snippet: snip, rawContent: raw } = args;
  const empStr = emp ?? '';
  const fundStr = fund ?? '';
  const snipStr = snip ?? '';
  const rawStr = raw ?? '';

  let score = industry === 'tech' ? 70 : industry === 'finance' ? 63 : industry === 'retail' ? 50 : 45;

  if (empStr === '500+' || empStr === 'enterprise') score += 20;
  else if (/5[1-9]|[6-9]\d{2}/.test(empStr) || empStr === 'midsize') score += 10;

  if (/Series [D-H]|IPO|Unicorn/i.test(fundStr)) score += 15;
  else if (/Series [A-C]/i.test(fundStr)) score += 10;
  else if (/Series|seed|angel/i.test(fundStr)) score += 5;

  const content = (rawStr || snipStr).toLowerCase();
  if (/revenue|profit|growth|market leader|dominan/i.test(content)) score += 8;
  if (/partner|enterprise|corporate/i.test(content)) score += 5;

  score = Math.min(100, Math.max(1, score));
  const verdict = score >= 75 ? 'Hot Lead' : score >= 50 ? 'Warm Lead' : 'Cold Lead';

  const analysis: string[] = [];
  if (snipStr) analysis.push(`Research: ${snipStr.slice(0, 150)}...`);
  if (fundStr && fundStr !== 'Unknown') {
    analysis.push(
      `Funding: ${fundStr}. ${
        /Series [D-H]|IPO/i.test(fundStr) ? 'Strong financial backing.' :
        /Series/i.test(fundStr) ? 'Established funding.' : 'Early stage.'
      }`
    );
  }
  if (empStr && empStr !== 'Unknown') {
    analysis.push(
      `Employees: ${empStr}. ${
        empStr === '500+' ? 'Large organization — longer sales cycle.' : 'Mid-market — faster decisions.'
      }`
    );
  }
  if (analysis.length === 0) {
    const defaults: Record<string, string[]> = {
      tech: [`${companyName} operates in high-growth tech.`, `Tech shows 3–5× better pilot conversion.`, `Recommended: schedule demo within 48h.`],
      finance: [`${companyName} is in regulated finance.`, `Finance has multi-stakeholder buying committees.`, `Recommended: identify economic buyer.`],
      retail: [`${companyName} is in competitive retail.`, `Retail focuses on measurable ROI.`, `Recommended: prepare case study.`],
      other: [`${companyName} is in a general industry.`, `Assume mid-market B2B playbook.`, `Recommended: ask about company size.`],
    };
    analysis.push(...(defaults[industry] ?? defaults.other));
  }

  return { score, verdict, analysis, hasResearch: !!(empStr || fundStr || snipStr || rawStr) };
}

// ──────────────────────────────────────────────────────────────────────────────
// AI SDK Tool definitions (no execute — handled via onToolCall below)
// ──────────────────────────────────────────────────────────────────────────────

const researchCompanyTool = tool({
  description: 'Research a company by searching Google for recent news, funding, team size, and market presence.',
  parameters: z.object({
    companyName: z.string().describe('Company name to research'),
    industry: z.string().optional().describe('Industry: tech, finance, retail, other'),
  }),
  execute: async ({ companyName, industry }) => executeResearchCompany({ companyName, industry }),
});

const scoreLeadTool = tool({
  description: 'Score a business lead (company) based on research data. Returns a lead score (1-100) with verdict and analysis.',
  parameters: z.object({
    companyName: z.string().describe('Name of the company to score'),
    industry: z.string().describe('Industry: tech | finance | retail | other'),
    employees: z.string().optional().describe('Employee count from research'),
    funding: z.string().optional().describe('Funding stage from research'),
    snippet: z.string().optional().describe('Short description snippet from research'),
    rawContent: z.string().optional().describe('Full raw content from research'),
  }),
  execute: async ({ companyName, industry, employees, funding, snippet, rawContent }) =>
    executeScoreLead({ companyName, industry, employees, funding, snippet, rawContent }),
});

const TOOLS = { researchCompanyTool, scoreLeadTool };

// ──────────────────────────────────────────────────────────────────────────────
// Message parsing
// ──────────────────────────────────────────────────────────────────────────────

type ValidMessage = { role: 'user' | 'assistant' | 'system'; content: string };

function parseMessages(raw: unknown[]): ValidMessage[] | null {
  const messages: ValidMessage[] = [];
  for (const m of raw) {
    const msg = m as { role?: string; content?: unknown };
    if (!msg.role || typeof msg.content !== 'string') return null;
    messages.push({ role: msg.role as ValidMessage['role'], content: msg.content });
  }
  return messages;
}

// ──────────────────────────────────────────────────────────────────────────────
// Route Handler
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const startTime = Date.now();

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization');
  const idToken = authHeader?.replace('Bearer ', '');
  if (!idToken) {
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  let userId: string;
  try {
    const decoded = await verifyIdToken(idToken);
    userId = decoded.uid;
  } catch {
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  // ── Rate Limit ───────────────────────────────────────────────────────────────
  const { success, limit, remaining, reset } = await rateLimit(userId);
  if (!success) {
    return new Response(JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED' }), {
      status: 429, headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': String(remaining),
        'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
      },
    });
  }

  // ── Parse Request ────────────────────────────────────────────────────────────
  let body: { messages?: unknown[]; chatId?: string };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'INVALID_REQUEST' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Messages required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const messages = parseMessages(body.messages);
  if (!messages) {
    return new Response(JSON.stringify({ error: 'Invalid message format' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const lastMessage = messages.at(-1);
  if (!lastMessage?.content?.trim()) {
    return new Response(JSON.stringify({ error: 'EMPTY_MESSAGE' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  let chatId = body.chatId || null;
  const isNewChat = !chatId || chatId.startsWith('new-');

  // ── Chat Creation ────────────────────────────────────────────────────────────
  if (isNewChat) {
    try {
      const chat = await createChat(userId);
      chatId = chat.id;
    } catch {
      return new Response(JSON.stringify({ error: 'INTERNAL_ERROR' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  } else {
    const existingChat = await getChatWithMessages(chatId!, userId);
    if (!existingChat) {
      return new Response(JSON.stringify({ error: 'NOT_FOUND' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
  }

  const isHiddenInstruction = lastMessage.content.startsWith('[INSTRUCT]');
  const isFirstMessage = messages.filter((m) => m.role === 'user').length === 1 && !isHiddenInstruction;

  logger.info('Chat stream started', { type: 'chat_start', userId, chatId: chatId!, messageCount: messages.length });

  // ── Detect scoring request ───────────────────────────────────────────────────
  const isScoringRequest = /\b(score|scoring|lead)\b/i.test(lastMessage.content);

  // ── Stream Response ─────────────────────────────────────────────────────────
  try {
    const model = MODEL_CONFIG.primary.model;

    if (!isScoringRequest) {
      // Non-scoring: use AI SDK streamText
      const result = await streamText({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        model: openai(model) as any,
        system: SYSTEM_PROMPT,
        messages,
        maxTokens: MODEL_CONFIG.primary.maxTokens,
        temperature: MODEL_CONFIG.primary.temperature,
        abortSignal: req.signal,
        onFinish: async ({ text, finishReason }) => {
          if (isHiddenInstruction) return;
          try {
            await saveChatAndMessages({
              chatId: chatId!,
              userMessage: { role: 'user', content: lastMessage.content },
              assistantMessage: { role: 'assistant', content: text },
            });
            if (isFirstMessage) {
              const title = await generateChatTitle(lastMessage.content);
              await updateChatTitle(chatId!, title);
            }
          } catch (error) {
            logger.error('Failed to save messages', { type: 'db_error', userId, chatId: chatId!, error: error instanceof Error ? error.message : String(error) });
          }
          logger.info('Chat stream completed', { type: 'chat_complete', userId, chatId: chatId!, tokens: 0, duration: Date.now() - startTime, finishReason });
        },
      });

      return result.toAIStreamResponse({
        headers: { 'X-Chat-Id': chatId! },
      });
    }

    // ── Scoring request: use AI SDK streamText with tools ─────────────────────
    const result = await streamText({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: openai(model) as any,
      system: SYSTEM_PROMPT,
      messages,
      maxTokens: MODEL_CONFIG.primary.maxTokens,
      maxSteps: 10, // Allow multiple tool call iterations
      temperature: MODEL_CONFIG.primary.temperature,
      abortSignal: req.signal,
      tools: TOOLS,
      onStepFinish: async ({ stepType, toolCalls, toolResults, text }) => {
        logger.info('Step finished', {
          type: 'step_debug',
          stepType,
          toolCallCount: toolCalls?.length ?? 0,
          toolCalls: toolCalls?.map((t) => ({ name: t.toolName })),
          toolResultCount: toolResults?.length ?? 0,
          textLength: text.length,
        });
      },
      onFinish: async ({ text, finishReason, toolResults }) => {
        logger.info('Scoring stream finished', {
          type: 'debug',
          textLength: text.length,
          finishReason,
          toolResultCount: toolResults?.length ?? 0,
          toolResults: toolResults?.map((r) => ({ name: r.toolName, hasResult: !!r.result })),
        });
        if (isHiddenInstruction) return;
        try {
          await saveChatAndMessages({
            chatId: chatId!,
            userMessage: { role: 'user', content: lastMessage.content },
            assistantMessage: { role: 'assistant', content: text || '(Lead scoring)' },
          });
          if (isFirstMessage) {
            const title = await generateChatTitle(lastMessage.content);
            await updateChatTitle(chatId!, title);
          }
        } catch (error) {
          logger.error('Failed to save messages', { type: 'db_error', userId, chatId: chatId!, error: error instanceof Error ? error.message : String(error) });
        }
        logger.info('Chat stream completed', { type: 'chat_complete', userId, chatId: chatId!, tokens: 0, duration: Date.now() - startTime, finishReason });
      },
    });

    return result.toDataStreamResponse({
      headers: { 'X-Chat-Id': chatId! },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Stream failed', { type: 'ai_error', userId, chatId: chatId!, error: message });

    return new Response(JSON.stringify({ error: 'AI_SERVICE_ERROR', message }), {
      status: 502, headers: { 'Content-Type': 'application/json' },
    });
  }
}
