'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createSessionSchema, type CreateSessionInput } from '@/lib/courses/validations'
import { useParams } from 'next/navigation'

export default function NewSessionPage() {
  const params = useParams<{ id: string }>()
  const courseId = params.id
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<CreateSessionInput>({
    resolver: zodResolver(createSessionSchema),
  })

  const onSubmit = async (data: CreateSessionInput) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/courses/${courseId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        window.location.href = `/courses/${courseId}`
      } else {
        const json = await res.json() as { error: string }
        setError(json.error ?? '建立失敗')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">新增梯次</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-lg shadow">
        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">開課日期 *</label>
            <input type="date" {...register('startDate')} className="w-full border rounded-lg px-3 py-2 text-sm" />
            {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">結課日期</label>
            <input type="date" {...register('endDate')} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">地點 *</label>
          <input {...register('location')} placeholder="例：台北總部 A101" className="w-full border rounded-lg px-3 py-2 text-sm" />
          {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">講師姓名 *</label>
          <input {...register('instructorName')} placeholder="例：王小明" className="w-full border rounded-lg px-3 py-2 text-sm" />
          {errors.instructorName && <p className="text-red-500 text-xs mt-1">{errors.instructorName.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">名額上限 *</label>
          <input
            type="number" min={1}
            {...register('capacity', { valueAsNumber: true })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          {errors.capacity && <p className="text-red-500 text-xs mt-1">{errors.capacity.message}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit" disabled={isSubmitting}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? '建立中...' : '建立梯次'}
          </button>
          <a href={`/courses/${courseId}`} className="px-6 py-2 text-sm text-gray-600 hover:text-gray-900">取消</a>
        </div>
      </form>
    </div>
  )
}
