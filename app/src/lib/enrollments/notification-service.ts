import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'
import type { NotificationEventType } from '@prisma/client'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export interface NotificationPayload {
  recipientId: string
  recipientEmail: string
  eventType: NotificationEventType
  subject: string
  body: string
  enrollmentId?: string
  sessionId?: string
}

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  const log = await prisma.notificationLog.create({
    data: {
      recipientEmail: payload.recipientEmail,
      recipientId: payload.recipientId,
      eventType: payload.eventType,
      subject: payload.subject,
      body: payload.body,
      enrollmentId: payload.enrollmentId,
      sessionId: payload.sessionId,
      status: 'PENDING',
    },
  })

  await attemptSend(log.id, payload.recipientEmail, payload.subject, payload.body)
}

async function attemptSend(
  logId: string,
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  try {
    await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, text })
    await prisma.notificationLog.update({
      where: { id: logId },
      data: { status: 'SENT', sentAt: new Date(), lastAttemptAt: new Date() },
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    await prisma.notificationLog.update({
      where: { id: logId },
      data: { status: 'FAILED', errorMessage, lastAttemptAt: new Date() },
    })
  }
}

export async function retryFailedNotifications(): Promise<{ retried: number; succeeded: number; failed: number }> {
  const failedLogs = await prisma.notificationLog.findMany({
    where: { status: 'FAILED', retryCount: { lt: 3 } },
  })

  let succeeded = 0
  let failed = 0

  for (const log of failedLogs) {
    const retryCount = log.retryCount + 1
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: 'RETRYING', retryCount, lastAttemptAt: new Date() },
    })

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: log.recipientEmail,
        subject: log.subject,
        text: log.body,
      })
      await prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: 'SENT', sentAt: new Date() },
      })
      succeeded++
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      await prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', errorMessage },
      })
      failed++
    }
  }

  return { retried: failedLogs.length, succeeded, failed }
}

export async function getFailedNotifications() {
  return prisma.notificationLog.findMany({
    where: { status: 'FAILED' },
    orderBy: { createdAt: 'desc' },
  })
}

export async function resendNotification(logId: string): Promise<void> {
  const log = await prisma.notificationLog.findUnique({ where: { id: logId } })
  if (!log || log.status !== 'FAILED') throw new Error('通知記錄不存在或不在失敗狀態')

  await prisma.notificationLog.update({
    where: { id: logId },
    data: { status: 'RETRYING', lastAttemptAt: new Date() },
  })

  await attemptSend(logId, log.recipientEmail, log.subject, log.body)
}

// Notification message builders
export function buildEnrollmentSubmittedNotification(
  employee: { id: string; email: string; name: string },
  courseName: string,
  sessionDate: Date,
  enrollmentId: string,
  sessionId: string,
): NotificationPayload {
  return {
    recipientId: employee.id,
    recipientEmail: employee.email,
    eventType: 'ENROLLMENT_SUBMITTED',
    enrollmentId,
    sessionId,
    subject: `【教育訓練】課程報名已送出：${courseName}`,
    body: `${employee.name} 您好，\n\n您已成功送出「${courseName}」課程的報名申請（開課日期：${sessionDate.toLocaleDateString('zh-TW')}）。\n\n申請目前等待主管審核，請靜候通知。\n\n教育訓練系統`,
  }
}

export function buildManagerReviewNeededNotification(
  manager: { id: string; email: string; name: string },
  employeeName: string,
  courseName: string,
  enrollmentId: string,
): NotificationPayload {
  return {
    recipientId: manager.id,
    recipientEmail: manager.email,
    eventType: 'MANAGER_REVIEW_NEEDED',
    enrollmentId,
    subject: `【教育訓練】部屬課程申請待審核：${employeeName}`,
    body: `${manager.name} 您好，\n\n您的部屬 ${employeeName} 申請了「${courseName}」課程，請登入系統進行審核。\n\n教育訓練系統`,
  }
}

export function buildManagerReviewResultNotification(
  employee: { id: string; email: string; name: string },
  courseName: string,
  approved: boolean,
  note: string | null | undefined,
  enrollmentId: string,
): NotificationPayload {
  const result = approved ? '核准' : '退回'
  return {
    recipientId: employee.id,
    recipientEmail: employee.email,
    eventType: approved ? 'MANAGER_APPROVED' : 'MANAGER_REJECTED',
    enrollmentId,
    subject: `【教育訓練】主管審核結果：${courseName} — ${result}`,
    body: `${employee.name} 您好，\n\n您申請的「${courseName}」課程已由主管${result}。${note ? `\n\n退回原因：${note}` : ''}\n\n教育訓練系統`,
  }
}

