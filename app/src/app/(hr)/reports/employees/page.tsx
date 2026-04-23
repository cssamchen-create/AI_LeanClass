'use client'

import { useState } from 'react'
import Link from 'next/link'

type Employee = { id: string; name: string; department: string }
type Enrollment = {
  courseId: string
  courseName: string
  sessionStartDate: string
  year: number
  measurementUnit: string
  measurementValue: number
  status: string
}
type YearSummary = { year: number; totalHours: string; totalCredits: string }
type SearchResult = { mode: 'search'; employees: Employee[]; total: number; limitReached: boolean }
type HistoryResult = {
  mode: 'history'
  employee: Employee
  enrollments: Enrollment[]
  yearSummaries: YearSummary[]
}

export default function EmployeesPage() {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [history, setHistory] = useState<HistoryResult | null>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!search.trim()) return
    setLoading(true)
    setHistory(null)
    const res = await fetch(`/api/hr/reports/employees?search=${encodeURIComponent(search)}`)
    const data = await res.json()
    setSearchResult(data)
    setLoading(false)
  }

  async function handleSelectEmployee(id: string) {
    setLoading(true)
    const res = await fetch(`/api/hr/reports/employees?employeeId=${id}`)
    const data = await res.json()
    setHistory(data)
    setSearchResult(null)
    setLoading(false)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">員工訓練歷程查詢</h1>
        <p className="text-gray-500 text-sm mt-1">搜尋員工以查看其完整訓練歷程</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="輸入員工姓名關鍵字..."
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '搜尋中...' : '搜尋'}
        </button>
        {history && (
          <button
            type="button"
            onClick={() => { setHistory(null); setSearch('') }}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50"
          >
            清除
          </button>
        )}
      </form>

      {searchResult && !history && (
        <div className="bg-white rounded-lg border border-gray-200">
          {searchResult.limitReached && (
            <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200 text-yellow-700 text-sm">
              搜尋結果已達 50 筆上限，請縮小搜尋範圍。
            </div>
          )}
          {searchResult.employees.length === 0 ? (
            <div className="text-center py-12 text-gray-400">查無符合的員工</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {searchResult.employees.map((emp) => (
                <li key={emp.id}>
                  <button
                    onClick={() => handleSelectEmployee(emp.id)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium text-gray-900">{emp.name}</span>
                      <span className="ml-2 text-sm text-gray-500">{emp.department}</span>
                    </div>
                    <span className="text-sm text-blue-600">查看歷程 →</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {history && (
        <div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="font-semibold text-gray-900 text-lg">{history.employee.name}</div>
            <div className="text-sm text-gray-500">{history.employee.department}</div>

            {history.yearSummaries.length > 0 && (
              <div className="mt-3 flex gap-4 flex-wrap">
                {history.yearSummaries.map((s) => (
                  <div key={s.year} className="text-sm bg-blue-50 rounded px-3 py-1">
                    <span className="font-medium text-blue-700">{s.year} 年</span>
                    <span className="ml-2 text-blue-600">
                      {Number(s.totalHours) > 0 && `${s.totalHours} 時`}
                      {Number(s.totalCredits) > 0 && ` ${s.totalCredits} 學分`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {history.enrollments.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-lg border border-gray-200">
              尚無訓練紀錄
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-700">課程名稱</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-700">年度</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-700">學分 / 時數</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-700">狀態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.enrollments.map((e, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{e.courseName}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{e.year}</td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {e.measurementValue} {e.measurementUnit === 'CREDIT' ? '學分' : '時'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-block bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">
                          已完訓
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <Link href="/reports" className="text-sm text-blue-600 hover:underline">
          ← 返回報表中心
        </Link>
      </div>
    </div>
  )
}
