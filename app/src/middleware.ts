import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session
  const isHR = (session?.user as { role?: string })?.role === 'HR'

  const isHRRoute = nextUrl.pathname.startsWith('/courses') ||
    nextUrl.pathname.startsWith('/course-categories')
  const isApiHRRoute = nextUrl.pathname.startsWith('/api/courses') ||
    nextUrl.pathname.startsWith('/api/course-categories')

  if ((isHRRoute || isApiHRRoute) && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  if ((isHRRoute || isApiHRRoute) && isLoggedIn && !isHR) {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/courses/:path*', '/course-categories/:path*', '/api/courses/:path*', '/api/course-categories/:path*'],
}
