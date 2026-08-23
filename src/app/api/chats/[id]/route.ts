/**
 * app/api/chats/[id]/route.ts
 *
 * GET /api/chats/[id] - Get a single chat with messages
 * DELETE /api/chats/[id] - Delete a chat
 */

import { getChatWithMessages, deleteChat } from '@/lib/db/queries';
import { logger } from '@/lib/logger';
import { verifyIdToken } from '@/lib/auth/firebaseAdmin';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const maxDuration = 30;

// ============================================================
// GET /api/chats/[id] - Get chat with messages (IDOR protected)
// ============================================================
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientIp = getClientIp(req);
  const ipLimit = await rateLimit(clientIp, { limit: 60, windowSeconds: 60, prefix: 'ratelimit:chat:item' });
  if (!ipLimit.success) {
    return new Response(JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.max(1, Math.ceil((ipLimit.reset - Date.now()) / 1000))),
      },
    });
  }
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

  const { id } = await params;

  // IDOR Check: Only return chat if it belongs to the user
  const chat = await getChatWithMessages(id, userId);

  if (!chat) {
    // Return 404 to not leak existence of other users' chats
    return new Response(
      JSON.stringify({ error: 'NOT_FOUND', message: 'Chat not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(JSON.stringify({ chat }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ============================================================
// DELETE /api/chats/[id] - Delete a chat (IDOR protected)
// ============================================================
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  try {
    const result = await deleteChat(id, userId);

    if (result.count === 0) {
      return new Response(
        JSON.stringify({ error: 'NOT_FOUND', message: 'Chat not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Failed to delete chat', {
      type: 'db_error',
      userId,
      chatId: id,
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response(
      JSON.stringify({ error: 'INTERNAL_ERROR', message: 'Failed to delete chat' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
