import { NextRequest, NextResponse } from 'next/server'
import { yearSchema, paginationSchema } from '@/lib/reports/validations'
import { getCourseStats } from '@/lib/reports/service'

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams)
  const yearParsed = yearSchema.safeParse(params)
  const pageParsed = paginationSchema.safeParse(params)
  if (!yearParsed.success || !pageParsed.success) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  const { year } = yearParsed.data
  const { page, pageSize } = pageParsed.data
  const data = await getCourseStats(year, page, pageSize)
  return NextResponse.json(data)
}
