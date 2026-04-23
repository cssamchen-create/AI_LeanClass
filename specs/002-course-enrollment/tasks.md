---

description: "Task list template for feature implementation"
---

# Tasks: 員工課程申請與審核流程

**Input**: Design documents from `/specs/002-course-enrollment/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api-routes.md ✅

**Tests**: 業務邏輯層（service.ts、waitlist-service.ts、notification-service.ts）需有單元測試，UI 元件測試為選擇性。

**Organization**: 任務依 User Story 分組，每個 Story 可獨立實作與測試。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行執行（不同檔案，無依賴）
- **[Story]**: 對應的 User Story（US1–US5）

---

## Phase 1: Setup（共用基礎設施）

**Purpose**: 安裝新依賴、環境變數設定

- [X] T001 安裝 Nodemailer 依賴：`npm install nodemailer @types/nodemailer`（在 app/ 目錄）
- [X] T002 [P] 更新 app/.env.local 環境變數範本（新增 SMTP_HOST、SMTP_PORT、SMTP_USER、SMTP_PASS、SMTP_FROM、CRON_SECRET）
- [X] T003 [P] 建立 Vercel Cron Job 設定 app/vercel.json（定義 /api/cron/waitlist-expiry 與 /api/cron/notification-retry 排程）

---

## Phase 2: Foundational（阻擋所有 User Story 的前置條件）

**Purpose**: 資料庫 schema 擴充、Employee 實體、共用型別、通知 service 基礎

**⚠️ CRITICAL**: 所有 User Story 實作前必須完成此階段

- [X] T004 擴充 app/prisma/schema.prisma（新增 Employee、CourseEnrollment、WaitlistEntry、NotificationLog 模型與所有 Enum；在 CourseSession 加入 enrollments 與 waitlistEntries 關聯）
- [ ] T005 執行 migration：`npx prisma migrate dev --name add-enrollment-models` 並驗證 schema 正確
- [X] T006 更新 app/prisma/seed.ts（新增測試員工資料：employee、manager、hr 各一帳號，設定 managerId 關聯）
- [X] T007 [P] 擴充 app/src/types/index.ts（新增 CourseEnrollment、WaitlistEntry、NotificationLog、Employee 型別定義）
- [X] T008 [P] 建立 app/src/lib/enrollments/validations.ts（createEnrollmentSchema、rejectSchema、cron 相關 Zod schemas）
- [X] T009 [P] 建立 Email 通知基礎 app/src/lib/enrollments/notification-service.ts（Nodemailer 配置、sendEmail、重試邏輯 max 3 次 / 5-15-30 分鐘間隔、NotificationLog 寫入）
- [X] T010 [P] 建立單元測試 app/tests/unit/enrollments/notification-service.test.ts（重試邏輯、失敗記錄、SMTP 連線 mock）
- [X] T011 [P] 更新 app/src/middleware.ts（新增 /employee、/manager 路由保護；依 role 驗證存取權限）
- [X] T012 [P] 建立 Employee HR 管理頁 app/src/app/(hr)/employees/page.tsx（員工清單 + 建立員工表單，供 seed 資料外的手動新增）

**Checkpoint**: 資料庫 migration 正常、Employee 資料存在、Email 可發送（測試帳號）→ 開始實作 User Story

---

## Phase 3: User Story 1 - 員工瀏覽課程與送出報名申請（Priority: P1）🎯 MVP

**Goal**: 員工可瀏覽 ACTIVE 課程與 OPEN 梯次，送出報名申請；有名額進入審核流程，名額已滿進入等待名單

**Independent Test**: 員工送出報名後，「我的申請」清單出現狀態「待主管審核」的申請；名額已滿時，等待名單記錄建立，員工收到通知 Email，可獨立 Demo。

### 單元測試 for US1

- [X] T013 [P] [US1] 建立 app/tests/unit/enrollments/service.test.ts（createEnrollment 業務邏輯：名額驗證、重複申請防護、等待名單判斷、狀態初始值）

### 實作 User Story 1

- [X] T014 [P] [US1] 建立申請業務邏輯 app/src/lib/enrollments/service.ts（createEnrollment：驗證 session OPEN、名額判斷、transaction 建立 CourseEnrollment 或 WaitlistEntry、觸發通知）
- [X] T015 [US1] 建立 POST /api/enrollments Route Handler app/src/app/api/enrollments/route.ts（呼叫 service.createEnrollment，回傳 enrollment 或 waitlist 結果）
- [X] T016 [US1] 建立 GET /api/enrollments Route Handler（同檔 app/src/app/api/enrollments/route.ts，查詢當前員工的申請列表）
- [X] T017 [P] [US1] 建立課程瀏覽頁（員工視角）app/src/app/(employee)/courses/page.tsx（Server Component，列出 ACTIVE 課程與梯次，顯示剩餘名額與我的申請狀態）
- [X] T018 [US1] 建立報名確認頁 app/src/app/(employee)/courses/[id]/sessions/[sessionId]/enroll/page.tsx（Client Component，顯示梯次資訊與確認按鈕）
- [X] T019 [US1] 建立「我的申請」頁 app/src/app/(employee)/enrollments/page.tsx（Server Component，列出所有申請記錄與狀態）
- [X] T020 [US1] 建立 Server Action app/src/lib/enrollments/actions.ts（createEnrollmentAction）

**Checkpoint**: US1 完成 — 員工可報名課程，申請或等待名單記錄建立，Email 通知發出，可獨立 Demo

---

## Phase 4: User Story 2 - 主管線上審核（Priority: P1）

**Goal**: 主管可查看直屬部屬的待審核申請，選擇核准（流轉至 HR）或退回（含原因）

**Independent Test**: 主管核准後申請狀態變「待 HR 核准」，退回後狀態變「已退回」且員工收到含原因的 Email，可獨立 Demo。

### 單元測試 for US2

- [X] T021 [P] [US2] 擴充 app/tests/unit/enrollments/service.test.ts（approveByManager、rejectByManager 邏輯：直屬關係驗證、狀態轉換合法性、退回原因必填）

### 實作 User Story 2

- [X] T022 [P] [US2] 擴充 app/src/lib/enrollments/validations.ts（rejectSchema：note 必填非空）
- [X] T023 [US2] 擴充 app/src/lib/enrollments/service.ts（approveByManager、rejectByManager：驗證申請人為直屬部屬、狀態轉換、觸發 Email 通知）
- [X] T024 [US2] 建立 PATCH /api/manager/enrollments/[id]/approve Route Handler app/src/app/api/manager/enrollments/[id]/approve/route.ts
- [X] T025 [US2] 建立 PATCH /api/manager/enrollments/[id]/reject Route Handler app/src/app/api/manager/enrollments/[id]/reject/route.ts
- [X] T026 [US2] 建立 GET /api/manager/enrollments Route Handler app/src/app/api/manager/enrollments/route.ts（直屬部屬待審核清單）
- [X] T027 [US2] 建立主管待審核頁 app/src/app/(manager)/enrollments/page.tsx（Server Component，列出待審核申請，含核准/退回按鈕）
- [X] T028 [US2] 建立主管審核 Server Actions（approveEnrollmentAction、rejectEnrollmentAction）加至 app/src/lib/enrollments/actions.ts

**Checkpoint**: US1 + US2 均可獨立運作 — 完整的員工申請 → 主管審核流程

---

## Phase 5: User Story 3 - HR 最終核准（Priority: P2）

**Goal**: HR 可核准或退回「待 HR 核准」申請；核准後更新梯次報名人數，員工收到確認通知

**Independent Test**: HR 核准後申請狀態變「已確認」、`enrolledCount` 加一、員工收到「報名確認」Email；名額競爭情境下 HR 核准被拒，可獨立 Demo。

### 單元測試 for US3

- [X] T029 [P] [US3] 擴充 app/tests/unit/enrollments/service.test.ts（approveByHR：transaction 名額驗證、enrolledCount 原子更新；rejectByHR：原因必填）

### 實作 User Story 3

- [X] T030 [US3] 擴充 app/src/lib/enrollments/service.ts（approveByHR：Prisma transaction 驗證 enrolledCount < capacity → 更新 CONFIRMED + enrolledCount += 1；rejectByHR：狀態 REJECTED + hrNote）
- [X] T031 [US3] 建立 PATCH /api/hr/enrollments/[id]/approve Route Handler app/src/app/api/hr/enrollments/[id]/approve/route.ts
- [X] T032 [US3] 建立 PATCH /api/hr/enrollments/[id]/reject Route Handler app/src/app/api/hr/enrollments/[id]/reject/route.ts
- [X] T033 [US3] 建立 GET /api/hr/enrollments Route Handler app/src/app/api/hr/enrollments/route.ts（支援 courseId、sessionId、department 篩選）
- [X] T034 [US3] 建立 HR 核准清單頁 app/src/app/(hr)/enrollments/page.tsx（Server Component，列出待 HR 核准申請，含篩選器與核准/退回按鈕）
- [X] T035 [US3] 建立 HR 審核 Server Actions（approveEnrollmentByHRAction、rejectEnrollmentByHRAction）加至 app/src/lib/enrollments/actions.ts

**Checkpoint**: US1 + US2 + US3 均可獨立運作 — 完整三方審核流程

---

## Phase 6: User Story 4 - 等待名單管理（Priority: P2）

**Goal**: 名額釋出時自動通知等待清單第一位，48 小時內確認後申請進入審核；逾時自動遞補下一位

**Independent Test**: 已確認報名者取消後，等待名單第一位收到通知；確認後申請建立（mock 通知驗證）；逾時後遞補下一位，可獨立 Demo。

### 單元測試 for US4

- [X] T036 [P] [US4] 建立 app/tests/unit/enrollments/waitlist-service.test.ts（promoteWaitlist：FIFO 順序、48hr deadline 設定；expireWaitlistEntries：逾期失效 + 下一位遞補；confirmWaitlist：deadline 驗證、新 Enrollment 建立）

### 實作 User Story 4

- [X] T037 [US4] 建立等待名單業務邏輯 app/src/lib/enrollments/waitlist-service.ts（promoteNextWaitlistEntry：查詢最小 position 的 WAITING 條目、更新 PENDING_CONFIRMATION、設定 confirmDeadline = now() + 48h、觸發通知；expireWaitlistEntries：批次失效逾期條目、遞補下一位；confirmWaitlistEntry：驗證 deadline、建立新 CourseEnrollment）
- [X] T038 [US4] 建立 PATCH /api/waitlist/[entryId]/confirm Route Handler app/src/app/api/waitlist/[entryId]/confirm/route.ts（等待者確認遞補）
- [X] T039 [US4] 建立 POST /api/cron/waitlist-expiry Route Handler app/src/app/api/cron/waitlist-expiry/route.ts（驗證 CRON_SECRET；呼叫 waitlistService.expireWaitlistEntries）
- [X] T040 [US4] 擴充 app/src/lib/enrollments/service.ts（取消已確認報名時觸發 promoteNextWaitlistEntry；HR 核准後若有等待名單顯示提示）
- [X] T041 [US4] 建立「等待名單」頁面入口 app/src/app/(employee)/enrollments/page.tsx（在「我的申請」頁中加入等待名單區塊，顯示等待位置與狀態）

**Checkpoint**: US1–US4 均可獨立運作 — 等待名單自動遞補完整

---

## Phase 7: User Story 5 - 取消申請與通知（Priority: P3）

**Goal**: 員工可取消進行中申請；已確認報名需 HR 確認取消；取消後觸發等待名單遞補

**Independent Test**: 員工取消「待主管審核」申請後狀態變「已取消」，主管收到通知；HR 確認取消「已確認」報名後 enrolledCount 減一，等待名單觸發遞補，可獨立 Demo。

### 實作 User Story 5

- [X] T042 [US5] 擴充 app/src/lib/enrollments/service.ts（cancelEnrollment：允許 PENDING_MANAGER/PENDING_HR 直接取消；cancelConfirmedEnrollment：HR 確認後 CONFIRMED → CANCELLED + enrolledCount -= 1 + 觸發等待名單遞補）
- [X] T043 [US5] 建立 PATCH /api/enrollments/[id]/cancel Route Handler app/src/app/api/enrollments/[id]/cancel/route.ts（員工取消進行中申請）
- [X] T044 [US5] 建立 PATCH /api/hr/enrollments/[id]/cancel-confirmed Route Handler app/src/app/api/hr/enrollments/[id]/cancel-confirmed/route.ts（HR 確認取消已確認報名）
- [X] T045 [US5] 擴充「我的申請」頁 app/src/app/(employee)/enrollments/page.tsx（對 PENDING_MANAGER / PENDING_HR 申請顯示「取消申請」按鈕）
- [X] T046 [US5] 擴充 HR 核准清單頁 app/src/app/(hr)/enrollments/page.tsx（顯示員工取消請求，加入「確認取消」按鈕）
- [X] T047 [US5] 建立 cancelEnrollmentAction、cancelConfirmedEnrollmentAction 加至 app/src/lib/enrollments/actions.ts

**Checkpoint**: 全部 User Story 可獨立運作 — 完整申請生命週期管理

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: 通知重試 Cron、失敗清單 UI、型別安全、Loading UI、測試驗證

- [X] T048 建立 POST /api/cron/notification-retry Route Handler app/src/app/api/cron/notification-retry/route.ts（驗證 CRON_SECRET；查詢 status=FAILED retryCount<3 的記錄；重試發送；更新 NotificationLog）
- [X] T049 [P] 建立 GET /api/hr/notifications/failed Route Handler app/src/app/api/hr/notifications/failed/route.ts（HR 查看發送失敗清單）
- [X] T050 [P] 建立 POST /api/hr/notifications/[id]/resend Route Handler app/src/app/api/hr/notifications/[id]/resend/route.ts（HR 手動補發）
- [X] T051 [P] 建立 HR 通知失敗清單頁 app/src/app/(hr)/notifications/page.tsx（顯示失敗記錄，含手動補發按鈕）
- [X] T052 [P] 加入 Loading UI app/src/app/(employee)/courses/loading.tsx、app/src/app/(manager)/enrollments/loading.tsx
- [X] T053 [P] 補齊所有 Route Handler 的 TypeScript 型別（禁止 any）
- [X] T054 執行 `npm run test` 確認所有單元測試通過（目標：申請狀態機、等待名單、通知重試共 3 個測試檔案）
- [ ] T055 執行 quickstart.md 6 步驟端對端驗證（Step 1–6 全部通過）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup（Phase 1）**: 無依賴，立即開始
- **Foundational（Phase 2）**: 依賴 Setup 完成 → 阻擋所有 User Story
- **US1（Phase 3）**: 依賴 Foundational 完成
- **US2（Phase 4）**: 依賴 Foundational + US1 的 service.ts（擴充）
- **US3（Phase 5）**: 依賴 Foundational + US1 的 Enrollment 資料 + US2 的審核流程
- **US4（Phase 6）**: 依賴 Foundational + US1 的 WaitlistEntry 建立
- **US5（Phase 7）**: 依賴 US1（取消進行中申請）+ US3（取消已確認報名）+ US4（觸發遞補）
- **Polish（Phase N）**: 依賴所有 Story 完成

### User Story Dependencies

- **US1（P1）**: Foundational 後可開始，無 Story 間依賴
- **US2（P1）**: 依賴 US1 的 service.ts（擴充同一檔案）
- **US3（P2）**: 依賴 US1+US2 的完整審核流程
- **US4（P2）**: 依賴 US1 的 WaitlistEntry；可與 US2/US3 平行開發
- **US5（P3）**: 依賴 US1+US3+US4；最後實作

### Within Each User Story

- 單元測試 MUST 先寫並確認 FAIL，再實作
- Zod schema → service.ts → Route Handler → Server Action → Page
- 每個 Story 完成後執行 quickstart.md 對應步驟驗證

### Parallel Opportunities

- Phase 1：T002、T003 可平行
- Phase 2：T007、T008、T009、T010、T011、T012 可平行（T006 需先完成 T004+T005）
- 各 Story 的單元測試任務 [P] 可平行撰寫

---

## Parallel Example: User Story 1

```bash
# 平行撰寫測試（先確認 FAIL）：
Task: "tests/unit/enrollments/service.test.ts（T013）"

# 平行建立不相依的業務邏輯與頁面：
Task: "src/lib/enrollments/service.ts（T014）"
Task: "src/app/(employee)/courses/page.tsx（T017）"
```

---

## Implementation Strategy

### MVP First（User Story 1 Only）

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（阻擋所有 Story）
3. 完成 Phase 3: User Story 1
4. **STOP and VALIDATE**: 執行 quickstart.md Step 1-4
5. Demo：員工報名課程 → 申請建立 → Email 通知主管

### Incremental Delivery

1. Setup + Foundational → 基礎就緒
2. US1 → 員工報名（MVP！）
3. US2 → 主管審核
4. US3 → HR 核准（完整三方流程）
5. US4 → 等待名單遞補
6. US5 → 取消流程
7. Polish → 通知重試 Cron、HR 補發 UI

---

## Notes

- [P] 任務 = 不同檔案，無依賴，可平行
- [Story] 標籤對應 spec.md 的 User Story，確保可追溯性
- 測試 MUST 先寫並確認 FAIL 再實作
- 每個 Story 完成後執行 Checkpoint 驗證
- 避免：模糊任務、跨 Story 強依賴、破壞既有 001-hr-course-mgmt 功能的修改
