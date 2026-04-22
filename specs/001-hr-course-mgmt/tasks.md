---

description: "Task list template for feature implementation"
---

# Tasks: HR 課程管理

**Input**: Design documents from `/specs/001-hr-course-mgmt/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api-routes.md ✅

**Tests**: 業務邏輯層（service.ts）需有單元測試，UI 元件測試為選擇性。

**Organization**: 任務依 User Story 分組，每個 Story 可獨立實作與測試。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行執行（不同檔案，無依賴）
- **[Story]**: 對應的 User Story（US1、US2、US3、US4）

---

## Phase 1: Setup（共用基礎設施）

**Purpose**: 專案初始化與基本結構建立

- [ ] T001 初始化 Next.js 14 專案（TypeScript strict mode）在專案根目錄
- [ ] T002 安裝核心依賴：prisma、@prisma/client、next-auth、zod、react-hook-form、@hookform/resolvers
- [ ] T003 [P] 設定 Tailwind CSS 設定檔 tailwind.config.ts
- [ ] T004 [P] 設定 TypeScript 設定檔 tsconfig.json（strict: true）
- [ ] T005 [P] 設定 Vitest 設定檔 vitest.config.ts 與 tests/ 目錄結構
- [ ] T006 設定 .env.local 環境變數範本（DATABASE_URL、NEXTAUTH_SECRET、LDAP_URI 等）

---

## Phase 2: Foundational（阻擋所有 User Story 的前置條件）

**Purpose**: 資料庫 Schema、認證、共用中介層

**⚠️ CRITICAL**: 所有 User Story 實作前必須完成此階段

- [ ] T007 建立 Prisma schema prisma/schema.prisma（CourseCategory、Course、CourseSession 三個 model）
- [ ] T008 執行初始 migration 並驗證 Schema 正確
- [ ] T009 建立 prisma/seed.ts 植入初始課程類別資料（法治、經營管理、年度特訓、新人教育訓練等）
- [ ] T010 [P] 設定 NextAuth.js v5 認證 src/auth.ts（LDAP Credentials provider）
- [ ] T011 [P] 建立 Next.js middleware src/middleware.ts（保護 HR 路由，驗證 session 與角色）
- [ ] T012 建立 Prisma client 單例 src/lib/prisma.ts
- [ ] T013 [P] 建立共用 Zod 型別定義 src/types/index.ts（Course、Session、Category 型別）
- [ ] T014 [P] 建立 HR Layout src/app/(hr)/layout.tsx（導覽列、角色驗證）

**Checkpoint**: 資料庫連線正常、SSO 登入可用、HR 路由受保護 → 開始實作 User Story

---

## Phase 3: User Story 1 - 建立新課程（Priority: P1）🎯 MVP

**Goal**: HR 可建立課程並在列表中看到

**Independent Test**: HR 建立一門課程後，可在課程列表頁看到該課程並點入查看詳細資訊。

### 單元測試 for US1

- [ ] T015 [P] [US1] 建立 tests/unit/courses/service.test.ts（createCourse 業務邏輯測試：必填驗證、預設值帶入、狀態初始值）
- [ ] T016 [P] [US1] 建立 tests/unit/courses/validations.test.ts（Zod schema 驗證邏輯測試）

### 實作 User Story 1

- [ ] T017 [P] [US1] 建立 Zod 驗證 schema src/lib/courses/validations.ts（createCourseSchema）
- [ ] T018 [US1] 建立業務邏輯 src/lib/courses/service.ts（createCourse：套用 defaultHours、設定初始 status）
- [ ] T019 [US1] 建立 GET /api/course-categories Route Handler src/app/api/course-categories/route.ts
- [ ] T020 [US1] 建立 POST /api/courses Route Handler src/app/api/courses/route.ts（呼叫 service.createCourse）
- [ ] T021 [US1] 建立 GET /api/courses Route Handler src/app/api/courses/route.ts（列表查詢，含分頁）
- [ ] T022 [US1] 建立 GET /api/courses/[id] Route Handler src/app/api/courses/[id]/route.ts
- [ ] T023 [US1] 建立課程列表頁 src/app/(hr)/courses/page.tsx（Server Component，顯示課程清單）
- [ ] T024 [US1] 建立建立課程頁 src/app/(hr)/courses/new/page.tsx（Client Component，表單）
- [ ] T025 [US1] 建立課程詳細頁 src/app/(hr)/courses/[id]/page.tsx（顯示課程資訊與梯次列表）
- [ ] T026 [US1] 建立 Server Action src/lib/courses/actions.ts（createCourseAction）

**Checkpoint**: US1 完成 — HR 可建立課程並查看列表，可獨立 Demo

---

## Phase 4: User Story 2 - 編輯與管理既有課程（Priority: P2）

**Goal**: HR 可編輯課程資訊並下架課程

**Independent Test**: HR 修改課程時數後，詳細頁顯示更新數值；有報名記錄的課程下架後狀態變為 INACTIVE。

### 單元測試 for US2

- [ ] T027 [P] [US2] 擴充 tests/unit/courses/service.test.ts（updateCourse、changeStatus 邏輯：有報名記錄不可刪除、狀態轉換規則）

### 實作 User Story 2

- [ ] T028 [P] [US2] 擴充 src/lib/courses/validations.ts（updateCourseSchema、statusChangeSchema）
- [ ] T029 [US2] 擴充 src/lib/courses/service.ts（updateCourse、changeCourseStatus：驗證狀態轉換合法性）
- [ ] T030 [US2] 建立 PUT /api/courses/[id] Route Handler src/app/api/courses/[id]/route.ts
- [ ] T031 [US2] 建立 PATCH /api/courses/[id]/status Route Handler src/app/api/courses/[id]/status/route.ts
- [ ] T032 [US2] 建立編輯課程頁 src/app/(hr)/courses/[id]/edit/page.tsx（預填現有資料的表單）
- [ ] T033 [US2] 擴充 Server Action src/lib/courses/actions.ts（updateCourseAction、changeCourseStatusAction）
- [ ] T034 [US2] 更新課程詳細頁 src/app/(hr)/courses/[id]/page.tsx（加入編輯、上架/下架按鈕）

**Checkpoint**: US1 + US2 均可獨立運作 — 課程 CRUD 完整

---

## Phase 5: User Story 3 - 建立與管理課程梯次（Priority: P2）

**Goal**: HR 可為課程建立梯次，並可取消梯次

**Independent Test**: HR 建立梯次後，員工端（mock）可見該梯次；取消梯次後所有申請退回（mock 通知驗證）。

### 單元測試 for US3

- [ ] T035 [P] [US3] 建立 tests/unit/courses/session-service.test.ts（createSession 驗證、cancelSession 副作用邏輯）

### 實作 User Story 3

- [ ] T036 [P] [US3] 擴充 src/lib/courses/validations.ts（createSessionSchema）
- [ ] T037 [US3] 建立梯次業務邏輯 src/lib/courses/session-service.ts（createSession、cancelSession：觸發通知佔位）
- [ ] T038 [US3] 建立 POST /api/courses/[id]/sessions Route Handler src/app/api/courses/[id]/sessions/route.ts
- [ ] T039 [US3] 建立 PUT /api/courses/[id]/sessions/[sessionId] Route Handler
- [ ] T040 [US3] 建立 PATCH /api/courses/[id]/sessions/[sessionId]/cancel Route Handler src/app/api/courses/[id]/sessions/[sessionId]/cancel/route.ts
- [ ] T041 [US3] 建立建立梯次頁 src/app/(hr)/courses/[id]/sessions/new/page.tsx
- [ ] T042 [US3] 擴充 Server Action src/lib/courses/actions.ts（createSessionAction、cancelSessionAction）
- [ ] T043 [US3] 更新課程詳細頁 src/app/(hr)/courses/[id]/page.tsx（梯次列表含取消按鈕）

**Checkpoint**: US1 + US2 + US3 均可獨立運作 — 梯次管理完整

---

## Phase 6: User Story 4 - 課程分類管理（Priority: P3）

**Goal**: HR 可管理課程類別，年度特訓類別自動帶入 12 小時

**Independent Test**: 建立課程時選擇「年度特訓」，measurementValue 自動帶入 12。

### 實作 User Story 4

- [ ] T044 [P] [US4] 建立課程類別管理頁 src/app/(hr)/course-categories/page.tsx（列表 + 建立）
- [ ] T045 [US4] 建立類別 CRUD Server Actions src/lib/courses/category-actions.ts
- [ ] T046 [US4] 擴充建立課程表單 src/app/(hr)/courses/new/page.tsx（選類別時自動帶入 defaultHours）
- [ ] T047 [US4] 擴充 GET /api/course-categories Route Handler（支援包含 defaultHours 欄位）

**Checkpoint**: 全部 User Story 可獨立運作

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: 品質提升與跨 Story 問題

- [ ] T048 [P] 加入全域錯誤邊界 src/app/error.tsx 與 src/app/not-found.tsx
- [ ] T049 [P] 加入 Loading UI src/app/(hr)/courses/loading.tsx
- [ ] T050 錯誤訊息國際化（繁體中文）統一至 src/lib/messages.ts
- [ ] T051 [P] 執行 quickstart.md 驗證步驟，確認整體流程正常
- [ ] T052 [P] 補齊 API 端點的 TypeScript 型別（禁止 any）
- [ ] T053 執行 `npm run test` 確認所有單元測試通過

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup（Phase 1）**: 無依賴，立即開始
- **Foundational（Phase 2）**: 依賴 Setup 完成 → 阻擋所有 User Story
- **US1（Phase 3）**: 依賴 Foundational 完成
- **US2（Phase 4）**: 依賴 Foundational + US1 的 service.ts、API Routes
- **US3（Phase 5）**: 依賴 Foundational + US1 的課程資料
- **US4（Phase 6）**: 依賴 Foundational + US1 的類別選單
- **Polish（Phase N）**: 依賴所有 Story 完成

### User Story Dependencies

- **US1（P1）**: Foundational 後可開始，無 Story 間依賴
- **US2（P2）**: 依賴 US1 的 service.ts（擴充），可視為同一模組延伸
- **US3（P2）**: 依賴 US1 的 Course 資料，可與 US2 平行
- **US4（P3）**: 依賴 US1 的類別選單，最後實作

### Within Each User Story

- 單元測試 MUST 先寫並確認 FAIL，再實作
- Zod schema → service.ts → Route Handler → Server Action → Page
- 每個 Story 完成後執行 quickstart.md 對應步驟驗證

### Parallel Opportunities

- Phase 1：T003、T004、T005 可平行
- Phase 2：T010、T011、T012、T013、T014 可平行
- 每個 Story 的測試任務 [P] 可平行撰寫

---

## Parallel Example: User Story 1

```bash
# 平行撰寫測試（先確認 FAIL）：
Task: "tests/unit/courses/service.test.ts（T015）"
Task: "tests/unit/courses/validations.test.ts（T016）"

# 平行建立不相依的 schema 與類別 API：
Task: "src/lib/courses/validations.ts（T017）"
Task: "src/app/api/course-categories/route.ts（T019）"
```

---

## Implementation Strategy

### MVP First（User Story 1 Only）

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（阻擋所有 Story）
3. 完成 Phase 3: User Story 1
4. **STOP and VALIDATE**: 執行 quickstart.md 步驟 1-5
5. Demo：HR 建立課程 + 查看列表

### Incremental Delivery

1. Setup + Foundational → 基礎就緒
2. US1 → 課程 CRUD 基本功能（MVP！）
3. US2 → 加入編輯與狀態管理
4. US3 → 加入梯次管理
5. US4 → 加入類別管理
6. Polish → 品質完善

---

## Notes

- [P] 任務 = 不同檔案，無依賴，可平行
- [Story] 標籤對應 spec.md 的 User Story，確保可追溯性
- 測試 MUST 先寫並確認 FAIL 再實作
- 每個 Story 完成後執行 Checkpoint 驗證
- 避免：模糊任務、跨 Story 強依賴、破壞既有 Story 的修改
