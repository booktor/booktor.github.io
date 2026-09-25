'use server'

import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/session'
import {
  GLOBAL_CONVERSATION,
  MESSAGE_MAX_LENGTH,
  createMessage,
  directConversationId,
} from '@/lib/chat/queries'
import { getPublicUser } from '@/lib/users/profiles'
import type { ActionResult } from '@/types'

const messageSchema = z.object({
  recipientId: z.string().min(1).max(128).nullable(),
  content: z.string().trim().min(1, 'Escreva uma mensagem.').max(MESSAGE_MAX_LENGTH, 'Mensagem muito longa.'),
})

export async function sendMessageAction(input: z.input<typeof messageSchema>): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Entre na sua conta para conversar.' }

  const parsed = messageSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Mensagem inválida.' }

  const { recipientId, content } = parsed.data
  if (recipientId) {
    if (recipientId === user.id) return { ok: false, error: 'Escolha outra pessoa para conversar.' }
    if (!(await getPublicUser(recipientId))) return { ok: false, error: 'Usuário não encontrado.' }
  }

  await createMessage({
    conversationId: recipientId ? directConversationId(user.id, recipientId) : GLOBAL_CONVERSATION,
    senderId: user.id,
    recipientId,
    content,
  })
  return { ok: true }
}
