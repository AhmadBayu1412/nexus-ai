/**
 * lib/ai/title-generator.ts
 * 
 * Title generation for new chats.
 * Uses the same Olagon Gateway for cost efficiency.
 */

import { generateText } from 'ai';
import { openai, TITLE_CONFIG } from '@/lib/ai/config';
import { logger } from '@/lib/logger';

const TITLE_SYSTEM_PROMPT = `You are a chat title generator. Given a user's first message, generate a short, concise title (max 5 words, no quotes). Be specific but brief. Example: "React useEffect guide"`;

/**
 * Generate a title from the user's first message
 * @param userMessage - The user's first message
 * @returns A short, concise title (max 100 characters)
 */
export async function generateChatTitle(userMessage: string): Promise<string> {
  try {
    const truncatedMessage = userMessage.slice(0, 500);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { text } = await generateText({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: openai(TITLE_CONFIG.model) as any,
      system: TITLE_SYSTEM_PROMPT,
      prompt: `Generate a title for this message: "${truncatedMessage}"`,
      maxTokens: TITLE_CONFIG.maxTokens,
      temperature: TITLE_CONFIG.temperature,
    });

    const cleanTitle = text.trim().replace(/^["']|["']$/g, '').slice(0, 100);

    logger.info('Title generated', {
      type: 'title_generation',
      originalLength: userMessage.length,
      generatedTitle: cleanTitle,
    });

    return cleanTitle || 'New Chat';
  } catch (error) {
    logger.error('Title generation failed', {
      type: 'title_generation_error',
      error: error instanceof Error ? error.message : String(error),
      userMessagePreview: userMessage.slice(0, 100),
    });

    return 'New Chat';
  }
}
