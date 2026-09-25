import type { books, categories, comments, profiles, readingProgress } from '@/lib/db/schema'

export type Book = typeof books.$inferSelect
export type Category = typeof categories.$inferSelect
export type Profile = typeof profiles.$inferSelect
export type ReadingProgress = typeof readingProgress.$inferSelect
export type Comment = typeof comments.$inferSelect

export type BookStatus = 'completo' | 'em-andamento'

export type BookWithCategory = Book & {
  category: Pick<Category, 'slug' | 'name'> | null
}

export type ProgressSummary = Pick<ReadingProgress, 'currentPage' | 'totalPages' | 'percent' | 'completed' | 'updatedAt'>

export type CurrentUser = Pick<Profile, 'id' | 'email' | 'displayName' | 'username' | 'bio' | 'avatarUrl' | 'role'> & {
  isAdmin: boolean
}

export type PublicUser = Pick<Profile, 'id' | 'displayName' | 'username' | 'avatarUrl'>

export type CommentWithAuthor = Pick<Comment, 'id' | 'content' | 'createdAt' | 'userId' | 'status'> & {
  author: PublicUser
}

export type ChatMessage = {
  id: number
  content: string
  createdAt: string
  sender: PublicUser
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

export type CatalogSort = 'recentes' | 'titulo' | 'paginas'
