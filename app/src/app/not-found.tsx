import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">找不到頁面</h2>
        <p className="text-gray-500 text-sm mb-4">您所請求的資源不存在</p>
        <Link href="/courses" className="text-blue-600 hover:underline text-sm">
          返回課程列表
        </Link>
      </div>
    </div>
  )
}
