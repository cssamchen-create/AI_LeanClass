import { getComplianceOverview } from '@/lib/reports/service'
import Link from 'next/link'

const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const params = await searchParams
  const year = Number(params.year) || currentYear
  const data = await getComplianceOverview(year)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">年度訓練達標率</h1>
          <p className="text-gray-500 text-sm mt-1">全公司年度訓練完成狀況總覽</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">年度：</span>
          <div className="flex gap-1">
            {yearOptions.map((y) => (
              <Link
                key={y}
                href={`/reports/compliance?year=${y}`}
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

      {data.totalActive === 0 ? (
        <div className="text-center py-16 text-gray-400">該年度尚無在職員工資料</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <div className="text-4xl font-bold text-blue-600">
                {data.complianceRate.toFixed(1)}%
              </div>
              <div className="text-gray-600 mt-2 text-sm">{year} 年度達標率</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <div className="text-4xl font-bold text-green-600">{data.trained}</div>
              <div className="text-gray-600 mt-2 text-sm">已完訓員工數</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <div className="text-4xl font-bold text-orange-500">{data.untrained}</div>
              <div className="text-gray-600 mt-2 text-sm">尚未完訓員工數</div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>已完訓 {data.trained} 人</span>
              <span>在職總人數 {data.totalActive} 人</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-500 h-4 rounded-full transition-all"
                style={{ width: `${Math.min(data.complianceRate, 100)}%` }}
              />
            </div>
          </div>
        </>
      )}

      <div className="mt-6">
        <Link href="/reports" className="text-sm text-blue-600 hover:underline">
          ← 返回報表中心
        </Link>
      </div>
    </div>
  )
}
