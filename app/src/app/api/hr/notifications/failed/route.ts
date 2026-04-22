import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getFailedNotifications } from '@/lib/enrollments/notification-service'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const data = await getFailedNotifications()
  return NextResponse.json({ data, total: data.length })
}
