import { getDepartmentStats } from '@/lib/reports/service'
import Link from 'next/link'

const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const params = await searchParams
  const year = Number(params.year) || currentYear
  const departments = await getDepartmentStats(year)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">部門訓練統計</h1>
          <p className="text-gray-500 text-sm mt-1">各部門年度訓練完成狀況</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">年度：</span>
          <div className="flex gap-1">
            {yearOptions.map((y) => (
              <Link
                key={y}
                href={`/reports/departments?year=${y}`}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  y === year
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {y}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {departments.length === 0 ? (
        <div className="text-center py-16 text-gray-400">該年度尚無部門訓練資料</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">部門</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">員工人數</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">已完訓</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">未完訓</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">達標率</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {departments.map((dept) => (
                <tr key={dept.department} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{dept.department}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{dept.totalEmployees}</td>
                  <td className="px-4 py-3 text-right text-green-600">{dept.trained}</td>
                  <td className="px-4 py-3 text-right text-orange-500">{dept.untrained}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-semibold ${
                        dept.complianceRate >= 80
                          ? 'text-green-600'
                          : dept.complianceRate >= 60
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {dept.complianceRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-24">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${Math.min(dept.complianceRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6">
        <Link href="/reports" className="text-sm text-blue-600 hover:underline">
          ← 返回報表中心
        </Link>
      </div>
    </div>
  )
}
