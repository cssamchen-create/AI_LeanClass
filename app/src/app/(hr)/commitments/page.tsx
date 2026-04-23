import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

const STATUS_LABELS: Record<string, string> = {
  PENDING_SIGNATURE: '待簽署',
  ACTIVE: '生效中',
  EXPIRED: '已到期',
  VOIDED: '已廢止',
  COMPENSATION_NOTED: '已賠償',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING_SIGNATURE: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-gray-100 text-gray-700',
  VOIDED: 'bg-red-100 text-red-700',
  COMPENSATION_NOTED: 'bg-purple-100 text-purple-800',
}

const TABS = [
  { key: '', label: '全部' },
  { key: 'ACTIVE', label: '生效中' },
  { key: 'PENDING_SIGNATURE', label: '待簽署' },
  { key: 'expiring30', label: '即將到期' },
  { key: 'EXPIRED', label: '已到期' },
]

export default async function HRCommitmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { tab = '', page: pageStr = '1' } = await searchParams
  const page = Math.max(1, Number(pageStr))
  const pageSize = 20
  const now = new Date()

  const isExpiringTab = tab === 'expiring30'
  const statusFilter = !tab || isExpiringTab ? undefined : (tab as never)
  const expiringFilter = isExpiringTab
    ? { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) }
    : undefined

  const where = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(expiringFilter ? { commitmentExpiresAt: expiringFilter } : {}),
    ...(isExpiringTab ? { status: 'ACTIVE' as never } : {}),
  }

  const [records, total] = await Promise.all([
    prisma.commitmentRecord.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, department: true, unit: true } },
        course: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.commitmentRecord.count({ where }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">服務承諾管理</h1>
        <span className="text-sm text-gray-500">共 {total} 筆</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/commitments?tab=${t.key}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      {records.length === 0 ? (
        <div className="text-center py-12 text-gray-400">無符合條件的承諾書記錄</div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">員工</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">課程</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">年限／費用</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">簽署日</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">到期日</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {records.map((r) => {
                  const daysLeft = r.commitmentExpiresAt
                    ? Math.ceil((r.commitmentExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    : null
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900">{r.employee.name}</div>
                        <div className="text-gray-500 text-xs">{r.employee.department} · {r.employee.unit}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{r.course.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {r.commitmentMonths} 月 ／ {Number(r.commitmentFee).toLocaleString('zh-TW')} 元
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {r.signedAt ? new Date(r.signedAt).toLocaleDateString('zh-TW') : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {r.commitmentExpiresAt ? (
                          <div>
                            <div className="text-gray-900">{new Date(r.commitmentExpiresAt).toLocaleDateString('zh-TW')}</div>
                            {daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 && (
                              <div className="text-orange-600 text-xs">剩 {daysLeft} 天</div>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/commitments/${r.id}`} className="text-sm text-blue-600 hover:underline">
                          詳情
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/commitments?tab=${tab}&page=${p}`}
                  className={`px-3 py-1 text-sm rounded ${
                    p === page ? 'bg-blue-600 text-white' : 'bg-white border text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
