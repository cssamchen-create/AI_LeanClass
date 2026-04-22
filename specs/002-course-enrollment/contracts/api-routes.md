# API Contracts: 員工課程申請與審核流程

**Feature**: 002-course-enrollment
**Date**: 2026-04-22
**Base Path**: `/api`
**Auth**: 所有端點需 SSO Session；角色限制見各端點說明

---

## 員工端（Employee）

### GET /api/courses（員工視角）

取得員工可報名的課程清單（ACTIVE 狀態課程）。

**Auth**: `EMPLOYEE` / `MANAGER` / `HR`

**Query Parameters**:
| 參數 | 型別 | 說明 |
|------|------|------|
| categoryId | string? | 依類別篩選 |
| page | number? | 頁碼（預設 1）|
| pageSize | number? | 每頁筆數（預設 20）|

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "法治教育課程",
      "category": { "id": "uuid", "name": "法治" },
      "measurementUnit": "HOURS",
      "measurementValue": 3,
      "sessions": [
        {
          "id": "uuid",
          "startDate": "2026-05-10",
          "location": "台北總部 A101",
          "instructorName": "王小明",
          "capacity": 30,
          "enrolledCount": 12,
          "availableCount": 18,
          "status": "OPEN",
          "myEnrollmentStatus": null
        }
      ]
    }
  ],
  "total": 10,
  "page": 1,
  "pageSize": 20
}
```

`myEnrollmentStatus`: 當前登入員工對該梯次的申請狀態（`null` 表示未申請）

---

### POST /api/enrollments

員工送出課程報名申請。

**Auth**: `EMPLOYEE` / `MANAGER`（不含 HR 自行報名，HR 另行處理）

**Request Body**:
```json
{
  "sessionId": "uuid"
}
```

**Validation**:
- `sessionId`: 必填，需為 OPEN 狀態梯次
- 員工不可對同一梯次有重複有效申請

**Response 201（有名額）**:
```json
{
  "type": "enrollment",
  "id": "uuid",
  "status": "PENDING_MANAGER",
  "session": { "id": "uuid", "startDate": "2026-05-10" }
}
```

**Response 201（名額已滿，加入等待名單）**:
```json
{
  "type": "waitlist",
  "id": "uuid",
  "position": 3,
  "session": { "id": "uuid", "startDate": "2026-05-10" }
}
```

**Error 409**: 已有有效申請或等待名單記錄

---

### GET /api/enrollments

取得當前登入員工的所有申請記錄。

**Auth**: `EMPLOYEE` / `MANAGER`

**Query Parameters**:
| 參數 | 型別 | 說明 |
|------|------|------|
| status | string? | 篩選狀態 |
| page | number? | 頁碼（預設 1）|

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "session": {
        "id": "uuid",
        "startDate": "2026-05-10",
        "course": { "id": "uuid", "name": "法治教育課程" }
      },
      "status": "PENDING_MANAGER",
      "createdAt": "2026-04-22T10:00:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "pageSize": 20
}
```

---

### PATCH /api/enrollments/[id]/cancel

員工取消自己的申請（僅限 `PENDING_MANAGER` 或 `PENDING_HR` 狀態）。

**Auth**: `EMPLOYEE`（僅限本人申請）

**Request Body**: 無

**Response 200**:
```json
{ "id": "uuid", "status": "CANCELLED" }
```

**Error 409**: 申請不在可取消狀態（`CONFIRMED` 需透過 HR 取消）

---

### PATCH /api/waitlist/[entryId]/confirm

等待名單遞補確認（等待者收到通知後確認）。

**Auth**: `EMPLOYEE`（僅限本人等待記錄）

**Request Body**: 無

**Business Logic**:
- 驗證 `confirmDeadline > now()`
- 建立新的 `CourseEnrollment`（`PENDING_MANAGER`）
- 更新 `WaitlistEntry.status = CONFIRMED`

**Response 200**:
```json
{
  "waitlistEntry": { "id": "uuid", "status": "CONFIRMED" },
  "enrollment": { "id": "uuid", "status": "PENDING_MANAGER" }
}
```

**Error 410**: 確認期限已過（`confirmDeadline < now()`）

---

## 主管端（Manager）

### GET /api/manager/enrollments

取得主管待審核的申請清單（直屬部屬）。

**Auth**: `MANAGER`

