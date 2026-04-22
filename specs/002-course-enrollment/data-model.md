# Data Model: 員工課程申請與審核流程

**Feature**: 002-course-enrollment
**Date**: 2026-04-22

---

## 既有實體（沿用 001-hr-course-mgmt）

- `CourseCategory`、`Course`、`CourseSession` — 詳見 `specs/001-hr-course-mgmt/data-model.md`
- `CourseSession.enrolledCount` 欄位由本功能負責維護（HR 核准時 +1，取消時 -1）

---

## 新增實體

### Employee（員工）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| name | String | 員工姓名 |
| email | String | 公司 Email（唯一，用於通知） |
| adAccount | String | AD 帳號（唯一，對應 SSO） |
| department | String | 部門 |
| unit | String | 單位（次層組織） |
| role | Enum | `EMPLOYEE` / `MANAGER` / `HR` |
| managerId | UUID? | 外鍵 → Employee（直屬主管）|
| hireDate | Date | 到職日 |
| isActive | Boolean | 帳號是否啟用（離職設為 false） |
| createdAt | DateTime | 建立時間 |
| updatedAt | DateTime | 最後修改時間 |

**Business Rules**:
- 離職員工 `isActive = false`，資料永久保留（Constitution V）
- `role = MANAGER` 的員工可審核其直屬部屬（`managerId = this.id`）的申請
- `role = HR` 可查看與核准所有申請

---

### CourseEnrollment（課程申請）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| employeeId | UUID | 外鍵 → Employee（申請人）|
| sessionId | UUID | 外鍵 → CourseSession |
| status | Enum | 見狀態說明 |
| managerNote | String? | 主管審核意見（退回時必填）|
| hrNote | String? | HR 審核意見（退回時必填）|
| reviewedByManagerId | UUID? | 外鍵 → Employee（審核主管）|
| reviewedByHrId | UUID? | 外鍵 → Employee（審核 HR）|
| managerReviewedAt | DateTime? | 主管審核時間 |
| hrReviewedAt | DateTime? | HR 審核時間 |
| createdAt | DateTime | 申請送出時間 |
| updatedAt | DateTime | 最後修改時間 |

**EnrollmentStatus Enum**:
```
PENDING_MANAGER  → 等待主管審核
PENDING_HR       → 等待 HR 核准
CONFIRMED        → 已確認報名
REJECTED         → 已退回（主管或 HR）
CANCELLED        → 已取消（員工主動或系統自動）
```

**State Transitions**:
```
[送出申請] → PENDING_MANAGER
PENDING_MANAGER → PENDING_HR    （主管核准）
PENDING_MANAGER → REJECTED      （主管退回）
PENDING_MANAGER → CANCELLED     （員工取消）
PENDING_HR      → CONFIRMED     （HR 核准）
PENDING_HR      → REJECTED      （HR 退回）
PENDING_HR      → CANCELLED     （員工取消）
CONFIRMED       → CANCELLED     （員工申請取消，HR 確認後生效）
```

**Business Rules**:
- 同一員工對同一梯次只能有一筆有效申請（狀態非 `REJECTED`、`CANCELLED`）
- HR 核准時 MUST 驗證 `session.enrolledCount < session.capacity`（transaction）
- `CONFIRMED → CANCELLED` 需 HR 確認；確認後 `session.enrolledCount -= 1`，觸發等待名單遞補

---

### WaitlistEntry（等待名單）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| employeeId | UUID | 外鍵 → Employee |
| sessionId | UUID | 外鍵 → CourseSession |
| position | Int | 等待序號（越小越優先）|
| status | Enum | `WAITING` / `PENDING_CONFIRMATION` / `CONFIRMED` / `EXPIRED` / `CANCELLED` |
| notifiedAt | DateTime? | 遞補通知發送時間 |
| confirmDeadline | DateTime? | 確認期限（notifiedAt + 48h）|
| createdAt | DateTime | 加入等待名單時間 |
| updatedAt | DateTime | 最後修改時間 |

**Business Rules**:
- `position` 依 `createdAt` 自動排序，由 service 層維護
- 遞補觸發時：`status = WAITING` → `PENDING_CONFIRMATION`，設定 `notifiedAt` 與 `confirmDeadline`
- 等待者確認後：建立新的 `CourseEnrollment`（狀態 `PENDING_MANAGER`），`WaitlistEntry.status = CONFIRMED`
- 逾 48 小時未確認：`status = EXPIRED`，遞補下一位
- 員工取消等待：`status = CANCELLED`

---

### NotificationLog（通知記錄）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| recipientEmail | String | 收件人 Email |
| recipientId | UUID | 外鍵 → Employee |
| eventType | Enum | 見 EventType 說明 |
| enrollmentId | UUID? | 關聯申請（選填）|
| sessionId | UUID? | 關聯梯次（選填）|
| subject | String | Email 主旨 |
| body | String | Email 內容（純文字）|
| status | Enum | `PENDING` / `SENT` / `FAILED` / `RETRYING` |
| retryCount | Int | 重試次數（最多 3）|
| lastAttemptAt | DateTime? | 最後嘗試發送時間 |
| sentAt | DateTime? | 成功發送時間 |
| errorMessage | String? | 失敗錯誤訊息 |
| createdAt | DateTime | 建立時間 |

