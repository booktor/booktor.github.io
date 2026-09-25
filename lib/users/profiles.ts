import 'server-only'
import { and, desc, eq, inArray, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import type { PublicUser } from '@/types'

export const publicUserColumns = {
  id: profiles.id,
  displayName: profiles.displayName,
  username: profiles.username,
  avatarUrl: profiles.avatarUrl,
}

function baseUsername(source: string) {
  const cleaned = source
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '')
    .slice(0, 16)
  return cleaned || 'leitor'
}

export async function ensureProfile(input: { id: string; email: string; displayName?: string | null }) {
  const displayName = input.displayName?.trim() || input.email.split('@')[0] || 'Leitor'
  const username = `${baseUsername(input.email.split('@')[0] ?? displayName)}_${input.id.slice(0, 4).toLowerCase()}`

  await db
    .insert(profiles)
    .values({ id: input.id, email: input.email, displayName, username })
    .onConflictDoUpdate({ target: profiles.id, set: { email: input.email, lastSeenAt: new Date() } })
}

export async function isUsernameTaken(username: string, exceptUserId: string) {
  const [row] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.username, username), ne(profiles.id, exceptUserId)))
    .limit(1)
  return !!row
}

export async function updateProfile(
  userId: string,
  data: { displayName: string; username: string; bio: string | null; avatarUrl: string | null },
) {
  await db
    .update(profiles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(profiles.id, userId))
}

export async function getPublicUser(userId: string): Promise<PublicUser | null> {
  const [row] = await db.select(publicUserColumns).from(profiles).where(eq(profiles.id, userId)).limit(1)
  return row ?? null
}

export async function getPublicUsers(ids: string[]): Promise<PublicUser[]> {
  if (ids.length === 0) return []
  return db.select(publicUserColumns).from(profiles).where(inArray(profiles.id, ids))
}

export async function listMembers(excludeUserId: string, limit = 30) {
  return db
    .select({ ...publicUserColumns, lastSeenAt: profiles.lastSeenAt })
    .from(profiles)
    .where(ne(profiles.id, excludeUserId))
    .orderBy(desc(profiles.lastSeenAt))
    .limit(limit)
}

export async function touchLastSeen(userId: string) {
  await db.update(profiles).set({ lastSeenAt: new Date() }).where(eq(profiles.id, userId))
}
