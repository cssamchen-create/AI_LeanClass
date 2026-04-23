# Implementation Plan: 進階功能整合

**Branch**: `006-manager-kb-email` | **Date**: 2026-04-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/006-manager-kb-email/spec.md`

## Summary

三個功能整合在一個 feature：(US1) 管理者儀表板讀取下屬訓練狀態；(US2) HR 可為課程管理知識庫資源，員工可唯讀瀏覽；(US3) Email 通知補充 SMTP 靜默跳過保護（nodemailer 已實作，只需加一行守衛）。

US2 需要一次小型 schema migration（KnowledgeBaseResource model + ResourceType enum + NotificationStatus.SKIPPED）。US1 和 US3 均為純程式邏輯，無需新 schema。

## Technical Context

**Language/Version**: TypeScript (strict mode), Next.js App Router
**Primary Dependencies**: Prisma ORM, nodemailer（已安裝）, Zod, Tailwind CSS
**Storage**: PostgreSQL（需執行一次 migration for US2）
**Testing**: Vitest + vi.hoisted
**Target Platform**: Web（桌機，HR/Manager 使用）
**Project Type**: Web application（Next.js 全端）
**Performance Goals**: 管理者儀表板 ≤ 3 秒（直屬下屬 < 50 人）
**Constraints**: nodemailer 已有，SMTP 未設定時靜默跳過不拋錯
**Scale/Scope**: Manager-only dashboard；HR-only KB CRUD；Employee 唯讀

## Constitution Check

| 原則 | 狀態 | 說明 |
|------|------|------|
| I. Next.js 全端單一專案 | ✅ | 所有頁面與 API 在 app/ 目錄 |
| II. 角色驅動存取控制 | ✅ | Dashboard=MANAGER、KB CRUD=HR、KB 讀=Employee |
| III. 分階段交付 | ✅ | 管理者儀表板 + 知識庫 = Phase 1；Email 靜默改進 = Phase 1 收尾 |
| IV. 品質門檻 | ✅ | service 函式有單元測試 |
| V. 資料永久保存 | ✅ | 無刪除機制，知識庫資源軟刪除或直接刪除（唯讀歷史無需保留） |

## Project Structure

### Documentation

```text
specs/006-manager-kb-email/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api-routes.md
└── tasks.md
```

### Source Code

```text
app/
├── prisma/
│   └── schema.prisma              # 新增 ResourceType enum, KnowledgeBaseResource model,
│                                  # NotificationStatus.SKIPPED
├── src/
│   ├── lib/
│   │   ├── manager/
│   │   │   └── service.ts         # getManagerDashboard(managerId, year)
│   │   ├── knowledge-base/
│   │   │   ├── service.ts         # getCourseResources, addResource, updateResource, deleteResource
│   │   │   └── validations.ts     # Zod: createResourceSchema, updateResourceSchema
│   │   └── enrollments/
│   │       └── notification-service.ts  # 修改 attemptSend：加 SMTP_HOST 守衛
│   ├── app/
│   │   ├── (manager)/
│   │   │   └── dashboard/
│   │   │       └── page.tsx       # 管理者儀表板（RSC）
│   │   ├── (hr)/
│   │   │   └── courses/[id]/
│   │   │       └── page.tsx       # 既有頁面，新增知識庫管理區塊
│   │   ├── (employee)/
│   │   │   └── enrollments/[id]/
│   │   │       └── page.tsx       # 既有頁面，新增知識庫唯讀區塊
│   │   └── api/
│   │       ├── manager/
│   │       │   └── dashboard/route.ts
│   │       ├── hr/
│   │       │   └── courses/[id]/
│   │       │       └── resources/
│   │       │           ├── route.ts          # GET + POST
│   │       │           └── [resourceId]/route.ts  # PATCH + DELETE
│   │       └── courses/
│   │           └── [id]/
│   │               └── resources/route.ts    # GET（員工端）
└── tests/unit/
    ├── manager/
    │   └── service.test.ts
    └── knowledge-base/
        └── service.test.ts
```

## Implementation Notes

### US1 getManagerDashboard

```typescript
const currentYear = year ?? new Date().getFullYear()
// 1. 取得直屬下屬
const subordinates = await prisma.employee.findMany({
  where: { managerId, isActive: true },
  include: {
    trainingRecords: { where: { year: currentYear } },
    enrollments: {
      include: { session: { include: { course: true } } },
      orderBy: { createdAt: 'desc' },
    },
  },
})
// 2. 待審申請（直屬下屬）
const subordinateIds = subordinates.map(e => e.id)
const pendingApprovals = await prisma.courseEnrollment.findMany({
  where: { employeeId: { in: subordinateIds }, status: 'PENDING_MANAGER' },
  include: { employee: true, session: { include: { course: true } } },
})
```

### US3 SMTP 守衛（notification-service.ts 修改）

```typescript
// 在 attemptSend 開頭加入：
if (!process.env.SMTP_HOST) {
  await prisma.notificationLog.update({
    where: { id: logId },
    data: { status: 'SKIPPED', lastAttemptAt: new Date() },
  })
  return
}
```

## Complexity Tracking

無 Constitution 違規，無需說明。
