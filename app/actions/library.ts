'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/session'
import { getBooksByIds } from '@/lib/books/queries'
import { setFavorite } from '@/lib/library/favorites'
import { saveProgress } from '@/lib/reader/progress'
import type { ActionResult } from '@/types'

export async function toggleFavoriteAction(bookId: number, favorite: boolean): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Entre na sua conta para salvar livros.' }

  const id = z.number().int().positive().safeParse(bookId)
  if (!id.success) return { ok: false, error: 'Livro inválido.' }

  await setFavorite(user.id, id.data, favorite)
  revalidatePath('/biblioteca')
  return { ok: true, message: favorite ? 'Livro salvo na sua biblioteca.' : 'Livro removido dos favoritos.' }
}

const progressSchema = z.object({
  bookId: z.number().int().positive(),
  page: z.number().int().positive(),
  totalPages: z.number().int().positive().max(5000),
})

export async function saveProgressAction(input: z.input<typeof progressSchema>): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'unauthenticated' }

  const parsed = progressSchema.safeParse(input)
  if (!parsed.success || parsed.data.page > parsed.data.totalPages) return { ok: false, error: 'Progresso inválido.' }

  const [book] = await getBooksByIds([parsed.data.bookId])
  if (!book) return { ok: false, error: 'Livro não encontrado.' }

  await saveProgress(user.id, book.id, parsed.data.page, parsed.data.totalPages)
  return { ok: true }
}
