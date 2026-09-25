import 'server-only'
import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm'
import { cache } from 'react'
import { db } from '@/lib/db'
import { books, categories } from '@/lib/db/schema'
import type { BookWithCategory, CatalogSort } from '@/types'

export const CATALOG_PAGE_SIZE = 12

const bookSelection = {
  book: books,
  category: { slug: categories.slug, name: categories.name },
}

type BookRow = { book: typeof books.$inferSelect; category: { slug: string; name: string } | null }

function toBook(row: BookRow): BookWithCategory {
  return { ...row.book, category: row.category?.slug ? row.category : null }
}

function orderFor(sort: CatalogSort) {
  switch (sort) {
    case 'titulo':
      return [asc(books.title)]
    case 'paginas':
      return [desc(books.pageCount), asc(books.title)]
    default:
      return [sql`${books.publishedAt} desc nulls last`, asc(books.sortOrder)]
  }
}

export type CatalogFilters = {
  query?: string
  category?: string
  sort?: CatalogSort
  page?: number
}

export async function searchCatalog({ query, category, sort = 'recentes', page = 1 }: CatalogFilters) {
  const conditions: SQL[] = [eq(books.published, true)]
  const term = query?.trim()
  if (term) {
    const pattern = `%${term}%`
    const match = or(
      ilike(books.title, pattern),
      ilike(books.author, pattern),
      ilike(books.description, pattern),
      sql`array_to_string(${books.tags}, ' ') ilike ${pattern}`,
    )
    if (match) conditions.push(match)
  }
  if (category) conditions.push(eq(categories.slug, category))

  const where = and(...conditions)
  const [rows, [{ total }]] = await Promise.all([
    db
      .select(bookSelection)
      .from(books)
      .leftJoin(categories, eq(categories.id, books.categoryId))
      .where(where)
      .orderBy(...orderFor(sort))
      .limit(CATALOG_PAGE_SIZE)
      .offset((Math.max(page, 1) - 1) * CATALOG_PAGE_SIZE),
    db.select({ total: count() }).from(books).leftJoin(categories, eq(categories.id, books.categoryId)).where(where),
  ])

  return { books: rows.map(toBook), total, pageCount: Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE)) }
}

export const getBookBySlug = cache(async (slug: string, { includeUnpublished = false } = {}) => {
  const [row] = await db
    .select(bookSelection)
    .from(books)
    .leftJoin(categories, eq(categories.id, books.categoryId))
    .where(includeUnpublished ? eq(books.slug, slug) : and(eq(books.slug, slug), eq(books.published, true)))
    .limit(1)
  return row ? toBook(row) : null
})

export async function getFeaturedBooks(limit = 3) {
  const rows = await db
    .select(bookSelection)
    .from(books)
    .leftJoin(categories, eq(categories.id, books.categoryId))
    .where(and(eq(books.published, true), eq(books.featured, true)))
    .orderBy(asc(books.sortOrder))
    .limit(limit)
  return rows.map(toBook)
}

export async function getRecentBooks(limit = 6) {
  const rows = await db
    .select(bookSelection)
    .from(books)
    .leftJoin(categories, eq(categories.id, books.categoryId))
    .where(eq(books.published, true))
    .orderBy(...orderFor('recentes'))
    .limit(limit)
  return rows.map(toBook)
}

export async function getRelatedBooks(book: BookWithCategory, limit = 4) {
  const rows = await db
    .select(bookSelection)
    .from(books)
    .leftJoin(categories, eq(categories.id, books.categoryId))
    .where(and(eq(books.published, true), sql`${books.id} <> ${book.id}`))
    .orderBy(sql`(${books.categoryId} = ${book.categoryId ?? -1}) desc`, asc(books.sortOrder))
    .limit(limit)
  return rows.map(toBook)
}

export async function getBooksByIds(ids: number[]) {
  if (ids.length === 0) return []
  const rows = await db
    .select(bookSelection)
    .from(books)
    .leftJoin(categories, eq(categories.id, books.categoryId))
    .where(and(inArray(books.id, ids), eq(books.published, true)))
  return rows.map(toBook)
}

export const listCategories = cache(async () => {
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      bookCount: sql<number>`count(${books.id}) filter (where ${books.published})`.mapWith(Number),
    })
    .from(categories)
    .leftJoin(books, eq(books.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.name))
})

export async function listPublishedSlugs() {
  return db.select({ slug: books.slug, updatedAt: books.updatedAt }).from(books).where(eq(books.published, true))
}
