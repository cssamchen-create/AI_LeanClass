# API Contracts: HR 課程管理

**Feature**: 001-hr-course-mgmt
**Date**: 2026-04-22
**Base Path**: `/api`
**Auth**: 所有端點需 SSO Session，角色必須為 `HR`

---

## 課程類別（Course Categories）

### GET /api/course-categories

取得所有課程類別列表。

**Response 200**:
```json
[
  {
    "id": "uuid",
    "name": "年度特訓",
    "countsTowardAnnualHours": true,
    "defaultHours": 12
  }
]
```

---

## 課程（Courses）

### GET /api/courses

取得課程列表，支援篩選。

**Query Parameters**:
| 參數 | 型別 | 說明 |
|------|------|------|
| categoryId | string? | 依類別篩選 |
| status | string? | `DRAFT` / `ACTIVE` / `INACTIVE` |
| page | number? | 頁碼（預設 1） |
| pageSize | number? | 每頁筆數（預設 20） |

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
      "requiresReflection": true,
      "isGroupCourse": false,
      "status": "ACTIVE",
      "sessionCount": 2,
      "createdAt": "2026-04-22T00:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

---

### POST /api/courses

建立新課程。

**Request Body**:
```json
{
  "name": "法治教育課程",
  "categoryId": "uuid",
  "measurementUnit": "HOURS",
  "measurementValue": 3,
  "requiresReflection": true,
  "isGroupCourse": false
}
```

**Validation**:
- `name`: 必填，非空字串
- `categoryId`: 必填，需存在於 CourseCategory
- `measurementUnit`: 必填，`CREDIT` 或 `HOURS`
- `measurementValue`: 必填，正數
- 若類別有 `defaultHours`，`measurementValue` 自動帶入（前端可覆寫）

**Response 201**:
```json
{
  "id": "uuid",
  "name": "法治教育課程",
  "status": "DRAFT"
}
```

**Error 400**: 驗證失敗
**Error 401**: 未登入
**Error 403**: 非 HR 角色

---

### GET /api/courses/[id]

取得單一課程詳細資訊。

**Response 200**:
```json
{
  "id": "uuid",
  "name": "法治教育課程",
  "category": { "id": "uuid", "name": "法治" },
  "measurementUnit": "HOURS",
  "measurementValue": 3,
  "requiresReflection": true,
  "isGroupCourse": false,
  "status": "ACTIVE",
  "knowledgeBaseRef": null,
  "sessions": [
    {
      "id": "uuid",
      "startDate": "2026-05-10",
      "location": "台北總部 A101",
      "instructorName": "王小明",
      "capacity": 30,
      "enrolledCount": 12,
      "status": "OPEN"
    }
  ],
  "createdAt": "2026-04-22T00:00:00Z",
  "updatedAt": "2026-04-22T00:00:00Z"
}
```

**Error 404**: 課程不存在

---

### PUT /api/courses/[id]

更新課程資訊。

**Request Body**:（同 POST，所有欄位選填）
```json
{
  "name": "法治教育課程（更新版）",
  "measurementValue": 4
}
```

**Response 200**: 更新後的課程物件

**Error 400**: 驗證失敗
**Error 404**: 課程不存在

---

### PATCH /api/courses/[id]/status

變更課程狀態（上架/下架）。

**Request Body**:
```json
{
  "status": "ACTIVE"
}
```

**Validation**:
- 允許的狀態轉換：`DRAFT→ACTIVE`、`ACTIVE→INACTIVE`、`INACTIVE→ACTIVE`
- 有報名記錄的課程不可刪除（僅可 INACTIVE）

**Response 200**:
```json
{ "id": "uuid", "status": "ACTIVE" }
```

**Error 400**: 非法狀態轉換
**Error 409**: 業務規則衝突（如嘗試刪除有報名記錄的課程）

---

## 梯次（Course Sessions）

### POST /api/courses/[id]/sessions

為課程建立新梯次。

**Request Body**:
```json
{
  "startDate": "2026-05-10",
  "endDate": "2026-05-10",
  "location": "台北總部 A101",
  "instructorName": "王小明",
  "capacity": 30
}
```

**Validation**:
- `startDate`: 必填，需為未來日期
- `location`: 必填，非空字串
- `instructorName`: 必填，非空字串
- `capacity`: 必填，正整數

**Response 201**: 新梯次物件

---

### PUT /api/courses/[id]/sessions/[sessionId]

更新梯次資訊（僅限 `OPEN` 狀態的梯次）。

**Request Body**: 同 POST（欄位選填）

**Response 200**: 更新後的梯次物件

**Error 409**: 梯次已取消，無法編輯

---

### PATCH /api/courses/[id]/sessions/[sessionId]/cancel

取消梯次。

**Request Body**: 無

**Side Effects**:
- 所有相關申請退回
- 通知申請人與 HR（透過 Email 通知模組）

**Response 200**:
```json
{ "id": "uuid", "status": "CANCELLED", "cancelledAt": "2026-04-22T10:00:00Z" }
```

**Error 409**: 梯次已取消
