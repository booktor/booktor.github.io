'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { describeAuthError, firebaseAuth } from '@/lib/auth/firebase'
import { createSession, destroySession } from '@/lib/auth/session'
import { ensureProfile } from '@/lib/users/profiles'
import { safeRedirectPath } from '@/lib/utils'

export type AuthFormState = {
  error?: string
  message?: string
  fieldErrors?: Partial<Record<'name' | 'email' | 'password', string>>
  values?: { name?: string; email?: string }
}

const emailSchema = z.string().trim().toLowerCase().email('Informe um e-mail válido.')
const passwordSchema = z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres.').max(128)

function fieldErrorsFrom(error: z.ZodError) {
  const fieldErrors: AuthFormState['fieldErrors'] = {}
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof NonNullable<AuthFormState['fieldErrors']>
    fieldErrors[key] ??= issue.message
  }
  return fieldErrors
}

export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = z
    .object({ email: emailSchema, password: z.string().min(1, 'Informe sua senha.') })
    .safeParse({ email: formData.get('email'), password: formData.get('password') })
  const values = { email: String(formData.get('email') ?? '') }
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values }

  try {
    const account = await firebaseAuth.signIn(parsed.data.email, parsed.data.password)
    await ensureProfile({ id: account.localId, email: account.email, displayName: account.displayName })
    await createSession(account.localId)
  } catch (error) {
    return { error: describeAuthError(error), values }
  }

  redirect(safeRedirectPath(formData.get('next'), '/biblioteca'))
}

export async function signUpAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = z
    .object({
      name: z.string().trim().min(2, 'Informe seu nome.').max(60, 'Use no máximo 60 caracteres.'),
      email: emailSchema,
      password: passwordSchema,
    })
    .safeParse({ name: formData.get('name'), email: formData.get('email'), password: formData.get('password') })
  const values = { name: String(formData.get('name') ?? ''), email: String(formData.get('email') ?? '') }
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values }

  try {
    const account = await firebaseAuth.signUp(parsed.data.email, parsed.data.password)
    await firebaseAuth.updateDisplayName(account.idToken, parsed.data.name).catch(() => null)
    await ensureProfile({ id: account.localId, email: account.email, displayName: parsed.data.name })
    await createSession(account.localId)
  } catch (error) {
    return { error: describeAuthError(error), values }
  }

  redirect(safeRedirectPath(formData.get('next'), '/catalogo'))
}

export async function requestPasswordResetAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = emailSchema.safeParse(formData.get('email'))
  const values = { email: String(formData.get('email') ?? '') }
  if (!parsed.success) return { fieldErrors: { email: parsed.error.issues[0]?.message }, values }

  try {
    await firebaseAuth.sendPasswordReset(parsed.data)
  } catch (error) {
    const message = describeAuthError(error)
    if (!message.includes('incorretos')) return { error: message, values }
  }

  return { message: 'Se existir uma conta com este e-mail, você receberá um link para criar uma nova senha.' }
}

export async function signOutAction() {
  await destroySession()
  redirect('/')
}
