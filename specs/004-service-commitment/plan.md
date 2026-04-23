# Implementation Plan: 服務承諾管理

**Branch**: `004-service-commitment` | **Date**: 2026-04-23 | **Spec**: specs/004-service-commitment/spec.md

## Summary

為教育訓練系統新增服務承諾管理功能：HR 可為課程設定留任年限與費用；員工在 HR 核准後須於 48 小時內簽署承諾書才能確認報名；系統自動追蹤承諾期限、計算離職賠償金額，並提供 HR 月度到期提醒。

技術方案：擴充 `EnrollmentStatus`（新增 `PENDING_COMMITMENT`）、新增 `CommitmentRecord` 模型與 `CommitmentStatus` enum、修改現有 HR 核准流程、新增 2 個 Cron 排程。

## Technical Context

**Language/Version**: TypeScript strict mode, Next.js 14 App Router
**Primary Dependencies**: Prisma ORM, Zod validation, date-fns（已存在於 Next.js 依賴）
**Storage**: PostgreSQL（現有資料庫）
**Testing**: Vitest（現有設定）
**Target Platform**: Vercel（現有部署）
**Project Type**: Web application（全端 Next.js）
**Performance Goals**: 承諾書清單頁 < 3s（1,000 筆以上）
**Constraints**: Decimal 精度計算（使用 @prisma/client/runtime/library Decimal）
**Scale/Scope**: 與現有系統規模一致（~數百名員工）

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| I. 單一 Next.js 專案 | ✅ PASS | 無新增獨立服務 |
| II. 角色驅動存取控制 | ✅ PASS | 所有 API 在 Server 端驗證角色 |
| III. Phase-Based Delivery | ⚠️ 越界 | 服務承諾管理列於 Phase 2，見 Complexity Tracking |
| IV. 品質門檻 | ✅ PASS | 業務邏輯 MUST 有單元測試（賠償計算） |
| V. 資料永久保存 | ✅ PASS | CommitmentRecord 永久保存 |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Phase 2 功能提前至 Phase 1 後期實作 | 專案負責人明確要求，且服務承諾與報名流程深度耦合（PENDING_COMMITMENT 狀態嵌入現有 EnrollmentStatus 狀態機）。若延後，需重新修改已穩定的報名流程。 | 等待 Phase 2 會造成功能碎片化，報名確認邏輯需在兩個 Phase 中分別維護。 |

> **建議**: 下次修訂 Constitution 時，將服務承諾管理移至 Phase 1 後期或 Phase 1.5，反映實際交付順序。

## Project Structure

### Documentation (this feature)

```text
specs/004-service-commitment/
├── plan.md              ← 此文件
├── research.md          ← 技術決策記錄
├── data-model.md        ← 新 Schema、關聯、狀態機
├── quickstart.md        ← 8 步驟端對端驗證腳本
├── contracts/
│   └── api-routes.md    ← API 合約
└── tasks.md             ← /speckit.tasks 產生
```

### Source Code Changes

```text
app/prisma/
└── schema.prisma        ← 新增 CommitmentStatus enum、PENDING_COMMITMENT、5 個 NotificationEventType、
                            修改 Course/Employee/CourseEnrollment、新增 CommitmentRecord

app/src/
├── types/index.ts       ← 新增 CommitmentRecord、CommitmentStatus 型別

├── lib/commitments/
│   ├── service.ts       ← 主服務：signCommitment、resignEmployee（賠償計算）、
│   │                       processExpiredCommitments（cron 用）
│   ├── validations.ts   ← Zod schemas：commitmentCourseSchema、resignSchema
│   └── actions.ts       ← Server Actions：signCommitmentAction、resignEmployeeAction

├── lib/enrollments/
│   ├── service.ts       ← 修改 approveByHR：requiresCommitment 時 status → PENDING_COMMITMENT
│   └── notification-service.ts ← 新增 5 個通知 builder

├── app/
│   ├── (employee)/
│   │   └── enrollments/[id]/commitment/
│   │       └── page.tsx         ← 員工查看並簽署承諾書
│   │
│   ├── (hr)/
│   │   ├── commitments/
│   │   │   └── page.tsx         ← HR 全公司承諾書清單與篩選
│   │   └── employees/[id]/
│   │       └── page.tsx         ← 新增離職標記 Section（修改現有頁面）
│   │
│   └── api/
│       ├── enrollments/[id]/commitment/
│       │   ├── route.ts         ← GET 查看承諾書詳情
│       │   └── sign/route.ts    ← POST 簽署承諾書
│       ├── hr/commitments/
│       │   ├── route.ts         ← GET 全公司清單
│       │   └── [id]/route.ts    ← GET 單筆詳情
│       ├── hr/employees/[id]/
│       │   └── resign/route.ts  ← POST 標記離職
│       └── cron/
│           ├── commitment-expiry/route.ts          ← POST 每小時：48h 逾期取消
│           └── commitment-monthly-reminder/route.ts ← POST 月度提醒

app/tests/unit/commitments/
├── service.test.ts              ← 賠償計算邏輯、signCommitment 狀態推進
└── commitment-expiry.test.ts    ← processExpiredCommitments 邏輯
```

## Key Implementation Notes

1. **修改 approveEnrollmentByHRAction**（`lib/enrollments/actions.ts`）：
   - 原本：status → CONFIRMED
   - 修改後：先查詢 session.course.requiresCommitment；若 true → status → PENDING_COMMITMENT，同時建立 CommitmentRecord（signatureDeadline = now + 48h），發送簽署通知；否則沿用原邏輯。

2. **Decimal 計算**：賠償金額使用 Decimal（`@prisma/client/runtime/library`）計算，避免浮點誤差。

3. **員工申請頁面擴充**（`(employee)/enrollments/page.tsx`）：為 PENDING_COMMITMENT 狀態新增「簽署承諾書」連結（類似 PENDING_REFLECTION 的模式）。

4. **HR 課程編輯頁面**（現有 `(hr)/courses/[id]/edit/EditCourseForm.tsx`）：新增服務承諾 toggle + 年限/費用輸入欄位。

5. **vercel.json**：新增 2 個 cron jobs：
   - `commitment-expiry`：`"0 * * * *"`（每小時）
   - `commitment-monthly-reminder`：`"0 1 1 * *"`（每月 1 日 01:00 UTC）

6. **員工詳情頁**（`(hr)/employees/[id]/page.tsx`）：目前只有列表頁 `/employees`，需新增員工詳情頁並包含離職標記功能。
