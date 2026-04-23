# API Contracts: 服務承諾管理

**Branch**: `004-service-commitment` | **Date**: 2026-04-23

---

## 員工端 API

### GET /api/enrollments/[id]/commitment

取得申請的承諾書詳情（員工查閱用）。

**Auth**: 任何登入員工（僅可查看自己的申請）

**Response 200**:
```json
{
  "id": "uuid",
  "status": "PENDING_SIGNATURE",
  "signatureDeadline": "2026-04-25T09:00:00Z",
  "signedAt": null,
  "commitmentMonths": 24,
  "commitmentFee": "30000.00",
  "commitmentExpiresAt": null,
  "course": {
    "name": "進階管理培訓",
    "measurementValue": 16,
    "measurementUnit": "HOURS"
  },
  "compensationSchedule": [
    { "monthsCompleted": 0, "remainingMonths": 24, "amount": "30000.00" },
    { "monthsCompleted": 6, "remainingMonths": 18, "amount": "22500.00" },
    { "monthsCompleted": 12, "remainingMonths": 12, "amount": "15000.00" },
    { "monthsCompleted": 18, "remainingMonths": 6, "amount": "7500.00" },
    { "monthsCompleted": 24, "remainingMonths": 0, "amount": "0.00" }
  ]
}
```

**Response 403**: 非本人申請
**Response 404**: 申請無承諾書記錄

---

### POST /api/enrollments/[id]/commitment/sign

員工簽署承諾書。

**Auth**: 任何登入員工（本人）

**Request Body**: `{}` （無需額外資料，身份已由 session 驗證）

**Response 200**:
```json
{
  "commitmentId": "uuid",
  "signedAt": "2026-04-23T10:30:00Z",
  "commitmentExpiresAt": "2028-04-23T10:30:00Z",
  "enrollmentStatus": "CONFIRMED"
}
```

**Response 400**: 承諾書已簽署、已過期、申請不在 PENDING_COMMITMENT 狀態
**Response 403**: 非本人
**Response 404**: 申請或承諾書不存在

---

## HR 端 API

### GET /api/hr/commitments

取得全公司承諾書清單。

**Auth**: HR

**Query Params**:
- `status`: `PENDING_SIGNATURE` | `ACTIVE` | `EXPIRED` | `VOIDED` | `COMPENSATION_NOTED`（可多選，逗號分隔）
- `expiring`: `30`（僅顯示 N 天內到期，預設不篩選）
- `employeeId`: 篩選特定員工
- `page`: 分頁，預設 1
- `pageSize`: 每頁筆數，預設 20

**Response 200**:
```json
{
  "total": 45,
  "page": 1,
  "pageSize": 20,
  "data": [
    {
      "id": "uuid",
      "status": "ACTIVE",
      "employee": { "id": "uuid", "name": "王小明", "department": "業務部", "unit": "北區" },
      "course": { "id": "uuid", "name": "進階管理培訓" },
      "signedAt": "2026-01-15T09:00:00Z",
      "commitmentExpiresAt": "2028-01-15T09:00:00Z",
      "commitmentMonths": 24,
      "commitmentFee": "30000.00",
      "daysUntilExpiry": 631
    }
  ]
}
```

---

### GET /api/hr/commitments/[id]

取得單筆承諾書詳情。

**Auth**: HR

**Response 200**:
```json
{
  "id": "uuid",
  "status": "ACTIVE",
  "employee": { "id": "uuid", "name": "王小明", "email": "wang@company.com", "department": "業務部", "unit": "北區" },
  "course": { "id": "uuid", "name": "進階管理培訓", "measurementValue": 16, "measurementUnit": "HOURS" },
  "enrollment": { "id": "uuid", "sessionStartDate": "2026-01-20T09:00:00Z" },
  "signatureDeadline": "2026-01-17T09:00:00Z",
  "signedAt": "2026-01-15T09:00:00Z",
  "commitmentMonths": 24,
  "commitmentFee": "30000.00",
  "commitmentExpiresAt": "2028-01-15T09:00:00Z",
  "compensationAmount": null,
  "compensationNote": null
}
```

---

### POST /api/hr/employees/[id]/resign

標記員工離職並觸發賠償計算。

**Auth**: HR

**Request Body**:
```json
{
  "resignedAt": "2026-04-20"
}
```

**Response 200**:
```json
{
  "employeeId": "uuid",
  "resignedAt": "2026-04-20",
  "commitmentCompensations": [
    {
      "commitmentId": "uuid",
      "courseName": "進階管理培訓",
      "commitmentMonths": 24,
      "commitmentFee": "30000.00",
      "monthsCompleted": 6,
      "remainingMonths": 18,
      "compensationAmount": "22500.00",
      "note": "依比例計算：30,000 × 18/24",
      "preCourseResignation": false
    }
  ],
  "totalCompensation": "22500.00"
}
```

**Response 400**: `resignedAt` 無效日期、員工已離職
**Response 404**: 員工不存在

---

## Cron API

### POST /api/cron/commitment-expiry

檢查超過 48 小時未簽署的承諾書，自動取消對應申請。

**Auth**: Cron secret header (`Authorization: Bearer {CRON_SECRET}`)

**Response 200**:
```json
{
  "processed": 3,
  "cancelled": [
    { "commitmentId": "uuid", "enrollmentId": "uuid", "employeeName": "李小花" }
  ]
}
```

**排程**: 每小時執行（vercel.json cron）

---

### POST /api/cron/commitment-monthly-reminder

發送月度「即將到期承諾書」彙整通知給 HR。

**Auth**: Cron secret header

**Response 200**:
```json
{
  "expiringCount": 5,
  "notificationSent": true,
  "hrCount": 2
}
```

**排程**: 每月 1 日 01:00 UTC（= 台北 09:00）

---

## Server Actions（Next.js）

### `signCommitmentAction(enrollmentId: string)`

員工簽署承諾書的 Server Action，用於 `(employee)/enrollments/[id]/commitment/page.tsx`。

### `resignEmployeeAction(employeeId: string, resignedAt: string)`

HR 標記員工離職的 Server Action，用於 `(hr)/employees/[id]/page.tsx`。

---

## 頁面路由

| 路由 | 角色 | 說明 |
|------|------|------|
| `(employee)/enrollments/[id]/commitment` | Employee | 查看並簽署承諾書 |
| `(hr)/commitments` | HR | 全公司承諾書清單與篩選 |
| `(hr)/employees/[id]` | HR | 員工詳情（新增離職標記與賠償計算） |
