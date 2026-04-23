# API Contracts: 進階功能整合

**Feature**: 006-manager-kb-email
**Date**: 2026-04-23

---

## GET /api/manager/dashboard

管理者儀表板資料（直屬下屬訓練狀態 + 待審申請）。

**Auth**: MANAGER 或 HR 角色

### Query Parameters

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| year | number | 否 | 年度，預設當前年份 |

### Response 200

```json
{
  "year": 2025,
  "totalSubordinates": 5,
  "trainedCount": 3,
  "complianceRate": 60.0,
  "subordinates": [
    {
      "employee": { "id": "emp-1", "name": "陳員工", "department": "業務部" },
      "trained": true,
      "enrollments": [
        {
          "id": "enr-1",
          "courseName": "法治課程",
          "status": "COMPLETED",
          "createdAt": "2025-03-01T00:00:00.000Z"
        }
      ]
    }
  ],
  "pendingApprovals": [
    {
      "enrollmentId": "enr-2",
      "employeeName": "林員工",
      "courseName": "經營管理課程",
      "createdAt": "2025-04-10T00:00:00.000Z"
    }
  ]
}
```

---

## GET /api/hr/courses/[id]/resources

取得課程的所有知識庫資源（HR 管理用）。

**Auth**: HR 角色

### Response 200

```json
[
  {
    "id": "res-1",
    "courseId": "crs-1",
    "title": "法規說明文件",
    "type": "LINK",
    "content": "https://example.com/doc.pdf",
    "order": 0
  },
  {
    "id": "res-2",
    "courseId": "crs-1",
    "title": "課程重點摘要",
    "type": "TEXT",
    "content": "本課程重點包含：...",
    "order": 1
  }
]
```

---

## POST /api/hr/courses/[id]/resources

新增知識庫資源。

**Auth**: HR 角色

### Request Body

```json
{
  "title": "法規說明文件",
  "type": "LINK",
  "content": "https://example.com/doc.pdf",
  "order": 0
}
```

### Response 201

```json
{
  "id": "res-1",
  "courseId": "crs-1",
  "title": "法規說明文件",
  "type": "LINK",
  "content": "https://example.com/doc.pdf",
  "order": 0
}
```

### Response 400

```json
{ "error": "標題為必填" }
```

---

## PATCH /api/hr/courses/[id]/resources/[resourceId]

編輯知識庫資源。

**Auth**: HR 角色

### Request Body（所有欄位選填）

```json
{
  "title": "更新後標題",
  "content": "https://new-url.com"
}
```

### Response 200

```json
{ "id": "res-1", "title": "更新後標題", ... }
```

---

## DELETE /api/hr/courses/[id]/resources/[resourceId]

刪除知識庫資源。

**Auth**: HR 角色

### Response 200

```json
{ "success": true }
```

---

## GET /api/courses/[id]/resources

員工端：取得課程知識庫資源（唯讀）。

**Auth**: 任何已登入使用者

### Response 200

```json
[
  {
    "id": "res-1",
    "title": "法規說明文件",
    "type": "LINK",
    "content": "https://example.com/doc.pdf",
    "order": 0
  }
]
```
