/**
 * app/api/chat/route.ts
 *
 * POST /api/chat - Streaming AI chat endpoint
 *
 * Uses Firebase Auth via ID token verification.
 * Returns SSE (Server-Sent Events) for token-by-token streaming.
 */

import { streamText } from 'ai';
import { rateLimit } from '@/lib/rate-limit';
import { saveChatAndMessages, updateChatTitle, createChat, getChatWithMessages } from '@/lib/db/queries';
import { generateChatTitle } from '@/lib/ai/title-generator';
import { openai, SYSTEM_PROMPT, MODEL_CONFIG } from '@/lib/ai/config';
import { logger } from '@/lib/logger';
import { verifyIdToken } from '@/lib/auth/firebaseAdmin';

export const maxDuration = 60;

type ValidMessage = { role: 'user' | 'assistant' | 'system'; content: string };

function parseMessages(raw: unknown[]): ValidMessage[] | null {
  const messages: ValidMessage[] = [];
  for (const m of raw) {
    const msg = m as { role?: string; content?: unknown };
    if (!msg.role || typeof msg.content !== 'string') {
      return null;
    }
    messages.push({ role: msg.role as ValidMessage['role'], content: msg.content });
  }
  return messages;
}

export async function POST(req: Request) {
  const startTime = Date.now();

  // ============================================================
  // STEP 1: AUTHENTICATION (Firebase ID Token)
  // ============================================================
  const authHeader = req.headers.get('authorization');
  const idToken = authHeader?.replace('Bearer ', '');

  if (!idToken) {
    logger.warn('Missing ID token', { type: 'auth_failure' });
    return new Response(
      JSON.stringify({ error: 'UNAUTHORIZED', message: 'ID token required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let userId: string;
  try {
    const decoded = await verifyIdToken(idToken);
    userId = decoded.uid;
  } catch (error) {
    logger.warn('Invalid ID token', {
      type: 'auth_failure',
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response(
      JSON.stringify({ error: 'UNAUTHORIZED', message: 'Invalid ID token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ============================================================
  // STEP 2: RATE LIMITING
  // ============================================================
  const { success, limit, remaining, reset } = await rateLimit(userId);
  if (!success) {
    logger.warn('Rate limit exceeded', { type: 'rate_limit', userId, limit, remaining });
    return new Response(
      JSON.stringify({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please wait a moment.',
        retryAfter: Math.ceil((reset - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(reset),
          'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
        },
      }
    );
  }

  // ============================================================
  // STEP 3: PARSE & VALIDATE REQUEST
  // ============================================================
  let body: { messages?: unknown[]; chatId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'INVALID_REQUEST', message: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(
      JSON.stringify({ error: 'INVALID_REQUEST', message: 'Messages array is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const messages = parseMessages(body.messages);
  if (!messages) {
    return new Response(
      JSON.stringify({ error: 'INVALID_REQUEST', message: 'Invalid message format' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const lastMessage = messages.at(-1);
  if (!lastMessage?.content?.trim()) {
    return new Response(
      JSON.stringify({ error: 'EMPTY_MESSAGE', message: 'Message content is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let chatId = body.chatId || null;
  const isNewChat = !chatId || chatId.startsWith('new-');

  // ============================================================
  // STEP 4: IDOR CHECK & CHAT CREATION
  // ============================================================

  if (isNewChat) {
    try {
      const chat = await createChat(userId);
      chatId = chat.id;
      logger.info('New chat created', {
        type: 'chat_created',
        userId,
        chatId,
      });
    } catch (error) {
      logger.error('Failed to create chat', {
        type: 'db_error',
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return new Response(
        JSON.stringify({ error: 'INTERNAL_ERROR', message: 'Failed to create chat' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } else {
    const existingChat = await getChatWithMessages(chatId!, userId);
    if (!existingChat) {
      return new Response(
        JSON.stringify({ error: 'NOT_FOUND', message: 'Chat not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Check if this is a hidden instruction message (instruct flow)
  const isHiddenInstruction =
    lastMessage.content.startsWith('[INSTRUCT]');

  const isFirstMessage =
    messages.filter((m) => m.role === 'user').length === 1 && !isHiddenInstruction;

  // ============================================================
  // STEP 5: STREAM RESPONSE
  // ============================================================
  logger.info('Chat stream started', {
    type: 'chat_start',
    userId,
    chatId: chatId!,
    messageCount: messages.length,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await streamText({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: openai(MODEL_CONFIG.primary.model) as any,
    system: SYSTEM_PROMPT,
    messages,
    maxTokens: MODEL_CONFIG.primary.maxTokens,
    temperature: MODEL_CONFIG.primary.temperature,
    abortSignal: req.signal,

    onFinish: async ({ text, usage, finishReason, ...rest }: { text: string; usage: { totalTokens: number }; finishReason: string } & Record<string, unknown>) => {
      const reasoning = (rest as { reasoning?: string }).reasoning;
      // Skip DB save for hidden instruction messages
      if (isHiddenInstruction) return;

      try {
        await saveChatAndMessages({
          chatId: chatId!,
          userMessage: { role: 'user', content: lastMessage.content },
          assistantMessage: {
            role: 'assistant',
            content: text,
            reasoning: reasoning ?? undefined,
          },
        });

        if (isFirstMessage) {
          const title = await generateChatTitle(lastMessage.content);
          await updateChatTitle(chatId!, title);
        }
      } catch (error) {
        logger.error('Failed to save messages', {
          type: 'db_error',
          userId,
          chatId: chatId!,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      logger.info('Chat stream completed', {
        type: 'chat_complete',
        userId,
        chatId: chatId!,
        tokens: usage.totalTokens,
        duration: Date.now() - startTime,
        finishReason,
      });
    },
  });

  // ============================================================
  // STEP 6: RETURN SSE STREAM WITH CHAT ID & SECURITY HEADERS
  // ============================================================
  const stream = result.toDataStream();
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Chat-Id': chatId!,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
  });
}
