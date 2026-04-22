'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CategoryForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countsTowardAnnualHours, setCountsTowardAnnualHours] = useState(true)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      countsTowardAnnualHours: formData.get('countsTowardAnnualHours') === 'on',
      defaultHours: formData.get('defaultHours')
        ? Number(formData.get('defaultHours'))
        : null,
    }

    try {
      const res = await fetch('/api/course-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        ;(e.target as HTMLFormElement).reset()
        setCountsTowardAnnualHours(true)
        router.refresh()
      } else {
        const json = await res.json() as { error: string }
        setError(json.error ?? '建立失敗')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">類別名稱 *</label>
        <input
          name="name" required
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="例：法治教育"
        />
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="countsTowardAnnualHours"
            checked={countsTowardAnnualHours}
            onChange={(e) => setCountsTowardAnnualHours(e.target.checked)}
          />
          <span>計入年度時數</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">預設時數（選填）</label>
        <input
          type="number" name="defaultHours" step="0.5" min="0"
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="例：12（年度特訓用）"
        />
      </div>

      <button
        type="submit" disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? '建立中...' : '建立類別'}
      </button>
    </form>
  )
}
