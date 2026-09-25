import 'server-only'
import { and, desc, eq, gt, like, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { messages, profiles } from '@/lib/db/schema'
import { getPublicUsers, publicUserColumns } from '@/lib/users/profiles'
import type { ChatMessage } from '@/types'

export const GLOBAL_CONVERSATION = 'global'
export const MESSAGE_MAX_LENGTH = 500
const MESSAGES_LIMIT = 50

export function directConversationId(userA: string, userB: string) {
  return `dm:${[userA, userB].sort().join(':')}`
}

export function isParticipant(conversationId: string, userId: string) {
  if (conversationId === GLOBAL_CONVERSATION) return true
  if (!conversationId.startsWith('dm:')) return false
  return conversationId.slice(3).split(':').includes(userId)
}

export async function listMessages(conversationId: string, afterId?: number): Promise<ChatMessage[]> {
  const conditions = [eq(messages.conversationId, conversationId)]
  if (afterId) conditions.push(gt(messages.id, afterId))

  const rows = await db
    .select({
      id: messages.id,
      content: messages.content,
      createdAt: messages.createdAt,
      sender: publicUserColumns,
    })
    .from(messages)
    .innerJoin(profiles, eq(profiles.id, messages.senderId))
    .where(and(...conditions))
    .orderBy(desc(messages.id))
    .limit(MESSAGES_LIMIT)

  return rows.reverse().map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
}

export async function createMessage(input: {
  conversationId: string
  senderId: string
  recipientId: string | null
  content: string
}) {
  await db.insert(messages).values(input)
}

export async function listDirectConversations(userId: string) {
  const rows = await db
    .select({
      conversationId: messages.conversationId,
      lastMessage: sql<string>`(array_agg(${messages.content} order by ${messages.id} desc))[1]`,
      lastAt: sql<Date>`max(${messages.createdAt})`.mapWith((value) => new Date(value)),
    })
    .from(messages)
    .where(and(like(messages.conversationId, 'dm:%'), or(eq(messages.senderId, userId), eq(messages.recipientId, userId))))
    .groupBy(messages.conversationId)
    .orderBy(sql`max(${messages.createdAt}) desc`)
    .limit(30)

  const partnerIds = rows.map((row) => row.conversationId.slice(3).split(':').find((id) => id !== userId) ?? userId)
  const partners = new Map((await getPublicUsers(partnerIds)).map((user) => [user.id, user]))

  return rows.flatMap((row, index) => {
    const partner = partners.get(partnerIds[index])
    return partner ? [{ partner, lastMessage: row.lastMessage, lastAt: row.lastAt }] : []
  })
}
