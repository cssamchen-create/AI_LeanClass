import { NextRequest, NextResponse } from 'next/server'
import { retryFailedNotifications } from '@/lib/enrollments/notification-service'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '未授權' }, { status: 401 })
  }

  const result = await retryFailedNotifications()
  return NextResponse.json(result)
}
