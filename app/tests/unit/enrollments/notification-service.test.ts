import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildEnrollmentSubmittedNotification,
  buildManagerReviewNeededNotification,
  buildManagerReviewResultNotification,
  buildHRReviewResultNotification,
  buildWaitlistJoinedNotification,
  buildWaitlistPromotedNotification,
  buildWaitlistExpiredNotification,
} from '@/lib/enrollments/notification-service'

// Mock prisma and nodemailer for unit tests
vi.mock('@/lib/prisma', () => ({
  prisma: {
    notificationLog: {
      create: vi.fn().mockResolvedValue({ id: 'log-1' }),
      update: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}))

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
    }),
  },
}))

const mockEmployee = { id: 'emp-1', email: 'emp@company.com', name: '陳員工' }
const mockManager = { id: 'mgr-1', email: 'mgr@company.com', name: '張主管' }

describe('Notification message builders', () => {
  it('buildEnrollmentSubmittedNotification 包含課程名稱與員工姓名', () => {
    const payload = buildEnrollmentSubmittedNotification(
      mockEmployee,
      '法治教育課程',
      new Date('2026-05-10'),
      'enr-1',
      'ses-1',
    )
    expect(payload.eventType).toBe('ENROLLMENT_SUBMITTED')
    expect(payload.recipientEmail).toBe(mockEmployee.email)
    expect(payload.subject).toContain('法治教育課程')
    expect(payload.body).toContain('陳員工')
    expect(payload.enrollmentId).toBe('enr-1')
  })

  it('buildManagerReviewNeededNotification 寄給主管', () => {
    const payload = buildManagerReviewNeededNotification(
      mockManager,
      '陳員工',
      '法治教育課程',
      'enr-1',
    )
    expect(payload.eventType).toBe('MANAGER_REVIEW_NEEDED')
    expect(payload.recipientEmail).toBe(mockManager.email)
    expect(payload.body).toContain('陳員工')
  })

  it('buildManagerReviewResultNotification 核准時不含退回原因', () => {
    const payload = buildManagerReviewResultNotification(
      mockEmployee,
      '法治教育課程',
      true,
      null,
      'enr-1',
    )
    expect(payload.eventType).toBe('MANAGER_APPROVED')
    expect(payload.body).not.toContain('退回原因')
  })

  it('buildManagerReviewResultNotification 退回時含退回原因', () => {
    const payload = buildManagerReviewResultNotification(
      mockEmployee,
      '法治教育課程',
      false,
      '工作排程衝突',
      'enr-1',
    )
    expect(payload.eventType).toBe('MANAGER_REJECTED')
    expect(payload.body).toContain('工作排程衝突')
  })

  it('buildHRReviewResultNotification 核准時包含出席提示', () => {
    const payload = buildHRReviewResultNotification(
      mockEmployee,
      '法治教育課程',
      new Date('2026-05-10'),
      true,
      null,
      'enr-1',
    )
    expect(payload.eventType).toBe('HR_APPROVED')
    expect(payload.body).toContain('準時出席')
  })

  it('buildWaitlistJoinedNotification 含等待順序', () => {
    const payload = buildWaitlistJoinedNotification(mockEmployee, '法治教育課程', 3, 'ses-1')
    expect(payload.eventType).toBe('WAITLIST_JOINED')
    expect(payload.body).toContain('第 3 位')
  })

  it('buildWaitlistPromotedNotification 含確認期限', () => {
    const deadline = new Date('2026-05-01T10:00:00Z')
    const payload = buildWaitlistPromotedNotification(mockEmployee, '法治教育課程', deadline, 'entry-1', 'ses-1')
    expect(payload.eventType).toBe('WAITLIST_PROMOTED')
    expect(payload.body).toContain('名額釋出')
  })

  it('buildWaitlistExpiredNotification 通知資格失效', () => {
    const payload = buildWaitlistExpiredNotification(mockEmployee, '法治教育課程', 'ses-1')
    expect(payload.eventType).toBe('WAITLIST_EXPIRED')
    expect(payload.body).toContain('自動失效')
  })
})
