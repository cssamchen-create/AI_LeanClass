import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ResignButton from './ResignButton'

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      manager: { select: { id: true, name: true } },
      commitmentRecords: {
        where: { status: { in: ['ACTIVE', 'PENDING_SIGNATURE', 'COMPENSATION_NOTED'] } },
        include: { course: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!employee) notFound()

  const roleLabel: Record<string, string> = { EMPLOYEE: '員工', MANAGER: '主管', HR: 'HR' }
  const commitmentStatusLabel: Record<string, string> = {
    PENDING_SIGNATURE: '待簽署',
    ACTIVE: '生效中',
    COMPENSATION_NOTED: '已賠償',
  }
  const commitmentStatusColor: Record<string, string> = {
    PENDING_SIGNATURE: 'bg-yellow-100 text-yellow-800',
    ACTIVE: 'bg-green-100 text-green-800',
    COMPENSATION_NOTED: 'bg-purple-100 text-purple-800',
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/employees" className="text-sm text-blue-600 hover:underline">← 返回員工列表</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{employee.name}</h1>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">基本資訊</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-gray-500">Email</dt><dd className="mt-1">{employee.email}</dd></div>
          <div><dt className="text-gray-500">部門 / 單位</dt><dd className="mt-1">{employee.department} / {employee.unit}</dd></div>
          <div><dt className="text-gray-500">角色</dt><dd className="mt-1">{roleLabel[employee.role]}</dd></div>
          <div><dt className="text-gray-500">直屬主管</dt><dd className="mt-1">{employee.manager?.name ?? '—'}</dd></div>
          <div><dt className="text-gray-500">到職日</dt><dd className="mt-1">{new Date(employee.hireDate).toLocaleDateString('zh-TW')}</dd></div>
          <div>
            <dt className="text-gray-500">狀態</dt>
            <dd className="mt-1">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {employee.isActive ? '在職' : '離職'}
              </span>
            </dd>
          </div>
          {!employee.isActive && employee.resignedAt && (
            <div><dt className="text-gray-500">離職日</dt><dd className="mt-1">{new Date(employee.resignedAt).toLocaleDateString('zh-TW')}</dd></div>
          )}
        </dl>
      </div>

      {/* Commitment Records */}
      {employee.commitmentRecords.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">服務承諾書</h2>
          <div className="space-y-3">
            {employee.commitmentRecords.map((r) => (
              <div key={r.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{r.course.name}</div>
                  <div className="text-gray-500">
                    {r.commitmentMonths} 個月 ／ {Number(r.commitmentFee).toLocaleString('zh-TW')} 元
                    {r.commitmentExpiresAt && ` ／ 到期：${new Date(r.commitmentExpiresAt).toLocaleDateString('zh-TW')}`}
                  </div>
                  {r.compensationAmount && (
                    <div className="text-purple-700 text-xs mt-1">賠償：{Number(r.compensationAmount).toLocaleString('zh-TW')} 元 — {r.compensationNote}</div>
                  )}
                </div>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${commitmentStatusColor[r.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {commitmentStatusLabel[r.status] ?? r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resign Section */}
      {employee.isActive && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-2">離職處理</h2>
          {employee.commitmentRecords.some((r) => r.status === 'ACTIVE') && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 mb-4">
              此員工有 {employee.commitmentRecords.filter((r) => r.status === 'ACTIVE').length} 筆生效中的服務承諾書，標記離職後系統將自動計算應賠償金額。
            </p>
          )}
          <ResignButton employeeId={id} employeeName={employee.name} />
        </div>
      )}
    </div>
  )
}
