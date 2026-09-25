import 'server-only'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { books, categories, readingProgress } from '@/lib/db/schema'
import type { BookWithCategory, ProgressSummary } from '@/types'

const summaryColumns = {
  currentPage: readingProgress.currentPage,
  totalPages: readingProgress.totalPages,
  percent: readingProgress.percent,
  completed: readingProgress.completed,
  updatedAt: readingProgress.updatedAt,
}

export async function getProgress(userId: string, bookId: number): Promise<ProgressSummary | null> {
  const [row] = await db
    .select(summaryColumns)
    .from(readingProgress)
    .where(and(eq(readingProgress.userId, userId), eq(readingProgress.bookId, bookId)))
    .limit(1)
  return row ?? null
}

export async function getProgressMap(userId: string) {
  const rows = await db
    .select({ bookId: readingProgress.bookId, ...summaryColumns })
    .from(readingProgress)
    .where(eq(readingProgress.userId, userId))
  return new Map<number, ProgressSummary>(rows.map(({ bookId, ...rest }) => [bookId, rest]))
}

export async function listReadingActivity(userId: string) {
  const rows = await db
    .select({
      book: books,
      category: { slug: categories.slug, name: categories.name },
      progress: summaryColumns,
    })
    .from(readingProgress)
    .innerJoin(books, eq(books.id, readingProgress.bookId))
    .leftJoin(categories, eq(categories.id, books.categoryId))
    .where(and(eq(readingProgress.userId, userId), eq(books.published, true)))
    .orderBy(desc(readingProgress.updatedAt))

  return rows.map((row) => ({
    book: { ...row.book, category: row.category?.slug ? row.category : null } as BookWithCategory,
    progress: row.progress as ProgressSummary,
  }))
}

export async function saveProgress(userId: string, bookId: number, currentPage: number, totalPages: number) {
  const page = Math.min(Math.max(1, currentPage), totalPages)
  const percent = Math.round((page / totalPages) * 1000) / 10
  const completed = page >= totalPages
  const now = new Date()

  await db
    .insert(readingProgress)
    .values({ userId, bookId, currentPage: page, totalPages, percent, completed, updatedAt: now })
    .onConflictDoUpdate({
      target: [readingProgress.userId, readingProgress.bookId],
      set: { currentPage: page, totalPages, percent, completed, updatedAt: now },
    })
}
