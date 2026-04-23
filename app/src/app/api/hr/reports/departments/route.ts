import { NextRequest, NextResponse } from 'next/server'
import { yearSchema } from '@/lib/reports/validations'
import { getDepartmentStats } from '@/lib/reports/service'

export async function GET(req: NextRequest) {
  const parsed = yearSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid year' }, { status: 400 })

  const departments = await getDepartmentStats(parsed.data.year)
  return NextResponse.json({ year: parsed.data.year, departments })
}