**NotificationEventType Enum**:
```
ENROLLMENT_SUBMITTED    → 員工送出申請（通知員工）
MANAGER_REVIEW_NEEDED   → 待主管審核（通知主管）
MANAGER_APPROVED        → 主管核准（通知 HR）
MANAGER_REJECTED        → 主管退回（通知員工）
HR_APPROVED             → HR 核准（通知員工）
HR_REJECTED             → HR 退回（通知員工）
WAITLIST_JOINED         → 加入等待名單（通知員工）
WAITLIST_PROMOTED       → 遞補通知（通知等待者）
WAITLIST_EXPIRED        → 等待逾期（通知員工）
SESSION_CANCELLED       → 梯次取消（通知員工 + HR）
ENROLLMENT_CANCELLED    → 申請取消確認（通知員工）
NOTIFICATION_FAILED     → 通知失敗摘要（HR 補發用）
```

---

## Relationships

```
Employee 1──* CourseEnrollment （申請人）
Employee 1──* CourseEnrollment （審核主管）
Employee 1──* CourseEnrollment （審核 HR）
Employee 1──* WaitlistEntry
Employee 1──* NotificationLog
CourseSession 1──* CourseEnrollment
CourseSession 1──* WaitlistEntry
Employee *──1 Employee （managerId，直屬主管）
```

---

## Prisma Schema（參考）

```prisma
enum EmployeeRole {
  EMPLOYEE
  MANAGER
  HR
}

enum EnrollmentStatus {
  PENDING_MANAGER
  PENDING_HR
  CONFIRMED
  REJECTED
  CANCELLED
}

enum WaitlistStatus {
  WAITING
  PENDING_CONFIRMATION
  CONFIRMED
  EXPIRED
  CANCELLED
}

enum NotificationStatus {
  PENDING
  SENT
  FAILED
  RETRYING
}

enum NotificationEventType {
  ENROLLMENT_SUBMITTED
  MANAGER_REVIEW_NEEDED
  MANAGER_APPROVED
  MANAGER_REJECTED
  HR_APPROVED
  HR_REJECTED
  WAITLIST_JOINED
  WAITLIST_PROMOTED
  WAITLIST_EXPIRED
  SESSION_CANCELLED
  ENROLLMENT_CANCELLED
  NOTIFICATION_FAILED
}

model Employee {
  id           String           @id @default(uuid())
  name         String
  email        String           @unique
  adAccount    String           @unique
  department   String
  unit         String
  role         EmployeeRole     @default(EMPLOYEE)
  managerId    String?
  manager      Employee?        @relation("ManagerRelation", fields: [managerId], references: [id])
  subordinates Employee[]       @relation("ManagerRelation")
  hireDate     DateTime
  isActive     Boolean          @default(true)
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  enrollments         CourseEnrollment[] @relation("EnrollmentApplicant")
  managerReviews      CourseEnrollment[] @relation("EnrollmentManagerReviewer")
  hrReviews           CourseEnrollment[] @relation("EnrollmentHrReviewer")
  waitlistEntries     WaitlistEntry[]
  notificationLogs    NotificationLog[]
}

model CourseEnrollment {
  id                   String           @id @default(uuid())
  employeeId           String
  employee             Employee         @relation("EnrollmentApplicant", fields: [employeeId], references: [id])
  sessionId            String
  session              CourseSession    @relation(fields: [sessionId], references: [id])
  status               EnrollmentStatus @default(PENDING_MANAGER)
  managerNote          String?
  hrNote               String?
  reviewedByManagerId  String?
  reviewedByManager    Employee?        @relation("EnrollmentManagerReviewer", fields: [reviewedByManagerId], references: [id])
  reviewedByHrId       String?
  reviewedByHr         Employee?        @relation("EnrollmentHrReviewer", fields: [reviewedByHrId], references: [id])
  managerReviewedAt    DateTime?
  hrReviewedAt         DateTime?
  createdAt            DateTime         @default(now())
  updatedAt            DateTime         @updatedAt

  notifications NotificationLog[]

  @@unique([employeeId, sessionId, status])
}

model WaitlistEntry {
  id              String         @id @default(uuid())
  employeeId      String
  employee        Employee       @relation(fields: [employeeId], references: [id])
  sessionId       String
  session         CourseSession  @relation(fields: [sessionId], references: [id])
  position        Int
  status          WaitlistStatus @default(WAITING)
  notifiedAt      DateTime?
  confirmDeadline DateTime?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@unique([employeeId, sessionId])
  @@index([sessionId, position])
}

model NotificationLog {
  id             String                @id @default(uuid())
  recipientEmail String
  recipientId    String
  recipient      Employee              @relation(fields: [recipientId], references: [id])
  eventType      NotificationEventType
  enrollmentId   String?
  enrollment     CourseEnrollment?     @relation(fields: [enrollmentId], references: [id])
  sessionId      String?
  subject        String
  body           String
  status         NotificationStatus    @default(PENDING)
  retryCount     Int                   @default(0)
  lastAttemptAt  DateTime?
  sentAt         DateTime?
  errorMessage   String?
  createdAt      DateTime              @default(now())
}
```
