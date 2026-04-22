import { prisma } from '@/lib/prisma'
import { resendNotificationAction } from '@/lib/enrollments/actions'

const EVENT_LABELS: Record<string, string> = {
  ENROLLMENT_SUBMITTED: '申請送出',
  MANAGER_REVIEW_NEEDED: '主管待審核',
  MANAGER_APPROVED: '主管核准',
  MANAGER_REJECTED: '主管退回',
  HR_APPROVED: 'HR 核准',
  HR_REJECTED: 'HR 退回',
  WAITLIST_JOINED: '加入等待名單',
  WAITLIST_PROMOTED: '等待名單遞補',
  WAITLIST_EXPIRED: '等待逾期',
  SESSION_CANCELLED: '梯次取消',
  ENROLLMENT_CANCELLED: '申請取消',
  NOTIFICATION_FAILED: '通知失敗摘要',
}

export default async function NotificationsPage() {
  const failedLogs = await prisma.notificationLog.findMany({
    where: { status: 'FAILED' },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">通知發送失敗清單</h1>
        <span className="text-sm text-gray-500">共 {failedLogs.length} 筆失敗記錄</span>
      </div>

      {failedLogs.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-lg">
          目前無發送失敗記錄
        </div>
      ) : (
        <div className="space-y-3">
          {failedLogs.map((log) => (
            <div key={log.id} className="bg-white border border-red-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                      {EVENT_LABELS[log.eventType] ?? log.eventType}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{log.subject}</span>
                  </div>
                  <div className="text-sm text-gray-600">收件人：{log.recipientEmail}</div>
                  <div className="text-xs text-gray-500">
                    重試次數：{log.retryCount}/3 ｜
                    最後嘗試：{log.lastAttemptAt ? new Date(log.lastAttemptAt).toLocaleString('zh-TW') : '—'}
                  </div>
                  {log.errorMessage && (
                    <div className="text-xs text-red-500 font-mono">{log.errorMessage}</div>
                  )}
                </div>
                <form action={resendNotificationAction.bind(null, log.id)} className="ml-4">
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg whitespace-nowrap"
                  >
                    手動補發
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
