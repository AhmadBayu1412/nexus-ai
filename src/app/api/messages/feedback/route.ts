/**
 * app/api/messages/feedback/route.ts
 *
 * POST /api/messages/feedback
 *
 * Saves like/dislike feedback on a specific message.
 * Protected by Firebase ID token verification.
 */

import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/auth/firebaseAdmin';
import { updateMessageFeedback } from '@/lib/db/queries';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const idToken = authHeader?.replace('Bearer ', '');

  if (!idToken) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'ID token required' },
      { status: 401 }
    );
  }

  let userId: string;
  try {
    const decoded = await verifyIdToken(idToken);
    userId = decoded.uid;
  } catch {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Invalid ID token' },
      { status: 401 }
    );
  }

  let body: { chatId?: string; messageId?: string; feedback?: { type: string; timestamp: number } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'INVALID_REQUEST', message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { chatId, messageId, feedback } = body;
  if (!chatId || !messageId || !feedback) {
    return NextResponse.json(
      { error: 'INVALID_REQUEST', message: 'chatId, messageId, and feedback are required' },
      { status: 400 }
    );
  }

  if (feedback.type !== 'like' && feedback.type !== 'dislike') {
    return NextResponse.json(
      { error: 'INVALID_REQUEST', message: 'feedback.type must be "like" or "dislike"' },
      { status: 400 }
    );
  }

  try {
    await updateMessageFeedback(chatId, messageId, {
      type: feedback.type as 'like' | 'dislike',
      timestamp: feedback.timestamp,
    });

    logger.info('Message feedback saved', {
      type: 'feedback_saved',
      userId,
      chatId,
      messageId,
      feedbackType: feedback.type,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to save message feedback', {
      type: 'db_error',
      userId,
      chatId,
      messageId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to save feedback' },
      { status: 500 }
    );
  }
}
