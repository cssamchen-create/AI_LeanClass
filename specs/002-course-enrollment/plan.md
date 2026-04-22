# Implementation Plan: 員工課程申請與審核流程

**Branch**: `002-course-enrollment` | **Date**: 2026-04-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-course-enrollment/spec.md`

## Summary

員工可瀏覽開放課程與梯次、送出報名申請，流程經主管審核（核准/退回）後由 HR 最終核准；系統自動管理等待名單（48 小時確認機制）、取消申請，並以 Email 通知各相關人員。技術方向延續 001-hr-course-mgmt 的 Next.js App Router 全端架構，在既有 CourseSession 之上新增申請（Enrollment）與等待名單（Waitlist）資料模型，通知機制以 Nodemailer + SMTP 實作。

## Technical Context

**Language/Version**: TypeScript（strict mode），Next.js 14+ App Router
**Primary Dependencies**: Prisma（ORM，擴充既有 schema），Zod（驗證），React Hook Form，NextAuth.js v5，Tailwind CSS，Nodemailer（Email 通知）
**Storage**: PostgreSQL 15+（沿用 001 資料庫，新增 migration）
**Testing**: Vitest（單元測試：狀態機、等待名單邏輯），Testing Library（選擇性）
**Target Platform**: Vercel（Production），本地開發環境
**Project Type**: Web application（全端，前後端同一 Next.js 專案）
**Performance Goals**: 申請送出 < 2 秒回應；審核清單（50 筆）< 10 秒載入；等待遞補通知 < 5 分鐘
**Constraints**: SSO 唯一登入；所有申請記錄永久保存；禁止 `any`；strict mode；Email 最多重試 3 次（5/15/30 分鐘）
**Scale/Scope**: 員工（全公司）、主管、HR；申請記錄預估每年數百至千筆

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 狀態 | 說明 |
|------|------|------|
| I. Next.js 全端單一專案 | ✅ 通過 | 延續 001 架構，新增 enrollment/waitlist 模組至同一 Next.js 專案 |
| II. 角色驅動存取控制 | ✅ 通過 | Employee/Team Manager/Dept Manager/HR 四角色明確區分，Server 端驗證 |
| III. 分階段交付 | ✅ 通過 | 申請審核為 Phase 1 核心功能；結案（測驗/心得）為後續 Phase |
| IV. 品質門檻 | ✅ 通過 | Vitest 覆蓋申請狀態機、等待名單邏輯；PR checklist |
| V. 資料永久保存 | ✅ 通過 | 申請記錄使用 status 欄位（不刪除）；通知失敗記錄永久保存；Email 重試 3 次 |

**Post-Design Re-check**: ✅ 全部通過，無複雜度違規需記錄

## Project Structure

### Documentation (this feature)

```text
specs/002-course-enrollment/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api-routes.md    # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
app/
├── prisma/
│   ├── schema.prisma         # 新增 CourseEnrollment、WaitlistEntry、NotificationLog
│   └── migrations/           # 新增 migration
└── src/
    ├── app/
    │   ├── (employee)/       # 員工路由群組（新增）
    │   │   └── courses/
    │   │       ├── page.tsx              # 課程瀏覽頁（員工視角）
    │   │       └── [id]/
    │   │           ├── page.tsx          # 課程詳細頁（員工視角）
    │   │           └── sessions/
    │   │               └── [sessionId]/
    │   │                   └── enroll/page.tsx  # 報名確認頁
    │   ├── (manager)/        # 主管路由群組（新增）
    │   │   └── enrollments/
    │   │       └── page.tsx              # 待審核清單
    │   ├── (hr)/             # 沿用 001
    │   │   └── enrollments/
    │   │       └── page.tsx              # HR 核准清單（新增）
    │   └── api/
    │       ├── enrollments/
    │       │   ├── route.ts              # POST（申請）、GET（列表）
    │       │   └── [id]/
    │       │       ├── route.ts          # GET
    │       │       ├── approve/route.ts  # PATCH（主管/HR 核准）
    │       │       ├── reject/route.ts   # PATCH（退回）
    │       │       └── cancel/route.ts   # PATCH（取消）
    │       └── waitlist/
    │           └── [entryId]/
    │               └── confirm/route.ts  # PATCH（等待者確認）
    ├── lib/
    │   └── enrollments/
    │       ├── service.ts           # 申請業務邏輯（狀態機、名額驗證）
    │       ├── waitlist-service.ts  # 等待名單業務邏輯（遞補、逾時）
    │       ├── notification-service.ts  # Email 通知（重試機制）
    │       ├── validations.ts       # Zod schemas
    │       └── actions.ts           # Server Actions
    └── types/
        └── index.ts              # 新增 Enrollment、WaitlistEntry、NotificationLog 型別

tests/
└── unit/
    └── enrollments/
        ├── service.test.ts          # 申請狀態機測試
        ├── waitlist-service.test.ts # 等待名單邏輯測試
        └── notification-service.test.ts  # 通知重試邏輯測試
```

**Structure Decision**: 延續 001-hr-course-mgmt 的 Next.js 全端架構，新增 `(employee)` 與 `(manager)` 路由群組；將 enrollment 模組放置於 `src/lib/enrollments/`，與既有 `src/lib/courses/` 並行但不耦合。
