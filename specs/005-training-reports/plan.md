# Implementation Plan: 訓練報表與統計

**Branch**: `005-training-reports` | **Date**: 2026-04-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/005-training-reports/spec.md`

## Summary

HR 可查看四個維度的訓練報表：年度達標率總覽（US1）、部門訓練統計（US2）、員工訓練歷程（US3）、課程完訓率（US4）。所有報表均為純讀取，讀取現有 `EmployeeTrainingRecord`、`CourseEnrollment`、`Employee` 資料，**無需新增 schema**。

技術策略：在 `app/src/lib/reports/service.ts` 集中所有聚合查詢；HR 報表頁面用 Next.js Server Components 初始渲染，年度切換透過 API Routes 動態更新；所有 service 函式須有單元測試。

## Technical Context

**Language/Version**: TypeScript (strict mode), Next.js App Router
**Primary Dependencies**: Prisma ORM（現有）、Zod（現有）、Tailwind CSS（現有）
**Storage**: PostgreSQL（現有，無 migration）
**Testing**: Vitest + vi.hoisted mock pattern（現有 vitest.config.ts）
**Target Platform**: Web（桌機優先，HR 使用）
**Project Type**: Web application（Next.js 全端）
**Performance Goals**: 報表頁面 ≤ 3 秒（500 員工 / 50 課程規模）
**Constraints**: 無 raw SQL，Prisma 查詢 + TypeScript 記憶體分組；無新 schema
**Scale/Scope**: HR-only，預期同時使用者 < 10 人

## Constitution Check

| 原則 | 狀態 | 說明 |
|------|------|------|
| I. Next.js 全端單一專案 | ✅ | 所有頁面與 API Route 均在 app/ 目錄 |
| II. 角色驅動存取控制 | ✅ | 報表頁面透過 middleware 限 HR 存取 |
| III. 分階段交付 | ✅ | 報表為 Phase 1 核心功能（基本報表） |
| IV. 品質門檻 | ✅ | service.ts 有對應單元測試；TypeScript strict |
| V. 資料永久保存 | ✅ | 純讀取，無刪除操作 |

## Project Structure

### Documentation (this feature)

```text
specs/005-training-reports/
├── plan.md              # 本檔
├── research.md          # 技術決策
├── data-model.md        # 現有資料模型說明與計算邏輯
├── quickstart.md        # 端對端驗證步驟
├── contracts/
│   └── api-routes.md   # 4 個 API 合約
└── tasks.md             # 由 /speckit-tasks 產生
```

### Source Code

```text
app/
├── src/
│   ├── lib/
│   │   └── reports/
│   │       ├── service.ts        # getComplianceOverview, getDepartmentStats,
│   │       │                     # getEmployeeTrainingHistory, getCourseStats
│   │       └── validations.ts    # Zod: yearSchema, employeeSearchSchema, paginationSchema
│   ├── app/
│   │   ├── (hr)/
│   │   │   └── reports/
│   │   │       ├── page.tsx                  # 報表中心 hub（連結至 4 個子報表）
│   │   │       ├── compliance/
│   │   │       │   └── page.tsx              # US1 年度達標率
│   │   │       ├── departments/
│   │   │       │   └── page.tsx              # US2 部門統計
│   │   │       ├── employees/
│   │   │       │   └── page.tsx              # US3 員工搜尋 + 歷程
│   │   │       └── courses/
│   │   │           └── page.tsx              # US4 課程完訓率
│   │   └── api/
│   │       └── hr/
│   │           └── reports/
│   │               ├── compliance/route.ts   # GET /api/hr/reports/compliance
│   │               ├── departments/route.ts  # GET /api/hr/reports/departments
│   │               ├── employees/route.ts    # GET /api/hr/reports/employees
│   │               └── courses/route.ts      # GET /api/hr/reports/courses
│   └── middleware.ts                         # 新增 /reports 至 isHRRoute
└── tests/
    └── unit/
        └── reports/
            └── service.test.ts               # 所有 service 函式的單元測試
```

**Structure Decision**: 沿用既有 `app/src/lib/` + `app/src/app/(hr)/` + `app/tests/unit/` 三層架構，與 Feature 004 commitments 結構完全一致。

## Implementation Strategy

### US1 getComplianceOverview(year: number)

```typescript
// 1. Count active employees
const totalActive = await prisma.employee.count({ where: { isActive: true } })
// 2. Count those with training record in year
const trained = await prisma.employeeTrainingRecord.count({
  where: { year, employee: { isActive: true } }
})
// 3. Return overview
return { year, totalActive, trained, untrained: totalActive - trained,
  complianceRate: totalActive > 0 ? (trained / totalActive) * 100 : 0 }
```

### US2 getDepartmentStats(year: number)

```typescript
// Single query: all active employees + their training records for the year
const employees = await prisma.employee.findMany({
  where: { isActive: true },
  select: {
    department: true,
    trainingRecords: { where: { year }, select: { id: true } }
  }
})
// Group in TypeScript memory
const map = new Map<string, { total: number; trained: number }>()
for (const emp of employees) {
  const dept = emp.department || '未分配'
  const entry = map.get(dept) ?? { total: 0, trained: 0 }
  entry.total++
  if (emp.trainingRecords.length > 0) entry.trained++
  map.set(dept, entry)
}
// Convert to array with rates
```

### US3 getEmployeeTrainingHistory(employeeId: string)

```typescript
const [employee, enrollments, yearSummaries] = await Promise.all([
  prisma.employee.findUnique({ where: { id: employeeId } }),
  prisma.courseEnrollment.findMany({
    where: { employeeId, status: 'COMPLETED' },
    include: { session: { include: { course: true } } },
    orderBy: { session: { startDate: 'desc' } }
  }),
  prisma.employeeTrainingRecord.findMany({
    where: { employeeId },
    orderBy: { year: 'desc' }
  })
])
```

### US4 getCourseStats(year: number, page: number, pageSize: number)

```typescript
// Get all courses that have sessions in the year
const courses = await prisma.course.findMany({
  where: { sessions: { some: { startDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } } } },
  include: {
    sessions: {
      where: { startDate: { gte: ..., lt: ... } },
      include: { enrollments: { select: { status: true } } }
    }
  },
  skip: (page - 1) * pageSize,
  take: pageSize
})
// Aggregate per course
```

## Complexity Tracking

無 Constitution 違規，無需說明。
