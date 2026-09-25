'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/session'
import { isUsernameTaken, updateProfile } from '@/lib/users/profiles'

export type ProfileFormState = {
  ok?: boolean
  error?: string
  fieldErrors?: Partial<Record<'displayName' | 'username' | 'bio' | 'avatarUrl', string>>
}

const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe seu nome.').max(60, 'Use no máximo 60 caracteres.'),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,24}$/, 'Use de 3 a 24 letras minúsculas, números ou _.'),
  bio: z.string().trim().max(280, 'Use no máximo 280 caracteres.'),
  avatarUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value === '' || /^https:\/\/\S+$/.test(value), 'Use um link que comece com https://'),
})

export async function updateProfileAction(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Sua sessão expirou. Entre novamente.' }

  const parsed = profileSchema.safeParse({
    displayName: formData.get('displayName') ?? '',
    username: formData.get('username') ?? '',
    bio: formData.get('bio') ?? '',
    avatarUrl: formData.get('avatarUrl') ?? '',
  })
  if (!parsed.success) {
    const fieldErrors: ProfileFormState['fieldErrors'] = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<ProfileFormState['fieldErrors']>
      fieldErrors[key] ??= issue.message
    }
    return { fieldErrors }
  }

  if (await isUsernameTaken(parsed.data.username, user.id)) {
    return { fieldErrors: { username: 'Este nome de usuário já está em uso.' } }
  }

  await updateProfile(user.id, {
    displayName: parsed.data.displayName,
    username: parsed.data.username,
    bio: parsed.data.bio || null,
    avatarUrl: parsed.data.avatarUrl || null,
  })
  revalidatePath('/', 'layout')
  return { ok: true }
}
