'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Question {
  id: string
  type: 'MULTIPLE_CHOICE' | 'ESSAY'
  content: string
  points: number
  order: number
  options?: string[]
}

interface QuizData {
  quizId: string
  passingScore: number
  totalPoints: number
  attemptNumber: number
  questions: Question[]
}

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const [enrollmentId, setEnrollmentId] = useState<string>('')
  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => {
      setEnrollmentId(id)
      fetch(`/api/enrollments/${id}/quiz`)
        .then((r) => r.json())
        .then((data: QuizData) => {
          setQuiz(data)
          // Restore draft from localStorage
          const draft = localStorage.getItem(`quiz-draft-${id}`)
          if (draft) setAnswers(JSON.parse(draft))
        })
        .catch(() => setError('載入測驗失敗'))
    })
  }, [params])

  function setAnswer(questionId: string, value: string) {
    const next = { ...answers, [questionId]: value }
    setAnswers(next)
    localStorage.setItem(`quiz-draft-${enrollmentId}`, JSON.stringify(next))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!quiz) return
    setSubmitting(true)
    setError(null)

    const payload = quiz.questions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id] ?? '',
    }))

    const res = await fetch(`/api/enrollments/${enrollmentId}/quiz/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: payload }),
    })

    if (res.ok) {
      localStorage.removeItem(`quiz-draft-${enrollmentId}`)
      router.push('/employee/enrollments')
    } else {
      const data = await res.json()
      setError(data.error ?? '提交失敗')
      setSubmitting(false)
    }
  }

  if (error && !quiz) return <div className="p-8 text-red-600">{error}</div>
  if (!quiz) return <div className="p-8 text-gray-500">載入中...</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">課程測驗</h1>
        <p className="text-gray-600 mt-1">
          第 {quiz.attemptNumber} 次作答・總分 {quiz.totalPoints} 分・通過門檻 {quiz.passingScore}%
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {quiz.questions.map((q, idx) => (
          <div key={q.id} className="bg-white rounded-lg border p-6">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-medium text-gray-900">
                Q{idx + 1}. {q.content}
              </p>
              <span className="text-xs text-gray-500 ml-4 shrink-0">{q.points} 分</span>
            </div>

            {q.type === 'MULTIPLE_CHOICE' && q.options ? (
              <div className="space-y-2">
                {q.options.map((option, optIdx) => (
                  <label key={optIdx} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={String(optIdx)}
                      checked={answers[q.id] === String(optIdx)}
                      onChange={() => setAnswer(q.id, String(optIdx))}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                rows={4}
                value={answers[q.id] ?? ''}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                placeholder="請填寫您的答案..."
                className="w-full rounded-md border-gray-300 border p-3 text-sm"
              />
            )}
          </div>
        ))}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {submitting ? '提交中...' : '送出答案'}
          </button>
        </div>
      </form>
    </div>
  )
}