**Query Parameters**:
| 參數 | 型別 | 說明 |
|------|------|------|
| status | string? | 預設 `PENDING_MANAGER` |
| page | number? | 頁碼（預設 1）|

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "employee": { "id": "uuid", "name": "陳小明", "department": "業務部" },
      "session": {
        "id": "uuid",
        "startDate": "2026-05-10",
        "course": { "id": "uuid", "name": "法治教育課程" }
      },
      "status": "PENDING_MANAGER",
      "createdAt": "2026-04-22T10:00:00Z"
    }
  ],
  "total": 8,
  "page": 1,
  "pageSize": 20
}
```

---

### PATCH /api/manager/enrollments/[id]/approve

主管核准申請。

**Auth**: `MANAGER`（僅限直屬部屬申請）

**Request Body**: 無

**Response 200**:
```json
{ "id": "uuid", "status": "PENDING_HR" }
```

**Error 403**: 非直屬主管
**Error 409**: 申請不在 `PENDING_MANAGER` 狀態

---

### PATCH /api/manager/enrollments/[id]/reject

主管退回申請。

**Auth**: `MANAGER`（僅限直屬部屬申請）

**Request Body**:
```json
{ "note": "本月工作排程衝突，請改申請下期梯次" }
```

**Validation**: `note` 必填，不可為空字串

**Response 200**:
```json
{ "id": "uuid", "status": "REJECTED", "managerNote": "..." }
```

---

## HR 端（Human Resources）

### GET /api/hr/enrollments

取得所有「待 HR 核准」申請清單，支援篩選。

**Auth**: `HR`

**Query Parameters**:
| 參數 | 型別 | 說明 |
|------|------|------|
| status | string? | 預設 `PENDING_HR` |
| courseId | string? | 依課程篩選 |
| sessionId | string? | 依梯次篩選 |
| department | string? | 依部門篩選 |
| page | number? | 頁碼（預設 1）|

**Response 200**: 同 manager 格式，增加員工 `unit` 欄位

---

### PATCH /api/hr/enrollments/[id]/approve

HR 核准申請（最終確認）。

**Auth**: `HR`

**Business Logic**:
- Prisma transaction：驗證 `enrolledCount < capacity` → 核准 → `enrolledCount += 1`

**Response 200**:
```json
{ "id": "uuid", "status": "CONFIRMED" }
```

**Error 409**: 名額已滿（需手動處理）

---

### PATCH /api/hr/enrollments/[id]/reject

HR 退回申請。

**Auth**: `HR`

**Request Body**:
```json
{ "note": "退回原因說明" }
```

**Response 200**:
```json
{ "id": "uuid", "status": "REJECTED", "hrNote": "..." }
```

---

### PATCH /api/hr/enrollments/[id]/cancel-confirmed

HR 確認取消已確認的報名（員工提出取消申請後）。

**Auth**: `HR`

**Business Logic**:
- `status = CONFIRMED → CANCELLED`
- `session.enrolledCount -= 1`
- 觸發等待名單遞補（呼叫 waitlist service）

**Response 200**:
```json
{ "id": "uuid", "status": "CANCELLED" }
```

---

### GET /api/hr/notifications/failed

取得發送失敗的通知記錄清單。

**Auth**: `HR`

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "recipientEmail": "employee@company.com",
      "eventType": "MANAGER_APPROVED",
      "subject": "課程報名申請已由主管核准",
      "retryCount": 3,
      "lastAttemptAt": "2026-04-22T10:30:00Z",
      "errorMessage": "SMTP connection timeout"
    }
  ],
  "total": 2
}
```

---

### POST /api/hr/notifications/[id]/resend

HR 手動補發失敗通知。

**Auth**: `HR`

**Response 200**:
```json
{ "id": "uuid", "status": "SENT", "sentAt": "2026-04-22T11:00:00Z" }
```

**Error 400**: 通知狀態非 `FAILED`

---

## 系統端（內部 Cron）

### POST /api/cron/waitlist-expiry

（Vercel Cron Job）掃描逾期等待確認記錄，自動失效並觸發遞補。

**Auth**: Cron Secret Header（`Authorization: Bearer {CRON_SECRET}`）

**Response 200**:
```json
{ "processed": 3, "promoted": 2 }
```

---

### POST /api/cron/notification-retry

（Vercel Cron Job）重試發送失敗的通知（`status = FAILED` 且 `retryCount < 3`）。

**Auth**: Cron Secret Header

**Response 200**:
```json
{ "retried": 5, "succeeded": 4, "failed": 1 }
```
