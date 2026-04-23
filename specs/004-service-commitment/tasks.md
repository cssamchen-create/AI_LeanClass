# Tasks: 服務承諾管理

**Input**: Design documents from `/specs/004-service-commitment/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api-routes.md ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Tests are included per constitution IV（業務邏輯層 MUST 有單元測試）

---

## Phase 1: Setup (Schema 擴充)

**Purpose**: 擴充 Prisma schema 以支援服務承諾資料模型

- [X] T001 擴充 `app/prisma/schema.prisma`：新增 `CommitmentStatus` enum（PENDING_SIGNATURE, ACTIVE, EXPIRED, VOIDED, COMPENSATION_NOTED）
- [X] T002 擴充 `app/prisma/schema.prisma`：在 `EnrollmentStatus` enum 新增 `PENDING_COMMITMENT`（位於 PENDING_HR 與 CONFIRMED 之間）
- [X] T003 擴充 `app/prisma/schema.prisma`：在 `NotificationEventType` enum 新增 5 個值（COMMITMENT_SIGNATURE_REQUIRED, COMMITMENT_SIGNED, COMMITMENT_SIGNATURE_EXPIRED, COMMITMENT_EXPIRING_SOON, COMMITMENT_COMPENSATION）
- [X] T004 擴充 `app/prisma/schema.prisma`：在 `Course` 模型新增 `requiresCommitment Boolean @default(false)`、`commitmentMonths Int?`、`commitmentFee Decimal? @db.Decimal(10, 2)` 及 `commitmentRecords CommitmentRecord[]` 關聯
- [X] T005 擴充 `app/prisma/schema.prisma`：在 `Employee` 模型新增 `resignedAt DateTime?` 及 `commitmentRecords CommitmentRecord[]` 關聯
- [X] T006 擴充 `app/prisma/schema.prisma`：新增 `CommitmentRecord` 模型（含 enrollmentId @unique, courseId, employeeId, status, signatureDeadline, signedAt?, commitmentMonths, commitmentFee, commitmentExpiresAt?, compensationAmount?, compensationNote?, compensationAt?）；在 `CourseEnrollment` 新增 `commitmentRecord CommitmentRecord?` 關聯
- [ ] T007 執行 migration：`npx prisma migrate dev --name add-service-commitment` 並驗證 schema 正確

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 共用型別、驗證 schema、通知 builder，所有 US 均依賴

**⚠️ CRITICAL**: 所有 User Story 的 service 實作必須等此 Phase 完成

- [X] T008 [P] 在 `app/src/types/index.ts` 新增服務承諾相關型別：`CommitmentRecord`、`CommitmentStatus`、`CommitmentRecordWithDetails`（含 employee、course、enrollment 關聯）
- [X] T009 [P] 建立 `app/src/lib/commitments/validations.ts`：定義 Zod schemas：`commitmentCourseSchema`（requiresCommitment, commitmentMonths 1-120, commitmentFee ≥ 0）、`resignSchema`（resignedAt: ISO date string）
- [X] T010 [P] 在 `app/src/lib/enrollments/notification-service.ts` 擴充通知 builder：新增 `buildCommitmentSignatureRequiredNotification`、`buildCommitmentSignedNotification`、`buildCommitmentSignatureExpiredNotification`、`buildCommitmentExpiringSoonNotification`、`buildCommitmentCompensationNotification` 五個 builder 函式
- [X] T011 建立 `app/src/lib/commitments/actions.ts`（Server Actions 空殼，各 US 實作過程中補齊）

**Checkpoint**: Foundation ready — US1～US5 可並行開始實作

---

## Phase 3: User Story 1 - HR 設定課程服務承諾條款 (Priority: P1) 🎯 MVP

**Goal**: HR 可為課程啟用服務承諾，設定留任年限與費用金額

**Independent Test**: HR 進入課程編輯頁，勾選服務承諾並填入 24 個月 / 30,000 元，儲存後課程詳情頁顯示「服務承諾：24 個月 / 30,000 元」。

### Implementation

- [X] T012 [US1] 修改 `app/src/app/(hr)/courses/[id]/edit/EditCourseForm.tsx`：新增服務承諾 toggle（requiresCommitment）、留任年限輸入（commitmentMonths，1-120）、費用輸入（commitmentFee，≥ 0）；啟用時年限/費用為必填；驗證錯誤即時顯示
- [X] T013 [US1] 確認 `app/src/app/api/courses/[id]/route.ts` PUT handler 能接受並儲存 `requiresCommitment`、`commitmentMonths`、`commitmentFee`（現有 route 需確認是否需更新，若有則修改）
- [X] T014 [US1] 修改 `app/src/app/(hr)/courses/[id]/page.tsx`：在課程資訊區塊顯示服務承諾條款（若 requiresCommitment=true，顯示年限與費用）

**Checkpoint**: HR 可完整設定課程承諾條款，課程詳情頁正確顯示

---

## Phase 4: User Story 2 - 員工簽署服務承諾書 (Priority: P1)

**Goal**: HR 核准後若課程有服務承諾，員工收到通知並可在 48 小時內簽署；逾期自動取消

**Independent Test**: 員工進入 PENDING_COMMITMENT 狀態的申請，可看到承諾書全文（含賠償試算），點擊「確認簽署」後申請狀態變為 CONFIRMED。

### Implementation

- [X] T015 [US2] 建立 `app/src/lib/commitments/service.ts`：實作 `signCommitment(enrollmentId, employeeId)` — 驗證狀態為 PENDING_COMMITMENT、CommitmentRecord.status 為 PENDING_SIGNATURE 且未超過 signatureDeadline；更新 signedAt、commitmentExpiresAt（signedAt + commitmentMonths）、status→ACTIVE；enrollment status→CONFIRMED；發送簽署成功通知
- [X] T016 [US2] 修改 `app/src/lib/enrollments/service.ts` 中的 `approveByHR` 函式：核准後檢查 `session.course.requiresCommitment`；若 true → status 設為 `PENDING_COMMITMENT`，建立 `CommitmentRecord`（signatureDeadline = now + 48h，commitmentMonths/commitmentFee 從 course 複製快照），發送待簽署通知；否則沿用原 CONFIRMED 邏輯
- [X] T017 [US2] 建立 `app/src/app/api/enrollments/[id]/commitment/route.ts`：GET 取得承諾書詳情（驗證本人、回傳 CommitmentRecord 含賠償試算表 compensationSchedule）
- [X] T018 [US2] 建立 `app/src/app/api/enrollments/[id]/commitment/sign/route.ts`：POST 簽署承諾書（驗證本人、呼叫 signCommitment）
- [X] T019 [US2] 建立 `app/src/app/(employee)/enrollments/[id]/commitment/page.tsx`：顯示承諾書全文（課程名稱、費用、留任年限、賠償試算表）、簽署期限倒數、「確認簽署」按鈕；若已簽署顯示簽署時間與承諾到期日
- [X] T020 [US2] 擴充 `app/src/app/(employee)/enrollments/page.tsx`：新增 STATUS_LABELS/COLORS 中 `PENDING_COMMITMENT: '待簽署承諾書'`；對 PENDING_COMMITMENT 狀態申請顯示「簽署承諾書」行動連結
- [X] T021 [US2] 在 `app/src/lib/commitments/actions.ts` 新增 `signCommitmentAction(enrollmentId)` Server Action
- [X] T022 [US2] 在 `app/src/lib/commitments/service.ts` 新增 `processExpiredCommitments()` — 查詢 signatureDeadline < now() 且 status=PENDING_SIGNATURE 的記錄，批次更新為 VOIDED、enrollment→CANCELLED，發送逾期通知
- [X] T023 [US2] 建立 `app/src/app/api/cron/commitment-expiry/route.ts`：POST 呼叫 processExpiredCommitments（驗證 CRON_SECRET header）
- [X] T024 [US2] 在 `app/vercel.json` 新增 cron job：`{ "path": "/api/cron/commitment-expiry", "schedule": "0 * * * *" }`
- [X] T025 [US2] 建立 `app/tests/unit/commitments/service.test.ts`：測試 signCommitment（正常簽署後狀態正確）；測試超過 signatureDeadline 拋出錯誤；測試 processExpiredCommitments 批次取消邏輯

**Checkpoint**: 員工可完整執行簽署流程；48h 逾期自動取消正確運作

---

## Phase 5: User Story 3 - HR 查看承諾書總覽與即將到期清單 (Priority: P2)

**Goal**: HR 可查看全公司承諾書狀態，並篩選 30 天內到期的清單

**Independent Test**: HR 進入承諾書管理頁，可看到全公司 ACTIVE 承諾書清單；切換「即將到期（30 天內）」篩選後，只顯示到期日在 30 天內的記錄。

### Implementation

- [X] T026 [P] [US3] 建立 `app/src/app/api/hr/commitments/route.ts`：GET 查詢全公司承諾書（支援 status 多選篩選、expiring=30 篩選、employeeId 篩選、分頁；回傳含 employee/course 資訊及 daysUntilExpiry）
- [X] T027 [P] [US3] 建立 `app/src/app/api/hr/commitments/[id]/route.ts`：GET 取得單筆承諾書詳情（含完整賠償說明）
- [X] T028 [US3] 建立 `app/src/app/(hr)/commitments/page.tsx`：顯示承諾書清單（含狀態標籤色彩、到期日）；提供狀態篩選 tabs（全部 / 生效中 / 即將到期 / 已到期）；「即將到期」tab 預設顯示 30 天內到期記錄；每筆可點擊查看詳情
- [X] T029 [US3] 修改 `app/src/app/(hr)/layout.tsx`：在導航列新增「服務承諾」連結（指向 /commitments）

**Checkpoint**: HR 可完整查看承諾書總覽與篩選

---

## Phase 6: User Story 4 - 員工離職賠償計算與通知 (Priority: P2)

**Goal**: HR 標記員工離職時，系統顯示賠償試算並記錄結果

**Independent Test**: HR 在員工詳情頁標記離職，系統顯示「此員工有 1 筆服務承諾書，應賠償金額：XX,XXX 元（計算依據：30,000 × 18/24）」。

### Implementation

- [X] T030 [US4] 在 `app/src/lib/commitments/service.ts` 新增 `resignEmployee(employeeId, resignedAt, hrId)` — 驗證員工存在且未已離職；查詢所有 ACTIVE CommitmentRecord；計算賠償（Decimal: feeAmount × remainingMonths / commitmentMonths，ROUND_HALF_UP；課程尚未開始=全額；若已到期=0）；更新 Employee（isActive=false, resignedAt）、CommitmentRecord（status→COMPENSATION_NOTED, compensationAmount, compensationNote）；發送賠償通知給 HR
- [X] T031 [US4] 建立 `app/src/app/api/hr/employees/[id]/resign/route.ts`：POST 標記員工離職（驗證 HR 角色、呼叫 resignEmployee、回傳完整賠償計算結果）
- [X] T032 [US4] 建立 `app/src/app/(hr)/employees/[id]/page.tsx`：員工詳情頁，顯示基本資訊；若員工已離職顯示離職日與賠償記錄；若員工在職且有 ACTIVE 承諾書，顯示承諾書清單；提供「標記離職」按鈕（含離職日期輸入與賠償試算確認對話框）
- [X] T033 [US4] 在 `app/src/lib/commitments/actions.ts` 新增 `resignEmployeeAction(employeeId, resignedAt)` Server Action
- [X] T034 [US4] 建立 `app/tests/unit/commitments/compensation.test.ts`：測試賠償計算（一般比例計算）；測試課程尚未開始全額賠償；測試承諾期已屆滿不賠償；測試多筆承諾書分別計算

**Checkpoint**: HR 可標記離職並取得正確賠償計算結果

---

## Phase 7: User Story 5 - 每月自動提醒即將到期承諾書 (Priority: P3)

**Goal**: 系統每月 1 日自動發送「即將到期 30 天內」的承諾書彙整通知給 HR

**Independent Test**: 觸發 /api/cron/commitment-monthly-reminder，HR 收到包含即將到期員工清單的通知。

### Implementation

- [X] T035 [US5] 在 `app/src/lib/commitments/service.ts` 新增 `sendMonthlyCommitmentReminder(hrId)` — 查詢 commitmentExpiresAt BETWEEN now() AND now()+30天 且 status=ACTIVE 的記錄；若無記錄則不發送；有記錄則發送彙整通知（含員工清單）給所有 HR 帳號
- [X] T036 [US5] 建立 `app/src/app/api/cron/commitment-monthly-reminder/route.ts`：POST 呼叫 sendMonthlyCommitmentReminder（驗證 CRON_SECRET header；查詢所有 HR 帳號 ID 並批次發送）
- [X] T037 [US5] 在 `app/vercel.json` 新增 cron job：`{ "path": "/api/cron/commitment-monthly-reminder", "schedule": "0 1 1 * *" }`

**Checkpoint**: 月度提醒排程正確觸發，HR 收到到期清單通知

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 路由保護、狀態顯示一致性、端對端驗證

- [X] T038 [P] 在 `app/src/middleware.ts` 新增路由保護：`/commitments/:path*` 加入 isHRRoute；`/employees/:path*` 確認已包含（已在現有中間件）；確認 `/api/hr/commitments`、`/api/hr/employees/[id]/resign` 涵蓋於 `/api/hr/:path*`
- [X] T039 [P] 擴充 `app/src/app/(employee)/enrollments/page.tsx` STATUS_LABELS：確認 `PENDING_COMMITMENT` 有對應的色彩（`bg-orange-100 text-orange-800`）
- [X] T040 在 `app/src/app/(hr)/enrollments/page.tsx` 新增 PENDING_COMMITMENT 狀態處理：若申請狀態為 PENDING_COMMITMENT，顯示「待簽署承諾書」標籤（HR 端僅顯示狀態，無需操作）
- [ ] T041 執行 quickstart.md 8 步驟端對端驗證（Step 1–8 全部通過）（需 PostgreSQL）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 無依賴，立即開始
- **Phase 2 (Foundational)**: 依賴 Phase 1（schema 必須先 migrate）
- **Phase 3 (US1)**: 依賴 Phase 2
- **Phase 4 (US2)**: 依賴 Phase 2（核心流程；修改 approveByHR 需確認 US1 中的 course fields）
- **Phase 5 (US3)**: 依賴 Phase 2（可與 US2 並行）
- **Phase 6 (US4)**: 依賴 Phase 4（簽署後才有 ACTIVE CommitmentRecord）
- **Phase 7 (US5)**: 依賴 Phase 4（需有 ACTIVE CommitmentRecord 資料）
- **Phase 8 (Polish)**: 依賴所有 US Phase 完成

### User Story Dependencies

- **US1 (P1)**: Phase 2 完成後即可開始（課程設定獨立）
- **US2 (P1)**: 需要 US1 課程欄位存在（commitmentMonths/commitmentFee）；依賴 Phase 2
- **US3 (P2)**: 依賴 Phase 2，可與 US2 並行
- **US4 (P2)**: 依賴 US2（需有已簽署的 CommitmentRecord）
- **US5 (P3)**: 依賴 US2（需有 ACTIVE CommitmentRecord）

### Parallel Opportunities

- T008、T009、T010 可並行（Phase 2）
- T026、T027 可並行（US3 API routes）
- T038、T039 可並行（Phase 8）

---

## Parallel Example: User Story 2（核心流程）

```bash
# T015 完成後，並行：
Task: "建立 GET /api/enrollments/[id]/commitment route.ts (T017)"
Task: "建立 POST /api/enrollments/[id]/commitment/sign route.ts (T018)"
Task: "建立 (employee)/enrollments/[id]/commitment/page.tsx (T019)"

