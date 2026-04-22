import { prisma } from '@/lib/prisma'
import CategoryForm from './CategoryForm'

export default async function CourseCategoriesPage() {
  const categories = await prisma.courseCategory.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { courses: true } } },
  })

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">課程類別管理</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 類別列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-gray-900">現有類別</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {categories.map((cat) => (
              <li key={cat.id} className="px-6 py-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">{cat.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {cat.countsTowardAnnualHours ? '計入年度時數' : '不計入年度時數'}
                    {cat.defaultHours ? `・預設 ${cat.defaultHours} 小時` : ''}
                    ・{(cat._count as { courses: number }).courses} 門課程
                  </p>
                </div>
              </li>
            ))}
            {categories.length === 0 && (
              <li className="px-6 py-8 text-center text-sm text-gray-500">尚無類別</li>
            )}
          </ul>
        </div>

        {/* 新增類別表單 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">新增類別</h2>
          <CategoryForm />
        </div>
      </div>
    </div>
  )
}
