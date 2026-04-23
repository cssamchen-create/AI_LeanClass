# Implementation Plan: 課程出席確認與結案流程

**Branch**: `003-course-completion` | **Date**: 2026-04-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-course-completion/spec.md`

## Summary

HR 課程結束後確認員工出席，已出席員工依課程設定依序完成心得填寫（HR 可退回重填）、線上測驗（選擇題自動評分 + 簡答題 HR 人工評分）；所有步驟完成後 HR 執行結案，系統累加員工年度訓練時數與學分。技術方向延續 002 的狀態機設計，在既有 `EnrollmentStatus` 新增 8 個結案相關狀態，並引入 Quiz / QuizAttempt / CourseReflection / EmployeeTrainingRecord 四個新模型。

## Technical Context

**Language/Version**: TypeScript（strict mode），Next.js 14+ App Router
**Primary Dependencies**: Prisma（擴充既有 schema），Zod（驗證），Nodemailer（通知延伸），Tailwind CSS
**Storage**: PostgreSQL 15+（新增 migration，沿用既有 DB）
**Testing**: Vitest（狀態機轉換、評分計算、訓練時數累計邏輯）
**Target Platform**: Vercel（Production），本地開發環境
**Project Type**: Web application（全端，前後端同一 Next.js 專案）
**Performance Goals**: 出席確認（20 人批次）< 3 秒；選擇題自動評分 < 1 秒；結案後訓練紀錄 < 10 秒更新
**Constraints**: 所有作答記錄永久保存；禁止 `any`；strict mode；測驗草稿用 localStorage
**Scale/Scope**: 與 002 相同規模；每梯次最多數十人；測驗最多 50 題

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 狀態 | 說明 |
|------|------|------|
| I. Next.js 全端單一專案 | ✅ 通過 | 延續 001/002 架構，新增 completion 模組至同一 Next.js 專案 |
| II. 角色驅動存取控制 | ✅ 通過 | HR 端：出席確認/評分/結案；員工端：心得填寫/測驗；Server 端驗證 |
| III. 分階段交付 | ✅ 通過 | 結案流程屬 Phase 1 核心功能（Constitution §III Phase 1：測驗（選擇題）） |
| IV. 品質門檻 | ✅ 通過 | Vitest 覆蓋狀態機、評分計算、時數累計；PR checklist |
| V. 資料永久保存 | ✅ 通過 | 所有 QuizAttempt（含重考）永久保存；訓練紀錄只累加不刪除 |

**Post-Design Re-check**: ✅ 全部通過，無複雜度違規

## Project Structure

### Documentation (this feature)

```text
specs/003-course-completion/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api-routes.md    # Phase 1 output
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
app/
├── prisma/
│   ├── schema.prisma             # 擴充：新增 8 個 EnrollmentStatus；新增 Quiz/QuizQuestion/
│   │                             #         QuizAttempt/QuizAnswer/CourseReflection/
│   │                             #         EmployeeTrainingRecord 模型；Course 新增 2 欄位
│   └── migrations/               # 新增 migration
└── src/
    ├── app/
    │   ├── (employee)/
    │   │   ├── enrollments/
    │   │   │   └── [id]/
    │   │   │       ├── reflection/
    │   │   │       │   └── page.tsx      # 心得填寫頁
    │   │   │       └── quiz/
    │   │   │           └── page.tsx      # 測驗作答頁
    │   │   └── training-records/
    │   │       └── page.tsx              # 個人訓練紀錄頁
    │   ├── (hr)/
    │   │   ├── sessions/
    │   │   │   └── [id]/
    │   │   │       └── attendance/
    │   │   │           └── page.tsx      # HR 出席確認頁
    │   │   ├── enrollments/
    │   │   │   └── [id]/
    │   │   │       ├── reflection/
    │   │   │       │   └── page.tsx      # HR 查看/退回心得頁
    │   │   │       └── quiz-grading/
    │   │   │           └── page.tsx      # HR 簡答題評分頁
    │   │   └── courses/
    │   │       └── [id]/
    │   │           └── quiz/
    │   │               └── page.tsx      # HR 測驗題庫管理頁
    │   └── api/
    │       ├── hr/
    │       │   ├── sessions/[sessionId]/attendance/
    │       │   │   └── route.ts          # POST 出席確認
    │       │   ├── enrollments/[id]/
    │       │   │   ├── reflection/return/route.ts    # POST 退回心得
    │       │   │   └── close/route.ts                # POST 結案
    │       │   ├── quiz-attempts/[attemptId]/
    │       │   │   └── grade/route.ts    # POST/PATCH 簡答題評分
    │       │   ├── enrollments/[id]/retry-quiz/
    │       │   │   └── route.ts          # POST 允許重考
    │       │   └── courses/[id]/quiz/
    │       │       └── route.ts          # GET/POST/PUT 測驗題庫管理
    │       └── enrollments/
    │           ├── [id]/reflection/
    │           │   └── route.ts          # GET/POST 員工心得
    │           └── [id]/quiz/
    │               ├── route.ts          # GET 取得測驗題目
    │               └── submit/route.ts   # POST 提交答案
    │       └── employee/
    │           └── training-records/
    │               └── route.ts          # GET 個人訓練紀錄
    ├── lib/
    │   └── completions/
    │       ├── service.ts                # 出席確認、結案核心邏輯
    │       ├── quiz-service.ts           # 測驗提交、自動評分、人工評分
    │       ├── reflection-service.ts     # 心得提交、退回、重填
    │       ├── training-record-service.ts # 訓練時數/學分累計
    │       ├── notification-builders.ts   # 新增通知類型 builder
    │       ├── actions.ts                # Server Actions
    │       └── validations.ts            # Zod schemas
    └── tests/
        └── unit/
            └── completions/
                ├── service.test.ts
                ├── quiz-service.test.ts
                └── training-record-service.test.ts
```
