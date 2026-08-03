/**
 * lib/db/queries.ts
 * 
 * Database query functions.
 * All DB operations must include userId filter for IDOR protection.
 */

import { db } from '@/lib/db';

// ============================================================
// CHAT QUERIES
// ============================================================

/**
 * Get all chats for a user (sidebar list)
 * Includes IDOR protection via userId filter
 */
export async function getChatsByUserId(userId: string, limit = 50) {
  return db.chat.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
    take: limit,
  });
}

/**
 * Get a single chat with all messages
 * IDOR protection: MUST match userId
 */
export async function getChatWithMessages(chatId: string, userId: string) {
  return db.chat.findFirst({
    where: {
      id: chatId,
      userId, // IDOR check at query level
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

/**
 * Create a new chat for a user.
 * Creates the user record first if it doesn't exist (for Firebase Auth users).
 */
export async function createChat(userId: string, title?: string) {
  // Ensure user exists in DB (for Firebase Auth users who may not have a DB record)
  await db.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: `${userId}@firebase.local`, // Placeholder email for Firebase users
      name: null,
      image: null,
    },
  });

  return db.chat.create({
    data: {
      userId,
      title: title || 'New Chat',
    },
  });
}

/**
 * Update chat title
 */
export async function updateChatTitle(chatId: string, title: string) {
  return db.chat.update({
    where: { id: chatId },
    data: { title, updatedAt: new Date() },
  });
}

/**
 * Delete a chat
 * IDOR protection: userId must match
 */
export async function deleteChat(chatId: string, userId: string) {
  return db.chat.deleteMany({
    where: {
      id: chatId,
      userId, // IDOR protection
    },
  });
}

// ============================================================
// MESSAGE QUERIES
// ============================================================

/**
 * Save a single message
 */
export async function saveMessage(params: {
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}) {
  return db.message.create({
    data: {
      chatId: params.chatId,
      role: params.role,
      content: params.content,
    },
  });
}

/**
 * Save both user and assistant messages in a transaction
 * This ensures atomic writes - both succeed or both fail
 */
export async function saveChatAndMessages(params: {
  chatId: string;
  userMessage: { role: 'user' | 'assistant'; content: string; hidden?: boolean };
  assistantMessage: { role: 'user' | 'assistant'; content: string; reasoning?: string };
}) {
  return db.$transaction([
    db.message.create({
      data: {
        chatId: params.chatId,
        role: params.userMessage.role,
        content: params.userMessage.content,
        hidden: params.userMessage.hidden ?? false,
      },
    }),
    db.message.create({
      data: {
        chatId: params.chatId,
        role: params.assistantMessage.role,
        content: params.assistantMessage.content,
        reasoning: params.assistantMessage.reasoning ?? null,
      },
    }),
    db.chat.update({
      where: { id: params.chatId },
      data: { updatedAt: new Date() },
    }),
  ]);
}

/**
 * Update message feedback (like/dislike)
 * Updates Firestore-style: sets the feedback field on a specific message
 */
export async function updateMessageFeedback(
  chatId: string,
  messageId: string,
  feedback: { type: 'like' | 'dislike'; timestamp: number }
) {
  return db.message.updateMany({
    where: { id: messageId, chatId },
    data: { feedback: JSON.stringify(feedback) },
  });
}

/**
 * Update message reasoning (AI thinking text)
 */
export async function updateMessageReasoning(chatId: string, messageId: string, reasoning: string) {
  return db.message.updateMany({
    where: { id: messageId, chatId },
    data: { reasoning },
  });
}

/**
 * Delete all messages in a chat
 */
export async function deleteMessagesByChatId(chatId: string) {
  return db.message.deleteMany({
    where: { chatId },
  });
}
