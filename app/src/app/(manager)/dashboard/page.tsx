import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getManagerDashboard } from '@/lib/manager/service'

export default async function ManagerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const adAccount = (session.user as { id?: string })?.id
  if (!adAccount) redirect('/login')

  const employee = await prisma.employee.findUnique({ where: { adAccount } })
  if (!employee) redirect('/login')

  const { year: yearParam } = await searchParams
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

  const dashboard = await getManagerDashboard(employee.id, year)

  const prevYear = year - 1
  const nextYear = year + 1
  const currentYear = new Date().getFullYear()

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">管理者儀表板</h1>
        <div className="flex items-center gap-2 text-sm">
          <a href={`?year=${prevYear}`} className="px-2 py-1 rounded border hover:bg-gray-50">← {prevYear}</a>
          <span className="px-3 py-1 bg-blue-600 text-white rounded font-medium">{year} 年</span>
          {year < currentYear && (
            <a href={`?year=${nextYear}`} className="px-2 py-1 rounded border hover:bg-gray-50">{nextYear} →</a>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">直屬下屬</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{dashboard.totalSubordinates}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">已完訓</div>
          <div className="text-3xl font-bold text-green-600 mt-1">{dashboard.trainedCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">達標率</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">{dashboard.complianceRate}%</div>
        </div>
      </div>

      {/* Pending approvals */}
      {dashboard.pendingApprovals.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-yellow-800 mb-3">
            待主管審核申請（{dashboard.pendingApprovals.length} 筆）
          </h2>
          <div className="space-y-2">
            {dashboard.pendingApprovals.map((approval) => (
              <div key={approval.enrollmentId} className="flex items-center justify-between bg-white rounded p-3 border border-yellow-100">
                <div>
                  <span className="text-sm font-medium text-gray-900">{approval.employeeName}</span>
                  <span className="text-sm text-gray-500 ml-2">申請「{approval.courseName}」</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(approval.createdAt).toLocaleDateString('zh-TW')}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <a href="/manager/enrollments" className="text-sm text-yellow-700 hover:underline">
              前往審核 →
            </a>
          </div>
        </div>
      )}

      {/* Subordinate training status */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="font-semibold text-gray-900">下屬訓練狀況（{year} 年）</h2>
        </div>
        {dashboard.subordinates.length === 0 ? (
          <p className="text-center text-gray-400 py-12">目前無直屬下屬</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">部門</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">完訓狀態</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">申請課程數</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {dashboard.subordinates.map((sub) => (
                <tr key={sub.employee.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{sub.employee.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{sub.employee.department}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      sub.trained ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {sub.trained ? '已完訓' : '未完訓'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{sub.enrollments.length} 筆</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
