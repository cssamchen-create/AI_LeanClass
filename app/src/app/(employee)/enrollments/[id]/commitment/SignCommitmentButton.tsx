'use client'

import { useState } from 'react'

export default function SignCommitmentButton({ enrollmentId }: { enrollmentId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSign = async () => {
    if (!confirm('確認簽署服務承諾書？簽署後將正式確認報名。')) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}/commitment/sign`, { method: 'POST' })
      if (res.ok) {
        window.location.href = '/enrollments'
      } else {
        const json = await res.json() as { error: string }
        setError(json.error ?? '簽署失敗')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      <button
        onClick={handleSign}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 w-full"
      >
        {loading ? '簽署中...' : '確認簽署服務承諾書'}
      </button>
    </div>
  )
}
