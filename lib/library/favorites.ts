import 'server-only'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { books, categories, favorites } from '@/lib/db/schema'
import type { BookWithCategory } from '@/types'

export async function getFavoriteIds(userId: string) {
  const rows = await db.select({ bookId: favorites.bookId }).from(favorites).where(eq(favorites.userId, userId))
  return new Set(rows.map((row) => row.bookId))
}

export async function isFavorite(userId: string, bookId: number) {
  const [row] = await db
    .select({ bookId: favorites.bookId })
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.bookId, bookId)))
    .limit(1)
  return !!row
}

export async function setFavorite(userId: string, bookId: number, favorite: boolean) {
  if (favorite) {
    await db.insert(favorites).values({ userId, bookId }).onConflictDoNothing()
  } else {
    await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.bookId, bookId)))
  }
}

export async function listFavoriteBooks(userId: string): Promise<BookWithCategory[]> {
  const rows = await db
    .select({ book: books, category: { slug: categories.slug, name: categories.name } })
    .from(favorites)
    .innerJoin(books, eq(books.id, favorites.bookId))
    .leftJoin(categories, eq(categories.id, books.categoryId))
    .where(and(eq(favorites.userId, userId), eq(books.published, true)))
    .orderBy(desc(favorites.createdAt))
  return rows.map((row) => ({ ...row.book, category: row.category?.slug ? row.category : null }))
}
