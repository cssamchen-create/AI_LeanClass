import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function TrainingRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { year: yearParam } = await searchParams
  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear()
  const employeeId = session.user.id!

  const record = await prisma.employeeTrainingRecord.findUnique({
    where: { employeeId_year: { employeeId, year } },
  })

  const completions = await prisma.courseEnrollment.findMany({
    where: {
      employeeId,
      status: 'COMPLETED',
      session: { startDate: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } },
    },
    include: {
      session: {
        include: {
          course: { select: { name: true, measurementUnit: true, measurementValue: true } },
        },
      },
      quizAttempts: { orderBy: { attemptNumber: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">我的訓練紀錄</h1>
        <form method="GET">
          <select
            name="year"
            defaultValue={year}
            onChange={(e) => {
              const form = e.target.form
              if (form) form.submit()
            }}
            className="rounded-md border-gray-300 border py-1 px-3 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y} 年</option>
            ))}
          </select>
        </form>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{record ? Number(record.annualHours).toFixed(1) : '0.0'}</p>
          <p className="text-sm text-gray-500 mt-1">年度訓練時數（小時）</p>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{record ? Number(record.totalHours).toFixed(1) : '0.0'}</p>
          <p className="text-sm text-gray-500 mt-1">總計時數（含新人訓練）</p>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{record ? Number(record.totalCredits).toFixed(1) : '0.0'}</p>
          <p className="text-sm text-gray-500 mt-1">總計學分</p>
        </div>
      </div>

      {/* Completion list */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">已結案課程</h2>
        {completions.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg">
            {year} 年尚無已結案課程
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">課程名稱</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">開課日期</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">時數/學分</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">測驗成績</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">結案時間</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {completions.map((e) => {
                  const latestAttempt = e.quizAttempts[0]
                  return (
                    <tr key={e.id}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {e.session.course.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {e.session.startDate.toLocaleDateString('zh-TW')}
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-gray-700">
                        {e.session.course.measurementValue}{' '}
                        {e.session.course.measurementUnit === 'HOURS' ? '小時' : '學分'}
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        {latestAttempt ? (
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${latestAttempt.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {latestAttempt.totalScore} 分（{latestAttempt.passed ? '通過' : '未通過'}）
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">無測驗</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {e.updatedAt.toLocaleDateString('zh-TW')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
