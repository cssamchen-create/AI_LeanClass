import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createQuizAction, updateQuizAction } from '@/lib/completions/actions'

export default async function QuizManagementPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = (session.user as { role?: string }).role
  if (role !== 'HR') redirect('/unauthorized')

  const { id: courseId } = await params

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { quiz: { include: { questions: { orderBy: { order: 'asc' } } } } },
  })
  if (!course) redirect('/courses')

  const quiz = course.quiz

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <a href={`/courses/${courseId}`} className="text-sm text-blue-600 hover:underline">← 返回課程</a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">測驗題庫管理</h1>
        <p className="text-gray-600">{course.name}</p>
      </div>

      {quiz ? (
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">現有測驗設定</h2>
            <span className="text-sm text-gray-500">通過門檻：{quiz.passingScore}%</span>
          </div>
          <ul className="divide-y">
            {quiz.questions.map((q, idx) => (
              <li key={q.id} className="py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Q{idx + 1}. {q.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {q.type === 'MULTIPLE_CHOICE' ? '選擇題' : '簡答題'}・{q.points} 分
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400">
            ※ 已有員工作答記錄後，題目內容將無法修改
          </p>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          尚未設定測驗，請使用下方表單建立。
        </div>
      )}

      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-base font-semibold mb-4">{quiz ? '更新測驗（整體替換）' : '建立測驗'}</h2>
        <p className="text-sm text-gray-500 mb-4">
          請提供 JSON 格式的測驗設定（passingScore + questions 陣列）
        </p>
        <form
          action={async (formData: FormData) => {
            'use server'
            const raw = formData.get('quizJson') as string
            const data = JSON.parse(raw)
            if (quiz) {
              await updateQuizAction(quiz.id, data)
            } else {
              await createQuizAction(courseId, data)
            }
            redirect(`/hr/courses/${courseId}/quiz`)
          }}
        >
          <textarea
            name="quizJson"
            rows={15}
            placeholder={JSON.stringify({
              passingScore: 60,
              questions: [
                { type: 'MULTIPLE_CHOICE', content: '題目', points: 10, order: 1, options: [{ text: '選項A', isCorrect: false }, { text: '選項B', isCorrect: true }] },
                { type: 'ESSAY', content: '簡答題', points: 20, order: 2 },
              ],
            }, null, 2)}
            className="w-full rounded-md border border-gray-300 p-3 text-sm font-mono"
            required
          />
          <div className="flex justify-end mt-3">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              {quiz ? '更新測驗' : '建立測驗'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
