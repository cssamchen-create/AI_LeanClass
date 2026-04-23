import { NextRequest, NextResponse } from 'next/server'
import { employeeSearchSchema } from '@/lib/reports/validations'
import { searchEmployees, getEmployeeTrainingHistory } from '@/lib/reports/service'

export async function GET(req: NextRequest) {
  const parsed = employeeSearchSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 })

  const { search, employeeId } = parsed.data

  if (employeeId) {
    try {
      const data = await getEmployeeTrainingHistory(employeeId)
      return NextResponse.json({ mode: 'history', ...data })
    } catch {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }
  }

  if (search) {
    const data = await searchEmployees(search)
    return NextResponse.json({ mode: 'search', ...data })
  }

  return NextResponse.json({ mode: 'search', employees: [], total: 0, limitReached: false })
}
