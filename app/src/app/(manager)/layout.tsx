import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const role = (session.user as { role?: string })?.role
  if (role !== 'MANAGER' && role !== 'HR') redirect('/unauthorized')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-6">
              <span className="text-lg font-semibold text-gray-900">教育訓練系統</span>
              <Link href="/manager/dashboard" className="text-gray-600 hover:text-gray-900 text-sm">
                儀表板
              </Link>
              <Link href="/manager/enrollments" className="text-gray-600 hover:text-gray-900 text-sm">
                待審核申請
              </Link>
            </div>
            <div className="text-sm text-gray-500">{session.user?.name}（主管）</div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
