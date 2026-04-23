import Link from 'next/link'

const reports = [
  {
    href: '/reports/compliance',
    title: '年度訓練達標率',
    description: '全公司年度訓練完成狀況，含達標率、已完訓與未完訓人數統計。',
    icon: '📊',
  },
  {
    href: '/reports/departments',
    title: '部門訓練統計',
    description: '各部門員工訓練完成率，快速識別訓練落後部門。',
    icon: '🏢',
  },
  {
    href: '/reports/employees',
    title: '員工訓練歷程',
    description: '搜尋特定員工，查看其完整訓練歷程與年度學分、時數累計。',
    icon: '👤',
  },
  {
    href: '/reports/courses',
    title: '課程完訓率分析',
    description: '各課程報名人數與完訓率，評估課程執行效果。',
    icon: '📚',
  },
]

export default function ReportsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">訓練報表中心</h1>
        <p className="text-gray-500 text-sm mt-1">查看各維度的員工訓練統計與分析報表</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {reports.map((report) => (
          <Link
            key={report.href}
            href={report.href}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-400 hover:shadow-sm transition-all group"
          >
            <div className="text-3xl mb-3">{report.icon}</div>
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 mb-2">
              {report.title}
            </h2>
            <p className="text-sm text-gray-500">{report.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
