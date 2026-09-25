'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/session'
import { getBooksByIds } from '@/lib/books/queries'
import {
  COMMENT_MAX_LENGTH,
  createComment,
  deleteComment,
  getComment,
  listBookComments,
} from '@/lib/comments/queries'
import type { ActionResult, CommentWithAuthor } from '@/types'

export type CommentFormState = { ok?: boolean; error?: string; nonce?: number }

export async function addCommentAction(_prev: CommentFormState, formData: FormData): Promise<CommentFormState> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Entre na sua conta para comentar.' }

  const parsed = z
    .object({
      bookId: z.coerce.number().int().positive(),
      content: z
        .string()
        .trim()
        .min(2, 'Escreva um comentário um pouco maior.')
        .max(COMMENT_MAX_LENGTH, `Use no máximo ${COMMENT_MAX_LENGTH} caracteres.`),
    })
    .safeParse({ bookId: formData.get('bookId'), content: formData.get('content') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }

  const [book] = await getBooksByIds([parsed.data.bookId])
  if (!book) return { error: 'Livro não encontrado.' }

  await createComment(user.id, book.id, parsed.data.content)
  revalidatePath(`/livros/${book.slug}`)
  return { ok: true, nonce: Date.now() }
}

export async function deleteCommentAction(commentId: number, bookSlug: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Entre na sua conta.' }

  const comment = await getComment(commentId)
  if (!comment) return { ok: false, error: 'Comentário não encontrado.' }
  if (comment.userId !== user.id && !user.isAdmin) return { ok: false, error: 'Você não pode apagar este comentário.' }

  await deleteComment(commentId)
  revalidatePath(`/livros/${bookSlug}`)
  return { ok: true, message: 'Comentário apagado.' }
}

export async function loadMoreCommentsAction(bookId: number, beforeId: number) {
  const result = await listBookComments(bookId, beforeId)
  return result as { comments: CommentWithAuthor[]; hasMore: boolean }
}
