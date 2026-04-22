'use client'

import { useState } from 'react'
import type { CourseStatus } from '@/types'

const nextStatus: Partial<Record<CourseStatus, CourseStatus>> = {
  DRAFT: 'ACTIVE',
  ACTIVE: 'INACTIVE',
  INACTIVE: 'ACTIVE',
}
const buttonLabel: Partial<Record<CourseStatus, string>> = {
  DRAFT: '上架',
  ACTIVE: '下架',
  INACTIVE: '重新上架',
}
const buttonStyle: Partial<Record<CourseStatus, string>> = {
  DRAFT: 'bg-green-600 text-white hover:bg-green-700',
  ACTIVE: 'bg-red-100 text-red-700 hover:bg-red-200',
  INACTIVE: 'bg-green-100 text-green-700 hover:bg-green-200',
}

export default function CourseStatusButton({
  courseId,
  currentStatus,
}: {
  courseId: string
  currentStatus: CourseStatus
}) {
  const [status, setStatus] = useState<CourseStatus>(currentStatus)
  const [isLoading, setIsLoading] = useState(false)

  const target = nextStatus[status]
  if (!target) return null

  const handleClick = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: target }),
      })
      if (res.ok) setStatus(target)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`px-4 py-2 rounded-lg text-sm disabled:opacity-50 ${buttonStyle[status]}`}
    >
      {isLoading ? '處理中...' : buttonLabel[status]}
    </button>
  )
}
