import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session
  const role = (session?.user as { role?: string })?.role
  const isHR = role === 'HR'
  const isManager = role === 'MANAGER' || role === 'HR'
  const isEmployee = !!role // any logged-in user

  // HR 路由（課程管理）
  const isHRRoute =
    nextUrl.pathname.startsWith('/courses') ||
    nextUrl.pathname.startsWith('/course-categories') ||
    nextUrl.pathname.startsWith('/employees')
  const isApiHRRoute =
    nextUrl.pathname.startsWith('/api/courses') ||
    nextUrl.pathname.startsWith('/api/course-categories') ||
    nextUrl.pathname.startsWith('/api/hr/')

  // 主管路由
  const isManagerRoute = nextUrl.pathname.startsWith('/manager')
  const isApiManagerRoute = nextUrl.pathname.startsWith('/api/manager/')

  // 員工路由（所有登入使用者可訪問）
  const isEmployeeRoute = nextUrl.pathname.startsWith('/employee')
  const isApiEnrollmentRoute =
    nextUrl.pathname.startsWith('/api/enrollments') ||
    nextUrl.pathname.startsWith('/api/waitlist/')

  if (!isLoggedIn && (isHRRoute || isManagerRoute || isEmployeeRoute || isApiHRRoute || isApiManagerRoute || isApiEnrollmentRoute)) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  if (isLoggedIn) {
    if ((isHRRoute || isApiHRRoute) && !isHR) {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }
    if ((isManagerRoute || isApiManagerRoute) && !isManager) {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }
    if ((isEmployeeRoute || isApiEnrollmentRoute) && !isEmployee) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/courses/:path*',
    '/course-categories/:path*',
    '/employees/:path*',
    '/manager/:path*',
    '/employee/:path*',
    '/api/courses/:path*',
    '/api/course-categories/:path*',
    '/api/enrollments/:path*',
    '/api/waitlist/:path*',
    '/api/manager/:path*',
    '/api/hr/:path*',
  ],
}
