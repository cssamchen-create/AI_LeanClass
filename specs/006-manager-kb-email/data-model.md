# Data Model: 進階功能整合

**Feature**: 006-manager-kb-email
**Date**: 2026-04-23

---

## Schema 變更

### 新增 Enum: ResourceType

```prisma
enum ResourceType {
  LINK
  TEXT
}
```

### 修改 Enum: NotificationStatus（新增 SKIPPED）

```prisma
enum NotificationStatus {
  PENDING
  SENT
  FAILED
  RETRYING
  SKIPPED   // 新增：SMTP 未設定時使用
}
```

### 新增 Model: KnowledgeBaseResource

```prisma
model KnowledgeBaseResource {
  id        String       @id @default(uuid())
  courseId  String
  course    Course       @relation(fields: [courseId], references: [id])
  title     String
  type      ResourceType
  content   String       // LINK 時為 URL；TEXT 時為說明文字
  order     Int          @default(0)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  @@index([courseId, order])
}
```

### 修改 Course model（新增反向關聯）

```prisma
// 在現有 Course model 新增：
resources KnowledgeBaseResource[]
```

---

## 使用的現有實體（無變更）

### Employee

| 欄位 | 用途 |
|------|------|
| managerId | 查詢直屬下屬（WHERE managerId = 主管ID） |
| isActive | 僅統計在職員工 |
| department | 顯示下屬部門 |

### CourseEnrollment

| 欄位 | 用途 |
|------|------|
| status = PENDING_MANAGER | 管理者待審申請 |
| employeeId | 關聯下屬 |

### EmployeeTrainingRecord

| 欄位 | 用途 |
|------|------|
| year | 管理者儀表板年度過濾 |
| employeeId | 關聯下屬 |

### NotificationLog

| 欄位 | 用途 |
|------|------|
| status | 新增 SKIPPED 值 |
| retryCount | 已有，最多 3 次 |

---

## TypeScript 型別（計畫）

```typescript
// US1 管理者儀表板
type SubordinateTrainingStatus = {
  employee: { id: string; name: string; department: string }
  trained: boolean
  enrollments: Array<{
    id: string
    courseName: string
    status: string
    createdAt: Date
  }>
}

type ManagerDashboard = {
  year: number
  totalSubordinates: number
  trainedCount: number
  complianceRate: number
  subordinates: SubordinateTrainingStatus[]
  pendingApprovals: Array<{
    enrollmentId: string
    employeeName: string
    courseName: string
    createdAt: Date
  }>
}

// US2 知識庫
type KnowledgeBaseResource = {
  id: string
  courseId: string
  title: string
  type: 'LINK' | 'TEXT'
  content: string
  order: number
}
```

---

## Migration 計畫

```
npx prisma migrate dev --name add-knowledge-base-and-notification-skipped
```

變更摘要：
- 新增 `ResourceType` enum
- 新增 `SKIPPED` 到 `NotificationStatus` enum
- 新增 `KnowledgeBaseResource` model
- Course 新增 `resources` 反向關聯
