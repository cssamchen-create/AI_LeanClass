import { notFound } from 'next/navigation'
import { getCourseById } from '@/lib/courses/service'
import EditCourseForm from './EditCourseForm'

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let course
  try {
    course = await getCourseById(id)
  } catch {
    notFound()
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">編輯課程</h1>
      <EditCourseForm course={course} />
    </div>
  )
}
