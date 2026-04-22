import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HRLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session) redirect('/login')
  if ((session.user as { role?: string })?.role !== 'HR') redirect('/unauthorized')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-6">
              <span className="text-lg font-semibold text-gray-900">教育訓練系統</span>
              <Link href="/courses" className="text-gray-600 hover:text-gray-900 text-sm">
                課程管理
              </Link>
              <Link href="/course-categories" className="text-gray-600 hover:text-gray-900 text-sm">
                課程類別
              </Link>
              <Link href="/employees" className="text-gray-600 hover:text-gray-900 text-sm">
                員工管理
              </Link>
              <Link href="/enrollments" className="text-gray-600 hover:text-gray-900 text-sm">
                報名審核
              </Link>
              <Link href="/notifications" className="text-gray-600 hover:text-gray-900 text-sm">
                通知管理
              </Link>
            </div>
            <div className="text-sm text-gray-500">
              {session.user?.name} (HR)
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
