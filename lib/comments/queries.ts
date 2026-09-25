import 'server-only'
import { and, count, desc, eq, lt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { books, comments, profiles } from '@/lib/db/schema'
import { publicUserColumns } from '@/lib/users/profiles'
import type { CommentWithAuthor } from '@/types'

export const COMMENTS_PAGE_SIZE = 10
export const COMMENT_MAX_LENGTH = 1000

const commentColumns = {
  id: comments.id,
  content: comments.content,
  createdAt: comments.createdAt,
  userId: comments.userId,
  status: comments.status,
  author: publicUserColumns,
}

export async function listBookComments(bookId: number, beforeId?: number) {
  const conditions = [eq(comments.bookId, bookId), eq(comments.status, 'visible')]
  if (beforeId) conditions.push(lt(comments.id, beforeId))

  const rows = await db
    .select(commentColumns)
    .from(comments)
    .innerJoin(profiles, eq(profiles.id, comments.userId))
    .where(and(...conditions))
    .orderBy(desc(comments.id))
    .limit(COMMENTS_PAGE_SIZE + 1)

  const hasMore = rows.length > COMMENTS_PAGE_SIZE
  return { comments: rows.slice(0, COMMENTS_PAGE_SIZE) as CommentWithAuthor[], hasMore }
}

export async function countBookComments(bookId: number) {
  const [{ total }] = await db
    .select({ total: count() })
    .from(comments)
    .where(and(eq(comments.bookId, bookId), eq(comments.status, 'visible')))
  return total
}

export async function createComment(userId: string, bookId: number, content: string) {
  await db.insert(comments).values({ userId, bookId, content })
}

export async function getComment(commentId: number) {
  const [row] = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1)
  return row ?? null
}

export async function deleteComment(commentId: number) {
  await db.delete(comments).where(eq(comments.id, commentId))
}

export async function setCommentStatus(commentId: number, status: 'visible' | 'hidden') {
  await db.update(comments).set({ status }).where(eq(comments.id, commentId))
}

export async function listRecentComments(limit = 50) {
  return db
    .select({ ...commentColumns, book: { title: books.title, slug: books.slug } })
    .from(comments)
    .innerJoin(profiles, eq(profiles.id, comments.userId))
    .innerJoin(books, eq(books.id, comments.bookId))
    .orderBy(desc(comments.id))
    .limit(limit)
}
