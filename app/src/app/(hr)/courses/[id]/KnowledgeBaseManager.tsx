'use client'

import { useState } from 'react'

type Resource = {
  id: string
  courseId: string
  title: string
  type: string
  content: string
  order: number
}

type Props = {
  courseId: string
  initialResources: Resource[]
}

export default function KnowledgeBaseManager({ courseId, initialResources }: Props) {
  const [resources, setResources] = useState<Resource[]>(initialResources)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'LINK' | 'TEXT'>('LINK')
  const [content, setContent] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd() {
    setError('')
    if (!title.trim() || !content.trim()) {
      setError('標題與內容為必填')
      return
    }
    setIsAdding(true)
    try {
      const res = await fetch(`/api/hr/courses/${courseId}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), type, content: content.trim(), order: resources.length }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? '新增失敗')
        return
      }
      const newResource = await res.json()
      setResources((prev) => [...prev, newResource])
      setTitle('')
      setContent('')
    } finally {
      setIsAdding(false)
    }
  }

  async function handleDelete(resourceId: string) {
    const res = await fetch(`/api/hr/courses/${courseId}/resources/${resourceId}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setResources((prev) => prev.filter((r) => r.id !== resourceId))
    }
  }

  return (
    <div className="bg-white rounded-lg shadow mt-6">
      <div className="p-6 border-b">
        <h2 className="font-semibold text-gray-900">知識庫資源</h2>
      </div>

      {/* Resource list */}
      {resources.length === 0 ? (
        <p className="text-center text-gray-400 py-6 text-sm">尚無資源，請新增</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {resources.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-6 py-3">
              <div>
                <span className={`inline-flex px-1.5 py-0.5 text-xs rounded mr-2 ${
                  r.type === 'LINK' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {r.type === 'LINK' ? '連結' : '說明'}
                </span>
                <span className="text-sm font-medium text-gray-900">{r.title}</span>
                {r.type === 'LINK' && (
                  <a href={r.content} target="_blank" rel="noreferrer" className="ml-2 text-xs text-blue-500 hover:underline truncate max-w-xs inline-block align-middle">
                    {r.content}
                  </a>
                )}
                {r.type === 'TEXT' && (
                  <span className="ml-2 text-xs text-gray-400">{r.content.slice(0, 60)}{r.content.length > 60 ? '…' : ''}</span>
                )}
              </div>
              <button
                onClick={() => handleDelete(r.id)}
                className="text-xs text-red-500 hover:text-red-700 ml-4"
              >
                刪除
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add form */}
      <div className="p-6 border-t bg-gray-50 space-y-3">
        <h3 className="text-sm font-medium text-gray-700">新增資源</h3>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="標題"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm flex-1"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'LINK' | 'TEXT')}
            className="border rounded px-2 py-1.5 text-sm"
          >
            <option value="LINK">連結</option>
            <option value="TEXT">說明</option>
          </select>
        </div>
        {type === 'LINK' ? (
          <input
            type="url"
            placeholder="https://..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm w-full"
          />
        ) : (
          <textarea
            placeholder="說明文字"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="border rounded px-3 py-1.5 text-sm w-full"
          />
        )}
        <button
          onClick={handleAdd}
          disabled={isAdding}
          className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {isAdding ? '新增中…' : '新增'}
        </button>
      </div>
    </div>
  )
}
