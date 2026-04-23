# API Contracts: 訓練報表與統計

**Feature**: 005-training-reports
**Date**: 2026-04-23

所有 API 僅 HR 角色可存取（由 middleware 透過 session 驗證）。

---

## GET /api/hr/reports/compliance

年度訓練達標率總覽。

### Query Parameters

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| year | number | 否 | 年度，預設當前年份 |

### Response 200

```json
{
  "year": 2025,
  "totalActive": 100,
  "trained": 78,
  "untrained": 22,
  "complianceRate": 78.0
}
```

### Response 400

```json
{ "error": "Invalid year" }
```

---

## GET /api/hr/reports/departments

各部門訓練統計，依年度彙整。

### Query Parameters

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| year | number | 否 | 年度，預設當前年份 |

### Response 200

```json
{
  "year": 2025,
  "departments": [
    {
      "department": "技術部",
      "totalEmployees": 10,
      "trained": 8,
      "untrained": 2,
      "complianceRate": 80.0
    },
    {
      "department": "業務部",
      "totalEmployees": 15,
      "trained": 10,
      "untrained": 5,
      "complianceRate": 66.7
    }
  ]
}
```

---

## GET /api/hr/reports/employees

員工訓練歷程查詢（含搜尋）。

### Query Parameters

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| search | string | 否 | 員工姓名關鍵字（部分比對） |
| employeeId | string | 否 | 指定員工 ID 查詢歷程 |

**規則**: `search` 與 `employeeId` 互斥。若兩者均未提供，回傳員工列表（最多 50 筆）。

### Response 200 — 搜尋模式（有 search）

```json
{
  "mode": "search",
  "employees": [
    { "id": "emp-1", "name": "陳員工", "department": "技術部" },
    { "id": "emp-2", "name": "陳另外一人", "department": "業務部" }
  ],
  "total": 2,
  "limitReached": false
}
```

### Response 200 — 歷程模式（有 employeeId）

```json
{
  "mode": "history",
  "employee": {
    "id": "emp-1",
    "name": "陳員工",
    "department": "技術部"
  },
  "enrollments": [
    {
      "courseId": "crs-1",
      "courseName": "法治課程",
      "sessionStartDate": "2025-03-01T00:00:00.000Z",
      "year": 2025,
      "measurementUnit": "HOURS",
      "measurementValue": 3,
      "status": "COMPLETED"
    }
  ],
  "yearSummaries": [
    {
      "year": 2025,
      "totalHours": "3.00",
      "totalCredits": "0.00"
    }
  ]
}
```

### Response 400

```json
{ "error": "Employee not found" }
```

---

## GET /api/hr/reports/courses

課程完訓率分析。

### Query Parameters

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| year | number | 否 | 年度，預設當前年份 |
| page | number | 否 | 頁碼，預設 1 |
| pageSize | number | 否 | 每頁筆數，預設 20，最大 50 |

### Response 200

```json
{
  "year": 2025,
  "courses": [
    {
      "courseId": "crs-1",
      "courseName": "法治課程",
      "totalEnrolled": 20,
      "completed": 15,
      "completionRate": 75.0
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 5,
    "totalPages": 1
  }
}
```
