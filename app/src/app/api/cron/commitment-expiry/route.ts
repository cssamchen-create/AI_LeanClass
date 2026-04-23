import { NextRequest, NextResponse } from 'next/server'
import { processExpiredCommitments } from '@/lib/commitments/service'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '未授權' }, { status: 401 })
  }

  try {
    const result = await processExpiredCommitments()
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : '執行失敗'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
