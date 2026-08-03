/**
 * app/api/chats/route.ts
 *
 * GET /api/chats - Get all chats for the authenticated user
 * POST /api/chats - Create a new chat
 */

import { streamText } from 'ai';
import { rateLimit } from '@/lib/rate-limit';
import { getChatsByUserId, createChat } from '@/lib/db/queries';
import { logger } from '@/lib/logger';
import { verifyIdToken } from '@/lib/auth/firebaseAdmin';

// ============================================================
// GET /api/chats - List all chats for the user
// ============================================================
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const idToken = authHeader?.replace('Bearer ', '');

  if (!idToken) {
    return new Response(
      JSON.stringify({ error: 'UNAUTHORIZED', message: 'ID token required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let userId: string;
  try {
    const decoded = await verifyIdToken(idToken);
    userId = decoded.uid;
  } catch {
    return new Response(
      JSON.stringify({ error: 'UNAUTHORIZED', message: 'Invalid ID token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const chats = await getChatsByUserId(userId);
    return new Response(JSON.stringify({ chats }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Failed to fetch chats', {
      type: 'db_error',
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response(
      JSON.stringify({ error: 'INTERNAL_ERROR', message: 'Failed to fetch chats' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ============================================================
// POST /api/chats - Create a new chat
// ============================================================
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const idToken = authHeader?.replace('Bearer ', '');

  if (!idToken) {
    return new Response(
      JSON.stringify({ error: 'UNAUTHORIZED', message: 'ID token required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let userId: string;
  try {
    const decoded = await verifyIdToken(idToken);
    userId = decoded.uid;
  } catch {
    return new Response(
      JSON.stringify({ error: 'UNAUTHORIZED', message: 'Invalid ID token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { title } = body;

    const chat = await createChat(userId, title || 'New Chat');

    return new Response(JSON.stringify({ chat }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
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
}
