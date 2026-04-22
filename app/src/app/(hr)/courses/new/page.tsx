'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createCourseSchema, type CreateCourseInput } from '@/lib/courses/validations'
import type { CourseCategory } from '@/types'

export default function NewCoursePage() {
  const [categories, setCategories] = useState<CourseCategory[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateCourseInput>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      measurementUnit: 'HOURS',
      requiresReflection: true,
      isGroupCourse: false,
    },
  })

  const selectedCategoryId = watch('categoryId')

  useEffect(() => {
    fetch('/api/course-categories')
      .then((r) => r.json() as Promise<CourseCategory[]>)
      .then(setCategories)
      .catch(console.error)
  }, [])

  useEffect(() => {
    const cat = categories.find((c) => c.id === selectedCategoryId)
    if (cat?.defaultHours) {
      setValue('measurementValue', cat.defaultHours)
    }
  }, [selectedCategoryId, categories, setValue])

  const onSubmit = async (data: CreateCourseInput) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const course = await res.json() as { id: string }
        window.location.href = `/courses/${course.id}`
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">建立新課程</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-lg shadow">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">課程名稱 *</label>
          <input {...register('name')} className="w-full border rounded-lg px-3 py-2 text-sm" />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">課程類別 *</label>
          <select {...register('categoryId')} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">請選擇類別</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">計量單位 *</label>
            <select {...register('measurementUnit')} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="HOURS">時數</option>
              <option value="CREDIT">學分</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">數值 *</label>
            <input
              type="number"
              step="0.5"
              {...register('measurementValue', { valueAsNumber: true })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            {errors.measurementValue && <p className="text-red-500 text-xs mt-1">{errors.measurementValue.message}</p>}
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('requiresReflection')} />
            <span>心得必填</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('isGroupCourse')} />
            <span>集團內課程（結案僅需出席確認）</span>
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? '建立中...' : '建立課程'}
          </button>
          <a href="/courses" className="px-6 py-2 text-sm text-gray-600 hover:text-gray-900">取消</a>
        </div>
      </form>
    </div>
  )
}