export function buildHRReviewResultNotification(
  employee: { id: string; email: string; name: string },
  courseName: string,
  sessionDate: Date,
  approved: boolean,
  note: string | null | undefined,
  enrollmentId: string,
): NotificationPayload {
  const result = approved ? '核准' : '退回'
  return {
    recipientId: employee.id,
    recipientEmail: employee.email,
    eventType: approved ? 'HR_APPROVED' : 'HR_REJECTED',
    enrollmentId,
    subject: `【教育訓練】HR 核准結果：${courseName} — ${result}`,
    body: `${employee.name} 您好，\n\n您申請的「${courseName}」（開課日期：${sessionDate.toLocaleDateString('zh-TW')}）已由 HR ${result}。${note ? `\n\n原因：${note}` : ''}\n\n恭喜您完成報名！請準時出席。\n\n教育訓練系統`,
  }
}

export function buildWaitlistJoinedNotification(
  employee: { id: string; email: string; name: string },
  courseName: string,
  position: number,
  sessionId: string,
): NotificationPayload {
  return {
    recipientId: employee.id,
    recipientEmail: employee.email,
    eventType: 'WAITLIST_JOINED',
    sessionId,
    subject: `【教育訓練】已加入等待名單：${courseName}`,
    body: `${employee.name} 您好，\n\n「${courseName}」課程名額已滿，您目前在等待名單第 ${position} 位。\n\n若有名額釋出，系統將通知您確認，請留意 Email。\n\n教育訓練系統`,
  }
}

export function buildWaitlistPromotedNotification(
  employee: { id: string; email: string; name: string },
  courseName: string,
  deadline: Date,
  entryId: string,
  sessionId: string,
): NotificationPayload {
  return {
    recipientId: employee.id,
    recipientEmail: employee.email,
    eventType: 'WAITLIST_PROMOTED',
    sessionId,
    subject: `【教育訓練】等待名單遞補通知：${courseName}`,
    body: `${employee.name} 您好，\n\n「${courseName}」有名額釋出，您已獲得遞補資格！\n\n請在 ${deadline.toLocaleString('zh-TW')} 前登入系統確認報名，逾時資格將自動失效。\n\n確認連結：請登入教育訓練系統，進入「等待名單」頁面確認。\n\n教育訓練系統`,
  }
}

export function buildWaitlistExpiredNotification(
  employee: { id: string; email: string; name: string },
  courseName: string,
  sessionId: string,
): NotificationPayload {
  return {
    recipientId: employee.id,
    recipientEmail: employee.email,
    eventType: 'WAITLIST_EXPIRED',
    sessionId,
    subject: `【教育訓練】等待名單逾時通知：${courseName}`,
    body: `${employee.name} 您好，\n\n「${courseName}」的遞補確認期限已到，您的等待資格已自動失效。\n\n如有需要，請重新申請其他梯次。\n\n教育訓練系統`,
  }
}

export function buildAttendanceConfirmedNotification(
  employee: { id: string; email: string; name: string },
  courseName: string,
  attended: boolean,
  enrollmentId: string,
): NotificationPayload {
  return {
    recipientId: employee.id,
    recipientEmail: employee.email,
    eventType: attended ? 'ATTENDANCE_CONFIRMED' : 'ATTENDANCE_ABSENT',
    enrollmentId,
    subject: `【教育訓練】出席確認通知：${courseName}`,
    body: attended
      ? `${employee.name} 您好，\n\n「${courseName}」課程的出席已確認。\n\n請依照系統指引完成後續結案步驟（心得填寫/測驗）。\n\n教育訓練系統`
      : `${employee.name} 您好，\n\n「${courseName}」課程紀錄顯示您未出席，若有疑問請聯絡 HR。\n\n教育訓練系統`,
  }
}

export function buildReflectionReturnedNotification(
  employee: { id: string; email: string; name: string },
  courseName: string,
  returnNote: string,
  enrollmentId: string,
): NotificationPayload {
  return {
    recipientId: employee.id,
    recipientEmail: employee.email,
    eventType: 'REFLECTION_RETURNED',
    enrollmentId,
    subject: `【教育訓練】心得退回通知：${courseName}`,
    body: `${employee.name} 您好，\n\n您提交的「${courseName}」心得已被 HR 退回，請重新填寫。\n\n退回原因：${returnNote}\n\n請登入教育訓練系統修改後重新送出。\n\n教育訓練系統`,
  }
}

export function buildQuizGradedNotification(
  employee: { id: string; email: string; name: string },
  courseName: string,
  totalScore: number,
  maxScore: number,
  passed: boolean,
  enrollmentId: string,
): NotificationPayload {
  return {
    recipientId: employee.id,
    recipientEmail: employee.email,
    eventType: 'QUIZ_GRADED',
    enrollmentId,
    subject: `【教育訓練】測驗成績通知：${courseName}`,
    body: `${employee.name} 您好，\n\n「${courseName}」測驗評分完成。\n\n成績：${totalScore} / ${maxScore} 分（${passed ? '通過' : '未通過'}）\n\n${passed ? '恭喜您通過測驗！系統將通知 HR 進行結案。' : '很遺憾，您此次測驗未達通過標準，請等候 HR 通知後續安排。'}\n\n教育訓練系統`,
  }
}

