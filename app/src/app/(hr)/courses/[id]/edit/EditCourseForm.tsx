'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateCourseSchema, type UpdateCourseInput } from '@/lib/courses/validations'
import type { CourseCategory, CourseWithDetails } from '@/types'

export default function EditCourseForm({ course }: { course: CourseWithDetails }) {
  const [categories, setCategories] = useState<CourseCategory[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<UpdateCourseInput>({
    resolver: zodResolver(updateCourseSchema),
    defaultValues: {
      name: course.name,
      categoryId: course.categoryId,
      measurementUnit: course.measurementUnit,
      measurementValue: course.measurementValue,
      requiresReflection: course.requiresReflection,
      isGroupCourse: course.isGroupCourse,
      requiresCommitment: course.requiresCommitment,
      commitmentMonths: course.commitmentMonths ?? undefined,
      commitmentFee: course.commitmentFee ? Number(course.commitmentFee) : undefined,
    },
  })

  const requiresCommitment = watch('requiresCommitment')

  useEffect(() => {
    fetch('/api/course-categories')
      .then((r) => r.json() as Promise<CourseCategory[]>)
      .then(setCategories)
      .catch(console.error)
  }, [])

  const onSubmit = async (data: UpdateCourseInput) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        window.location.href = `/courses/${course.id}`
      } else {
        const json = await res.json() as { error: string }
        setError(json.error ?? '更新失敗')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-lg shadow">
      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">課程名稱</label>
        <input {...register('name')} className="w-full border rounded-lg px-3 py-2 text-sm" />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">課程類別</label>
        <select {...register('categoryId')} className="w-full border rounded-lg px-3 py-2 text-sm">
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">計量單位</label>
          <select {...register('measurementUnit')} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="HOURS">時數</option>
            <option value="CREDIT">學分</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">數值</label>
          <input
            type="number" step="0.5"
            {...register('measurementValue', { valueAsNumber: true })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('requiresReflection')} />
          <span>心得必填</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('isGroupCourse')} />
          <span>集團內課程</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('requiresCommitment')} />
          <span>此課程需服務承諾書</span>
        </label>
      </div>

      {requiresCommitment && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-4">
          <p className="text-sm font-medium text-amber-800">服務承諾條款</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">留任年限（月）</label>
              <input
                type="number" min="1" max="120"
                {...register('commitmentMonths', { valueAsNumber: true })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="例如 24"
              />
              {errors.commitmentMonths && (
                <p className="text-red-500 text-xs mt-1">{errors.commitmentMonths.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">課程費用（元）</label>
              <input
                type="number" min="0"
                {...register('commitmentFee', { valueAsNumber: true })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="例如 30000"
              />
              {errors.commitmentFee && (
                <p className="text-red-500 text-xs mt-1">{errors.commitmentFee.message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit" disabled={isSubmitting}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? '儲存中...' : '儲存變更'}
        </button>
        <a href={`/courses/${course.id}`} className="px-6 py-2 text-sm text-gray-600 hover:text-gray-900">取消</a>
      </div>
    </form>
  )
}
