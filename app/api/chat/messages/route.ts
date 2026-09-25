import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { GLOBAL_CONVERSATION, directConversationId, listMessages } from '@/lib/chat/queries'
import { touchLastSeen } from '@/lib/users/profiles'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const withUser = request.nextUrl.searchParams.get('com')
  const conversationId = withUser ? directConversationId(user.id, withUser) : GLOBAL_CONVERSATION

  const [messages] = await Promise.all([listMessages(conversationId), touchLastSeen(user.id)])
  return NextResponse.json({ messages }, { headers: { 'Cache-Control': 'no-store' } })
}
