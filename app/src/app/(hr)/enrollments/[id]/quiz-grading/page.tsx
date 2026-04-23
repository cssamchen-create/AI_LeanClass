import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { gradeEssayAction, allowRetryAction } from '@/lib/completions/actions'

export default async function QuizGradingPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = (session.user as { role?: string }).role
  if (role !== 'HR') redirect('/unauthorized')

  const { id: enrollmentId } = await params

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      employee: { select: { name: true, department: true } },
      session: { include: { course: { select: { name: true } } } },
      quizAttempts: {
        orderBy: { attemptNumber: 'desc' },
        take: 1,
        include: {
          answers: {
            include: { question: true },
            orderBy: { question: { order: 'asc' } },
          },
        },
      },
    },
  })

  if (!enrollment) redirect('/hr/enrollments')
  const latestAttempt = enrollment.quizAttempts[0]
  if (!latestAttempt) redirect('/hr/enrollments')

  const essayAnswers = latestAttempt.answers.filter((a) => a.question.type === 'ESSAY')
  const totalGraded = latestAttempt.answers.filter((a) => a.score !== null).length
  const totalQuestions = latestAttempt.answers.length
  const autoScore = latestAttempt.answers
    .filter((a) => a.question.type === 'MULTIPLE_CHOICE' && a.score !== null)
    .reduce((sum, a) => sum + (a.score ?? 0), 0)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">簡答題評分</h1>
        <p className="text-gray-600 mt-1">
          {enrollment.session.course.name}・{enrollment.employee.name}・第 {latestAttempt.attemptNumber} 次作答
        </p>
        <p className="text-sm text-gray-500 mt-1">
          選擇題得分：{autoScore} 分 ｜ 評分進度：{totalGraded}/{totalQuestions}
        </p>
      </div>

      <form
        action={async (formData: FormData) => {
          'use server'
          const grades = essayAnswers.map((a) => ({
            questionId: a.questionId,
            score: parseInt(formData.get(`score-${a.id}`) as string) || 0,
            graderNote: (formData.get(`note-${a.id}`) as string) || undefined,
          }))
          await gradeEssayAction(latestAttempt.id, { grades })
          redirect('/hr/enrollments')
        }}
      >
        <div className="space-y-4">
          {essayAnswers.map((answer) => (
            <div key={answer.id} className="bg-white rounded-lg border p-6 space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Q{answer.question.order}. {answer.question.content}
                </p>
                <p className="text-xs text-gray-500">配分：{answer.question.points} 分</p>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs font-medium text-gray-500 mb-1">員工答案：</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{answer.answer}</p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">得分（0-{answer.question.points}）：</span>
                  <input
                    type="number"
                    name={`score-${answer.id}`}
                    min={0}
                    max={answer.question.points}
                    defaultValue={answer.score ?? ''}
                    required
                    className="w-20 rounded-md border-gray-300 border p-1 text-sm"
                  />
                </label>
                <input
                  type="text"
                  name={`note-${answer.id}`}
                  placeholder="評分備注（選填）"
                  defaultValue={answer.graderNote ?? ''}
                  className="flex-1 rounded-md border-gray-300 border p-1 text-sm"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-4">
          <form
            action={async () => {
              'use server'
              await allowRetryAction(enrollmentId)
              redirect('/hr/enrollments')
            }}
          >
            <button type="submit" className="px-4 py-2 text-sm text-orange-600 border border-orange-300 hover:bg-orange-50 rounded-lg">
              允許重考
            </button>
          </form>
          <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
            送出評分
          </button>
        </div>
      </form>
    </div>
  )
}
