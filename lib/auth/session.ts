import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { cache } from 'react'
import { db } from '@/lib/db'
import { profiles, sessions } from '@/lib/db/schema'
import type { CurrentUser } from '@/types'

const SESSION_COOKIE = 'booktor_session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function cookieOptions(maxAge: number) {
  // The v0 preview renders the app inside a cross-site iframe, which requires SameSite=None.
  const isDev = process.env.NODE_ENV === 'development'
  return {
    httpOnly: true,
    secure: true,
    sameSite: isDev ? ('none' as const) : ('lax' as const),
    path: '/',
    maxAge,
  }
}

function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url')
  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
  })
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, cookieOptions(SESSION_MAX_AGE_SECONDS))
}

export async function destroySession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)))
  cookieStore.set(SESSION_COOKIE, '', cookieOptions(0))
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const [row] = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      displayName: profiles.displayName,
      username: profiles.username,
      bio: profiles.bio,
      avatarUrl: profiles.avatarUrl,
      role: profiles.role,
    })
    .from(sessions)
    .innerJoin(profiles, eq(profiles.id, sessions.userId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1)

  if (!row) return null
  const isAdmin = row.role === 'admin' || (!!row.email && adminEmails().includes(row.email.toLowerCase()))
  return { ...row, isAdmin }
})

export async function requireUser(nextPath: string) {
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`)
  return user
}

export async function requireAdmin() {
  const user = await requireUser('/admin')
  if (!user.isAdmin) notFound()
  return user
}