# T022 完成後：
Task: "建立 /api/cron/commitment-expiry/route.ts (T023)"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. 完成 Phase 1：Schema 擴充與 Migration
2. 完成 Phase 2：共用型別、驗證、通知 builders
3. 完成 Phase 3 (US1)：HR 設定課程承諾條款
4. 完成 Phase 4 (US2)：員工簽署流程（含 48h 逾期 cron）
5. **STOP & VALIDATE**: 完整報名→簽署承諾書→確認報名流程可運作

### Incremental Delivery

1. Setup + Foundational → Schema + 共用邏輯就緒
2. US1 (課程設定) + US2 (簽署流程) → 核心承諾書閉環 (MVP)
3. US3 (HR 總覽) → HR 可監控全公司狀態
4. US4 (離職賠償) → 離職時自動計算
5. US5 (月度提醒) + Polish → 自動化通知與端對端驗證

---

## Notes

- T007 與 T041 需要 PostgreSQL 連線，本地無 DB 時標記為 pending（同前三個 feature pattern）
- `resignEmployee` 的賠償計算邏輯 MUST 有 Vitest 覆蓋（見 T034）
- `signCommitment` 的狀態推進邏輯 MUST 有 Vitest 覆蓋（見 T025）
- CommitmentRecord 的 commitmentMonths/commitmentFee 在建立時從 Course 複製（快照），防止後續課程條款變更影響已簽署記錄
- Decimal 計算使用 `@prisma/client/runtime/library` Decimal（與 training-record-service 一致）
- [P] tasks = 不同檔案，無未完成的前置依賴