export function buildCourseCompletedNotification(
  employee: { id: string; email: string; name: string },
  courseName: string,
  hoursOrCredits: string,
  enrollmentId: string,
): NotificationPayload {
  return {
    recipientId: employee.id,
    recipientEmail: employee.email,
    eventType: 'COURSE_COMPLETED',
    enrollmentId,
    subject: `【教育訓練】課程完訓通知：${courseName}`,
    body: `${employee.name} 您好，\n\n恭喜您完成「${courseName}」課程！\n\n取得：${hoursOrCredits}\n\n完訓紀錄已更新至您的訓練歷程。\n\n教育訓練系統`,
  }
}

export function buildCommitmentSignatureRequiredNotification(
  employee: { id: string; email: string; name: string },
  courseName: string,
  deadline: Date,
  enrollmentId: string,
): NotificationPayload {
  return {
    recipientId: employee.id,
    recipientEmail: employee.email,
    eventType: 'COMMITMENT_SIGNATURE_REQUIRED',
    enrollmentId,
    subject: `【教育訓練】請簽署服務承諾書：${courseName}`,
    body: `${employee.name} 您好，\n\n您報名的「${courseName}」課程已通過 HR 核准，但此課程需要您簽署服務承諾書。\n\n請在 ${deadline.toLocaleString('zh-TW')} 前登入系統完成簽署，逾時報名將自動取消。\n\n教育訓練系統`,
  }
}

export function buildCommitmentSignedNotification(
  employee: { id: string; email: string; name: string },
  courseName: string,
  commitmentExpiresAt: Date,
  enrollmentId: string,
): NotificationPayload {
  return {
    recipientId: employee.id,
    recipientEmail: employee.email,
    eventType: 'COMMITMENT_SIGNED',
    enrollmentId,
    subject: `【教育訓練】服務承諾書簽署成功：${courseName}`,
    body: `${employee.name} 您好，\n\n您已成功簽署「${courseName}」課程的服務承諾書，報名已確認。\n\n承諾到期日：${commitmentExpiresAt.toLocaleDateString('zh-TW')}\n\n請準時出席課程。\n\n教育訓練系統`,
  }
}

export function buildCommitmentSignatureExpiredNotification(
  employee: { id: string; email: string; name: string },
  courseName: string,
  enrollmentId: string,
): NotificationPayload {
  return {
    recipientId: employee.id,
    recipientEmail: employee.email,
    eventType: 'COMMITMENT_SIGNATURE_EXPIRED',
    enrollmentId,
    subject: `【教育訓練】服務承諾書簽署逾時：${courseName}`,
    body: `${employee.name} 您好，\n\n您的「${courseName}」服務承諾書簽署已逾 48 小時，報名已自動取消。\n\n如需重新報名，請重新申請。\n\n教育訓練系統`,
  }
}

export function buildCommitmentExpiringSoonNotification(
  hr: { id: string; email: string; name: string },
  expiringItems: Array<{ employeeName: string; courseName: string; expiresAt: Date; daysLeft: number }>,
): NotificationPayload {
  const itemLines = expiringItems
    .map((item) => `  - ${item.employeeName}（${item.courseName}）：${item.expiresAt.toLocaleDateString('zh-TW')}（剩 ${item.daysLeft} 天）`)
    .join('\n')
  return {
    recipientId: hr.id,
    recipientEmail: hr.email,
    eventType: 'COMMITMENT_EXPIRING_SOON',
    subject: `【教育訓練】本月即將到期服務承諾書清單`,
    body: `${hr.name} 您好，\n\n以下員工的服務承諾書將在 30 天內到期，請注意追蹤：\n\n${itemLines}\n\n請登入教育訓練系統查看詳情。\n\n教育訓練系統`,
  }
}

export function buildCommitmentCompensationNotification(
  hr: { id: string; email: string; name: string },
  employeeName: string,
  resignedAt: Date,
  totalCompensation: string,
  items: Array<{ courseName: string; compensationAmount: string; note: string }>,
): NotificationPayload {
  const itemLines = items
    .map((item) => `  - ${item.courseName}：${item.compensationAmount} 元（${item.note}）`)
    .join('\n')
  return {
    recipientId: hr.id,
    recipientEmail: hr.email,
    eventType: 'COMMITMENT_COMPENSATION',
    subject: `【教育訓練】員工離職服務承諾賠償計算：${employeeName}`,
    body: `${hr.name} 您好，\n\n員工 ${employeeName} 已於 ${resignedAt.toLocaleDateString('zh-TW')} 標記離職，以下為服務承諾賠償計算結果：\n\n${itemLines}\n\n合計應賠償：${totalCompensation} 元\n\n請登入教育訓練系統查看詳情。\n\n教育訓練系統`,
  }
}
