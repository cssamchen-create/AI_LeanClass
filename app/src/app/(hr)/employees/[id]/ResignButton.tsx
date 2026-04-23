'use client'

import { useState } from 'react'

export default function ResignButton({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const [open, setOpen] = useState(false)
  const [resignedAt, setResignedAt] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ totalCompensation: string; commitmentCompensations: Array<{ courseName: string; compensationAmount: string; note: string }> } | null>(null)

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/hr/employees/${employeeId}/resign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resignedAt }),
      })
      const json = await res.json() as { error?: string; totalCompensation?: string; commitmentCompensations?: Array<{ courseName: string; compensationAmount: string; note: string }> }
      if (!res.ok) {
        setError(json.error ?? '操作失敗')
      } else {
        setResult({ totalCompensation: json.totalCompensation!, commitmentCompensations: json.commitmentCompensations! })
      }
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800 font-medium">{employeeName} 已成功標記離職</p>
          {result.commitmentCompensations.length > 0 && (
            <div className="mt-2 space-y-1">
              {result.commitmentCompensations.map((c, i) => (
                <div key={i} className="text-sm text-gray-700">
                  {c.courseName}：{Number(c.compensationAmount).toLocaleString('zh-TW')} 元（{c.note}）
                </div>
              ))}
              <div className="text-sm font-semibold text-gray-900 mt-2 pt-2 border-t border-green-300">
                合計應賠償：{Number(result.totalCompensation).toLocaleString('zh-TW')} 元
              </div>
            </div>
          )}
        </div>
        <button onClick={() => window.location.reload()} className="text-sm text-blue-600 hover:underline">重新整理頁面</button>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700"
      >
        標記離職
      </button>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">離職日期</label>
        <input
          type="date"
          value={resignedAt}
          onChange={(e) => setResignedAt(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? '處理中...' : '確認標記離職'}
        </button>
        <button onClick={() => setOpen(false)} className="text-sm text-gray-600 hover:text-gray-900">取消</button>
      </div>
    </div>
  )
}
