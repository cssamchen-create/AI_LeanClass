import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import Link from 'next/link'

export default async function EmployeeCoursesPage() {
  const session = await auth()
  const employeeId = (session?.user as { id?: string })?.id

  const courses = await prisma.course.findMany({
    where: { status: 'ACTIVE' },
    include: {
      category: true,
      sessions: {
        where: { status: 'OPEN' },
        orderBy: { startDate: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Get my enrollments and waitlist entries to show status
  const myEnrollments = employeeId
    ? await prisma.courseEnrollment.findMany({
        where: { employeeId, status: { notIn: ['REJECTED', 'CANCELLED'] } },
        select: { sessionId: true, status: true },
      })
    : []

  const myWaitlist = employeeId
    ? await prisma.waitlistEntry.findMany({
        where: { employeeId, status: { notIn: ['EXPIRED', 'CANCELLED'] } },
        select: { sessionId: true, status: true, position: true },
      })
    : []

  const enrollmentMap = new Map(myEnrollments.map((e) => [e.sessionId, e.status]))
  const waitlistMap = new Map(myWaitlist.map((w) => [w.sessionId, w]))

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">課程瀏覽</h1>

      <div className="space-y-6">
        {courses.map((course) => (
          <div key={course.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{course.name}</h2>
                <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded mt-1">
                  {course.category.name}
                </span>
              </div>
              <span className="text-sm text-gray-500">
                {course.measurementValue} {course.measurementUnit === 'HOURS' ? '小時' : '學分'}
              </span>
            </div>

            {course.sessions.length === 0 ? (
              <p className="text-sm text-gray-400">目前無開放梯次</p>
            ) : (
              <div className="space-y-3">
                {course.sessions.map((session) => {
                  const enrollStatus = enrollmentMap.get(session.id)
                  const waitlistInfo = waitlistMap.get(session.id)
                  const available = session.capacity - session.enrolledCount

                  return (
                    <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-900 font-medium">
                            {new Date(session.startDate).toLocaleDateString('zh-TW')}
                          </div>
                          <div className="text-sm text-gray-600">
                            地點：{session.location} ｜ 講師：{session.instructorName}
                          </div>
                          <div className="text-sm text-gray-600">
                            名額：{session.enrolledCount}/{session.capacity}
                            {available > 0 ? (
                              <span className="ml-2 text-green-600">（剩餘 {available} 名）</span>
                            ) : (
                              <span className="ml-2 text-red-600">（名額已滿）</span>
                            )}
                          </div>
                        </div>

                        <div className="ml-4">
                          {enrollStatus ? (
                            <span className="inline-flex px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                              {({
                                PENDING_MANAGER: '待主管審核',
                                PENDING_HR: '待 HR 核准',
                                CONFIRMED: '已確認',
                                REJECTED: '已退回',
                                CANCELLED: '已取消',
                              } as Record<string, string>)[enrollStatus] ?? enrollStatus}
                            </span>
                          ) : waitlistInfo ? (
                            <span className="inline-flex px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                              等待中（第 {waitlistInfo.position} 位）
                            </span>
                          ) : (
                            <Link
                              href={`/employee/courses/${course.id}/sessions/${session.id}/enroll`}
                              className="inline-flex px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                            >
                              {available > 0 ? '申請報名' : '加入等待'}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}

        {courses.length === 0 && (
          <div className="text-center py-12 text-gray-400">目前沒有開放的課程</div>
        )}
      </div>
    </div>
  )
}
