'use client'

import { useState } from 'react'

export default function CancelSessionButton({
  courseId,
  sessionId,
}: {
  courseId: string
  sessionId: string
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [cancelled, setCancelled] = useState(false)

  const handleCancel = async () => {
    if (!confirm('確定要取消此梯次？所有報名申請將自動退回。')) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/sessions/${sessionId}/cancel`, {
        method: 'PATCH',
      })
      if (res.ok) setCancelled(true)
    } finally {
      setIsLoading(false)
    }
  }

  if (cancelled) return <span className="text-xs text-gray-400">已取消</span>

  return (
    <button
      onClick={handleCancel}
      disabled={isLoading}
      className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50"
    >
      {isLoading ? '處理中...' : '取消梯次'}
    </button>
  )
}
