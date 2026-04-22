# Implementation Plan: HR 課程管理

**Branch**: `001-hr-course-mgmt` | **Date**: 2026-04-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-hr-course-mgmt/spec.md`

## Summary

HR 可建立、編輯、管理課程與梯次。技術方向採用 Next.js App Router 全端架構，以 Prisma + PostgreSQL 作為資料層，Zod + React Hook Form 處理表單驗證，NextAuth.js 串接 AD/LDAP SSO 認證。

## Technical Context

**Language/Version**: TypeScript（strict mode），Next.js 14+ App Router
**Primary Dependencies**: Prisma（ORM），Zod（驗證），React Hook Form，NextAuth.js v5，Tailwind CSS
**Storage**: PostgreSQL 15+
**Testing**: Vitest（單元測試），Testing Library（選擇性元件測試）
**Target Platform**: Vercel（Production），本地開發環境
**Project Type**: Web application（全端，前後端同一 Next.js 專案）
**Performance Goals**: 課程建立流程 < 3 分鐘；課程列表搜尋結果 < 1 秒
**Constraints**: SSO 唯一登入；所有記錄永久保存；禁止 `any`；strict mode
**Scale/Scope**: HR 使用者（少量），課程數量預估數十至數百筆

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 狀態 | 說明 |
|------|------|------|
| I. Next.js 全端單一專案 | ✅ 通過 | 前後端同一專案，TypeScript strict，Tailwind |
| II. 角色驅動存取控制 | ✅ 通過 | HR 角色限定，Server 端驗證，SSO 登入 |
| III. 分階段交付 | ✅ 通過 | FR-010 知識庫整合為 Phase 3 預留欄位 |
| IV. 品質門檻 | ✅ 通過 | Vitest 覆蓋 service 層，PR checklist |
| V. 資料永久保存 | ✅ 通過 | Soft delete（status 欄位），梯次取消不刪除 |

**Post-Design Re-check**: ✅ 全部通過，無複雜度違規需記錄

## Project Structure

### Documentation (this feature)

```text
specs/001-hr-course-mgmt/
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
src/
├── app/
│   ├── (hr)/
│   │   └── courses/
│   │       ├── page.tsx              # 課程列表頁
│   │       ├── new/page.tsx          # 建立課程頁
│   │       └── [id]/
│   │           ├── page.tsx          # 課程詳細頁
│   │           ├── edit/page.tsx     # 編輯課程頁
│   │           └── sessions/
│   │               └── new/page.tsx  # 建立梯次頁
│   └── api/
│       ├── courses/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       ├── status/route.ts
│       │       └── sessions/
│       │           ├── route.ts
│       │           └── [sessionId]/
│       │               ├── route.ts
│       │               └── cancel/route.ts
│       └── course-categories/
│           └── route.ts
├── lib/
│   └── courses/
│       ├── actions.ts        # Server Actions（表單提交）
│       ├── service.ts        # 業務邏輯（單元測試覆蓋）
│       └── validations.ts    # Zod schemas
└── prisma/
    ├── schema.prisma
    └── seed.ts

tests/
└── unit/
    └── courses/
        ├── service.test.ts
        └── validations.test.ts
```

**Structure Decision**: Next.js App Router 全端單一專案，Route Groups 區分 HR 後台（`(hr)`）與 API Routes，業務邏輯集中於 `src/lib/courses/service.ts` 以便單元測試。

## Complexity Tracking

> 無 Constitution 違規，本表格留空。
