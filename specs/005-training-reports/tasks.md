# Tasks: 訓練報表與統計

**Input**: Design documents from `/specs/005-training-reports/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api-routes.md ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Tests included per Constitution IV（業務邏輯層 MUST 有單元測試）

---

## Phase 1: Setup（共用基礎設施）

**Purpose**: 建立所有 User Story 共用的驗證 schema、middleware 與導覽設定

- [X] T001 建立 `app/src/lib/reports/validations.ts`：定義 `yearSchema`（預設當前年份）、`employeeSearchSchema`（search?: string, employeeId?: string）、`paginationSchema`（page, pageSize 上限 50）
- [X] T002 [P] 在 `app/src/middleware.ts` 新增 `/reports` 至 `isHRRoute` 判斷，並在 `matcher` 加入 `/reports/:path*`
- [X] T003 [P] 在 `app/src/app/(hr)/layout.tsx` 新增「訓練報表」導覽連結指向 `/reports`

---

## Phase 2: Foundational（測試架構）

**Purpose**: 建立 service 測試檔案骨架，所有 US 的測試函式均寫入同一個測試檔

**⚠️ CRITICAL**: 所有 service 實作須有對應單元測試（Constitution IV）

- [X] T004 建立 `app/tests/unit/reports/service.test.ts`：設定 `mockPrisma`（vi.hoisted，mock prisma.employee、prisma.employeeTrainingRecord、prisma.courseEnrollment、prisma.course）；vi.mock '@/lib/prisma'

**Checkpoint**: Foundation ready — US1～US4 可依序實作

---

## Phase 3: User Story 1 - 年度訓練達標率總覽 (Priority: P1) 🎯 MVP

**Goal**: HR 選擇年度，查看全公司達標率、已完訓人數、未完訓人數

**Independent Test**: HR 選擇 2025 年度，頁面顯示正確達標率與人數分佈，頁面可獨立運作。

- [X] T005 [US1] 在 `app/src/lib/reports/service.ts` 實作 `getComplianceOverview(year: number)`：`prisma.employee.count({ isActive: true })`、`prisma.employeeTrainingRecord.count({ year, employee: { isActive: true } })`，計算 complianceRate（0 除數保護）
- [X] T006 [P] [US1] 在 `app/tests/unit/reports/service.test.ts` 新增 `describe('getComplianceOverview')` 測試：(1) 正常計算達標率 (2) 無訓練紀錄時達標率為 0 (3) 無在職員工時回傳 0 不拋錯
- [X] T007 [US1] 建立 `app/src/app/api/hr/reports/compliance/route.ts`：GET handler，用 `yearSchema` 解析 searchParams，呼叫 `getComplianceOverview`，回傳 JSON
- [X] T008 [US1] 建立 `app/src/app/(hr)/reports/compliance/page.tsx`：Server Component，讀取 searchParams.year（預設當前年），呼叫 `getComplianceOverview`，顯示達標率卡片、已完訓/未完訓人數、年度切換連結

**Checkpoint**: US1 完整可獨立運作——達標率總覽頁可展示

---

## Phase 4: User Story 2 - 部門訓練統計 (Priority: P2)

**Goal**: HR 查看各部門的員工人數、完訓人數、達標率，可按達標率排序

**Independent Test**: HR 查看部門統計，技術部（8/10）和業務部（10/15）數字正確。

- [X] T009 [US2] 在 `app/src/lib/reports/service.ts` 新增 `getDepartmentStats(year: number)`：單一 `prisma.employee.findMany({ where: { isActive: true }, select: { department: true, trainingRecords: { where: { year } } } })`，TypeScript 記憶體分組，空 department 歸類為「未分配」，按 complianceRate 降序排序
- [X] T010 [P] [US2] 在 `app/tests/unit/reports/service.test.ts` 新增 `describe('getDepartmentStats')` 測試：(1) 多部門正確分組與比例計算 (2) 無完訓員工的部門顯示 0% 不隱藏 (3) 未設定部門員工歸類為「未分配」
- [X] T011 [US2] 建立 `app/src/app/api/hr/reports/departments/route.ts`：GET handler，呼叫 `getDepartmentStats(year)`，回傳 `{ year, departments }` JSON
- [X] T012 [US2] 建立 `app/src/app/(hr)/reports/departments/page.tsx`：Server Component，顯示部門統計表格（部門名稱、員工數、完訓數、達標率%），支援年度切換

**Checkpoint**: US2 完整可獨立運作——部門統計頁可展示

---

## Phase 5: User Story 3 - 員工訓練歷程查詢 (Priority: P3)

**Goal**: HR 搜尋員工姓名，點選後查看其完整歷年訓練歷程

**Independent Test**: HR 搜尋「陳」，列出匹配員工，點擊後顯示其所有完訓課程記錄。

- [X] T013 [US3] 在 `app/src/lib/reports/service.ts` 新增 `searchEmployees(search: string)` 與 `getEmployeeTrainingHistory(employeeId: string)`：searchEmployees 用 `prisma.employee.findMany({ where: { name: { contains: search } }, take: 50 })`；getEmployeeTrainingHistory 用 `Promise.all` 平行查詢員工資料、COMPLETED enrollments（include session.course，orderBy startDate desc）、所有 yearSummaries
- [X] T014 [P] [US3] 在 `app/tests/unit/reports/service.test.ts` 新增 `describe('getEmployeeTrainingHistory')` 測試：(1) 正確回傳多筆歷程並按年度降序 (2) 無歷程員工回傳空陣列不拋錯
- [X] T015 [US3] 建立 `app/src/app/api/hr/reports/employees/route.ts`：GET handler，若有 `employeeId` 呼叫 `getEmployeeTrainingHistory`，若有 `search` 呼叫 `searchEmployees`，回傳 `{ mode, ... }` JSON
- [X] T016 [US3] 建立 `app/src/app/(hr)/reports/employees/page.tsx`：Server Component，搜尋欄位（Client Component 包裹 form）+ 搜尋結果員工列表 + 若有 `employeeId` searchParam 則顯示訓練歷程表格（課程名稱、年度、狀態、學分/時數）

**Checkpoint**: US3 完整可獨立運作——員工歷程查詢可展示

---

## Phase 6: User Story 4 - 課程完訓率分析 (Priority: P4)

**Goal**: HR 查看各課程的報名人數、完訓人數、完訓率，支援年度篩選與分頁

**Independent Test**: HR 查看課程分析，法治課程（20 人報名、15 人完訓）顯示 75%。

- [X] T017 [US4] 在 `app/src/lib/reports/service.ts` 新增 `getCourseStats(year: number, page: number, pageSize: number)`：查 `prisma.course.findMany` 條件為 sessions 有該年度開課，include sessions（year 篩選）include enrollments（select status），skip/take 分頁，聚合每門課 totalEnrolled / completed / completionRate
- [X] T018 [P] [US4] 在 `app/tests/unit/reports/service.test.ts` 新增 `describe('getCourseStats')` 測試：(1) 正確計算完訓率（20 人、15 完訓 → 75%）(2) 無報名時 completionRate=0 不除零錯誤 (3) 分頁參數正確帶入 skip/take
- [X] T019 [US4] 建立 `app/src/app/api/hr/reports/courses/route.ts`：GET handler，解析 year/page/pageSize，呼叫 `getCourseStats`，回傳含 pagination 的 JSON
- [X] T020 [US4] 建立 `app/src/app/(hr)/reports/courses/page.tsx`：Server Component，顯示課程完訓率表格（課程名稱、報名數、完訓數、完訓率%），支援年度切換、分頁控制

**Checkpoint**: US4 完整可獨立運作——課程完訓率頁可展示

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 報表中心入口頁、整合驗收

- [X] T021 建立 `app/src/app/(hr)/reports/page.tsx`：報表中心 hub，顯示 4 個報表卡片連結（年度達標率、部門統計、員工查詢、課程分析），含各自的簡短說明
- [X] T022 執行 `quickstart.md` 6 步驟端對端驗證（需要 PostgreSQL 環境）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無前置，T002/T003 可並行於 T001 之後
- **Foundational (Phase 2)**: 依賴 Phase 1 完成（需要 validations.ts 存在）
- **User Stories (Phase 3-6)**: 依賴 Phase 1+2；各 US 間相互獨立，可並行
- **Polish (Phase 7)**: 依賴所有 US 完成

### User Story Dependencies

- **US1 (P1)**: 依賴 Phase 1+2，無 US 間依賴
- **US2 (P2)**: 依賴 Phase 1+2，無 US 間依賴
- **US3 (P3)**: 依賴 Phase 1+2，無 US 間依賴
- **US4 (P4)**: 依賴 Phase 1+2，無 US 間依賴

### Within Each User Story

- service 實作（T005/T009/T013/T017）→ API route → 頁面
- 單元測試（T006/T010/T014/T018）可與 API route 實作並行（標記 [P]）

### Parallel Opportunities

- T002, T003 可並行（不同檔案）
- 每個 US 的測試任務（T006/T010/T014/T018）可與 API route 並行寫入
- US1～US4 各 Phase 完成後可並行推進（各自獨立檔案）

---

## Implementation Strategy

### MVP First（僅 US1）

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational
3. 完成 Phase 3: US1（達標率總覽）
4. **STOP and VALIDATE**: 驗證達標率頁面正確運作
5. 繼續 US2 → US3 → US4

### Incremental Delivery

1. Phase 1+2 → 基礎就緒
2. Phase 3 (US1) → 達標率 MVP，可展示
3. Phase 4 (US2) → 部門統計
4. Phase 5 (US3) → 員工歷程查詢
5. Phase 6 (US4) → 課程完訓率
6. Phase 7 → Hub + 驗收

---

## Notes

- [P] tasks = 不同檔案，無依賴關係，可並行
- 所有 service 函式集中於 `app/src/lib/reports/service.ts`，逐步累加
- 測試集中於 `app/tests/unit/reports/service.test.ts`，各 describe 獨立
- T022 需要 PostgreSQL，若無環境可跳過（不影響其他 tasks 完成）
