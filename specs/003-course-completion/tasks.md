# Tasks: 課程出席確認與結案流程

**Input**: Design documents from `/specs/003-course-completion/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api-routes.md ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Tests are included per constitution IV（業務邏輯層 MUST 有單元測試）

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extend Prisma schema and run migration for completion models

- [X] T001 擴充 `app/prisma/schema.prisma`：在 `EnrollmentStatus` enum 新增 8 個結案狀態（ATTENDED, ABSENT, PENDING_REFLECTION, REFLECTION_RETURNED, PENDING_QUIZ, QUIZ_GRADING, PENDING_HR_CLOSE, COMPLETED）
- [X] T002 擴充 `app/prisma/schema.prisma`：新增 `QuestionType` enum（MULTIPLE_CHOICE, ESSAY）
- [X] T003 擴充 `app/prisma/schema.prisma`：在 `Course` 模型新增 `requiresQuiz Boolean @default(false)` 與 `isNewHireTraining Boolean @default(false)` 欄位，並加入 `quiz Quiz?` 關聯
- [X] T004 擴充 `app/prisma/schema.prisma`：新增 `Quiz`、`QuizQuestion`、`QuizAttempt`、`QuizAnswer` 四個模型（含關聯，詳見 data-model.md）
- [X] T005 擴充 `app/prisma/schema.prisma`：新增 `CourseReflection` 模型（含 `isLocked`、`returnedAt`、`returnNote` 欄位）
- [X] T006 擴充 `app/prisma/schema.prisma`：新增 `EmployeeTrainingRecord` 模型（`@@unique([employeeId, year])`）；在 `Employee` 加入 `trainingRecords` 關聯；在 `CourseEnrollment` 加入 `reflection` 與 `quizAttempts` 關聯
- [ ] T007 執行 migration：`npx prisma migrate dev --name add-completion-models` 並驗證 schema 正確

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 共用驗證 schema、型別、通知 builder，所有 US 均依賴

**⚠️ CRITICAL**: 所有 User Story 的 service 實作必須等此 Phase 完成

- [X] T008 [P] 在 `app/src/types/index.ts` 新增 completion 相關型別：`CourseReflection`、`QuizAttempt`、`QuizAnswer`、`QuizQuestion`、`Quiz`、`EmployeeTrainingRecord`、`CompletionWithDetails`、`QuizAttemptWithDetails`
- [X] T009 [P] 建立 `app/src/lib/completions/validations.ts`：定義 Zod schemas：`attendanceSchema`（批次出席），`reflectionSchema`（心得內容），`gradeSchema`（評分），`quizSubmitSchema`（測驗答案提交），`quizCreateSchema`（題庫建立）
- [X] T010 [P] 在 `app/src/lib/enrollments/notification-service.ts` 擴充通知 builder：新增 `buildAttendanceConfirmedNotification`、`buildReflectionReturnedNotification`、`buildQuizGradedNotification`、`buildCourseCompletedNotification` 四個 builder 函式
- [X] T011 建立 `app/src/lib/completions/actions.ts`（空殼 Server Actions 檔案，各 US 實作過程中補齊）

**Checkpoint**: Foundation ready — US1～US5 可並行開始實作

---

## Phase 3: User Story 1 - HR 確認員工出席 (Priority: P1) 🎯

**Goal**: HR 可批次標記梯次員工出席/缺席，系統自動推進申請狀態

**Independent Test**: HR 登入後，進入梯次出席確認頁，勾選出席員工送出後，出席員工狀態變 ATTENDED，缺席員工狀態變 ABSENT，員工端可見狀態更新。

### Implementation

- [X] T012 [US1] 建立 `app/src/lib/completions/service.ts`：實作 `confirmAttendance(sessionId, attendances, hrId)` — 批次更新 CourseEnrollment 狀態（CONFIRMED→ATTENDED 或 ABSENT），並依課程屬性自動推進狀態（集團內→PENDING_HR_CLOSE；心得必填→PENDING_REFLECTION；否則→依 requiresQuiz 判斷），每筆發送通知
- [X] T013 [US1] 建立 `app/src/app/api/hr/sessions/[sessionId]/attendance/route.ts`：POST 處理批次出席確認（驗證 HR 角色、呼叫 `confirmAttendance`）
- [X] T014 [US1] 建立 `app/src/app/(hr)/sessions/[id]/attendance/page.tsx`：HR 出席確認頁面，列出該梯次 CONFIRMED 員工清單，提供勾選出席/缺席並送出的表單
- [X] T015 [US1] 在 `app/src/app/(hr)/layout.tsx` 新增「課程梯次」導航連結（指向 sessions 列表）
- [X] T016 [US1] 在 `app/src/lib/completions/actions.ts` 新增 `confirmAttendanceAction` Server Action
- [X] T017 [US1] 建立 `app/tests/unit/completions/service.test.ts`：測試 `confirmAttendance` — 出席自動狀態推進（集團內、心得必填、無心得無測驗三個路徑）；缺席不推進；非 HR 呼叫拋出錯誤

**Checkpoint**: HR 可完整執行出席確認，員工端申請狀態正確更新

---

## Phase 4: User Story 2 - 員工填寫心得 (Priority: P1)

**Goal**: 員工可填寫、送出心得；HR 可查看並退回要求重填

**Independent Test**: 員工進入 PENDING_REFLECTION 的申請詳情頁，可看到心得填寫表單，送出後狀態推進。對 PENDING_REFLECTION 之外的申請，不顯示填寫入口。

### Implementation

- [X] T018 [US2] 建立 `app/src/lib/completions/reflection-service.ts`：實作 `submitReflection(enrollmentId, employeeId, content)`（驗證狀態、建立 CourseReflection、isLocked=true、推進狀態）、`returnReflection(enrollmentId, hrId, returnNote)`（更新 returnedAt/returnNote、isLocked=false、狀態→REFLECTION_RETURNED、通知員工）
- [X] T019 [US2] 建立 `app/src/app/api/enrollments/[id]/reflection/route.ts`：GET 取得自己的心得；POST 送出心得（驗證本人、呼叫 `submitReflection`）
- [X] T020 [US2] 建立 `app/src/app/api/hr/enrollments/[id]/reflection/return/route.ts`：POST 退回心得（驗證 HR 角色、呼叫 `returnReflection`）
- [X] T021 [US2] 建立 `app/src/app/(employee)/enrollments/[id]/reflection/page.tsx`：員工心得填寫頁（顯示申請資訊、心得表單；若 `isLocked=true` 顯示已送出狀態；若 `returnNote` 不為 null 顯示退回原因）
- [X] T022 [US2] 建立 `app/src/app/(hr)/enrollments/[id]/reflection/page.tsx`：HR 查看心得頁（顯示心得內容、退回按鈕與退回原因輸入框）
- [X] T023 [US2] 在 `app/src/lib/completions/actions.ts` 新增 `submitReflectionAction`、`returnReflectionAction`
- [X] T024 [US2] 在 `app/tests/unit/completions/service.test.ts` 新增 `reflection-service` 測試：送出心得後狀態正確推進（有測驗→PENDING_QUIZ；無測驗→PENDING_HR_CLOSE）；重覆送出已鎖定心得拋出錯誤；退回後 isLocked=false

**Checkpoint**: 員工可填寫心得，HR 可退回，重填後狀態正確推進

---

## Phase 5: User Story 4 - HR 結案核准與訓練紀錄更新 (Priority: P1)

**Goal**: HR 對 PENDING_HR_CLOSE 的申請執行結案，系統更新員工訓練時數/學分

**Independent Test**: HR 對一筆 PENDING_HR_CLOSE 申請點擊結案後，狀態→COMPLETED，員工訓練紀錄年度時數正確累加，並收到完訓通知。

### Implementation

- [X] T025 [US4] 建立 `app/src/lib/completions/training-record-service.ts`：實作 `updateTrainingRecord(employeeId, sessionId)` — 依課程時數/學分 upsert `EmployeeTrainingRecord`（年度為 session.startDate 年份；`isNewHireTraining=true` 時只加 totalHours，不加 annualHours）
- [X] T026 [US4] 在 `app/src/lib/completions/service.ts` 新增 `closeEnrollment(enrollmentId, hrId)` — 驗證狀態為 PENDING_HR_CLOSE、更新 status→COMPLETED、呼叫 `updateTrainingRecord`、發送完訓通知
- [X] T027 [US4] 建立 `app/src/app/api/hr/enrollments/[id]/close/route.ts`：POST 結案（驗證 HR 角色、呼叫 `closeEnrollment`）
- [X] T028 [US4] 擴充 `app/src/app/(hr)/enrollments/page.tsx`：在現有列表新增「待結案」分頁或篩選，顯示 PENDING_HR_CLOSE 的申請；每筆提供「結案」按鈕（含確認對話框）
- [X] T029 [US4] 建立 `app/tests/unit/completions/training-record-service.test.ts`：測試時數累計（一般課程加 annualHours；新人訓練不加 annualHours；學分與時數各自累計；同年度多次結案正確累加）

**Checkpoint**: HR 可完整執行結案，訓練紀錄正確更新

---

## Phase 6: User Story 3 - 課程測驗與成績評定 (Priority: P2)

**Goal**: 員工可完成線上測驗（選擇題自動評分 + 簡答題人工評分）；HR 可評分並決定是否允許重考

**Independent Test**: 員工進入 PENDING_QUIZ 的申請，可作答測驗並提交；選擇題立即顯示分數；若含簡答題，狀態→QUIZ_GRADING；HR 評分後狀態自動推進到 PENDING_HR_CLOSE。

### Implementation

- [X] T030 [US3] 建立 `app/src/lib/completions/quiz-service.ts`：實作以下函式：
  - `getQuizForEnrollment(enrollmentId, employeeId)` — 取得題目（不含正確答案）、目前作答次數
  - `submitQuiz(enrollmentId, employeeId, answers)` — 建立 QuizAttempt + QuizAnswer，選擇題自動評分（score = points 或 0），判斷是否含簡答題，推進狀態（QUIZ_GRADING 或 PENDING_HR_CLOSE）
  - `gradeEssayAnswers(attemptId, hrId, grades)` — 更新 QuizAnswer.score，評分完成後計算 totalScore、判定 passed，推進狀態
  - `allowRetry(enrollmentId, hrId)` — 重置為 PENDING_QUIZ（建立新 Attempt 時 attemptNumber 遞增）
- [X] T031 [US3] 建立 `app/src/app/api/enrollments/[id]/quiz/route.ts`：GET 取得測驗題目
- [X] T032 [US3] 建立 `app/src/app/api/enrollments/[id]/quiz/submit/route.ts`：POST 提交答案
- [X] T033 [US3] 建立 `app/src/app/api/hr/quiz-attempts/[attemptId]/grade/route.ts`：POST/PATCH 提交簡答題評分
- [X] T034 [US3] 建立 `app/src/app/api/hr/enrollments/[id]/retry-quiz/route.ts`：POST 允許重考
- [X] T035 [US3] 建立 `app/src/app/(employee)/enrollments/[id]/quiz/page.tsx`：員工測驗作答頁（顯示題目列表、選擇題 radio button、簡答題 textarea、本地草稿暫存於 localStorage key=`quiz-draft-{enrollmentId}`、提交按鈕）
- [X] T036 [US3] 建立 `app/src/app/(hr)/enrollments/[id]/quiz-grading/page.tsx`：HR 簡答題評分頁（顯示題目、員工答案、分數輸入框、評分備注；顯示目前總分進度）
- [X] T037 [US3] 在 `app/src/lib/completions/actions.ts` 新增 `submitQuizAction`、`gradeEssayAction`、`allowRetryAction`
- [X] T038 [US3] 在 `app/tests/unit/completions/quiz-service.test.ts` 建立測驗服務測試：選擇題自動評分正確計算；全選擇題通過→狀態推進 PENDING_HR_CLOSE；含簡答題→QUIZ_GRADING；HR 評分完成後計算 totalScore/passed；重考後 attemptNumber 正確遞增

**Checkpoint**: 完整測驗流程可運作（作答→評分→通過/重考）

---

## Phase 7: User Story 5 - 員工查看訓練紀錄 (Priority: P2)

**Goal**: 員工可在個人頁查看所有已結案課程與年度時數統計

**Independent Test**: 員工進入訓練紀錄頁，可見所有 COMPLETED 的申請資訊，年度累計時數正確（排除新人訓練）。

### Implementation

- [X] T039 [US5] 建立 `app/src/app/api/employee/training-records/route.ts`：GET 取得個人訓練紀錄（支援 `?year=2026` 篩選；回傳 summary + completions 列表，包含課程名稱、日期、時數、學分、測驗分數）
- [X] T040 [US5] 建立 `app/src/app/(employee)/training-records/page.tsx`：員工訓練紀錄頁（顯示年度時數 summary、已結案課程列表含測驗成績；提供年度切換 selector）
- [X] T041 [US5] 在 `app/src/app/(employee)/layout.tsx` 新增「訓練紀錄」導航連結

**Checkpoint**: 員工可查看完整訓練歷程

---

## Phase 8: HR 測驗題庫管理（US3 前置，擴充 001 Course 管理）

**Goal**: HR 可在課程詳細頁建立/編輯測驗題目，為員工作答做準備

**Note**: 此 Phase 可與 Phase 6 同步進行（不同檔案）

- [X] T042 [P] 建立 `app/src/lib/completions/quiz-management-service.ts`：實作 `getQuizByCourse(courseId)`、`createQuiz(courseId, hrId, { passingScore, questions })`、`updateQuiz(quizId, hrId, data)` — 驗證課程已有結案申請時不可修改題目內容
- [X] T043 [P] 建立 `app/src/app/api/hr/courses/[id]/quiz/route.ts`：GET 取得測驗設定；POST 建立測驗；PUT 更新測驗
- [X] T044 建立 `app/src/app/(hr)/courses/[id]/quiz/page.tsx`：HR 測驗題庫管理頁（顯示現有題目列表、新增/編輯題目表單、通過門檻設定）
- [X] T045 在 `app/src/app/(hr)/courses/[id]/page.tsx`（若存在）或新建頁面加入「管理測驗」連結，指向 quiz 管理頁

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: 串接通知、驗證邊界情況、執行端對端驗證

- [X] T046 [P] 在 `app/src/app/(employee)/enrollments/page.tsx` 擴充：在申請列表顯示結案相關狀態（ATTENDED、PENDING_REFLECTION、PENDING_QUIZ 等），並依狀態顯示對應行動連結（填寫心得/進入測驗）
- [X] T047 [P] 在 `app/src/app/(hr)/enrollments/page.tsx` 擴充：新增篩選 QUIZ_GRADING 的分頁，顯示待評分清單並連結至評分頁
- [X] T048 [P] 在 `app/src/middleware.ts` 新增路由保護：`/employee/training-records`（任何登入員工）、`/hr/sessions/*/attendance`（HR）、`/employee/enrollments/*/reflection`（本人）、`/employee/enrollments/*/quiz`（本人）
- [X] T049 驗證測驗評分邊界：分數超出配分、空白答案、未登入存取 quiz API — 確認均正確回傳 400/401/403
- [ ] T050 執行 quickstart.md 8 步驟端對端驗證（Step 1–8 全部通過）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 無依賴，立即開始
- **Phase 2 (Foundational)**: 依賴 Phase 1 完成（schema 必須先 migrate）
- **Phase 3 (US1)**: 依賴 Phase 2
- **Phase 4 (US2)**: 依賴 Phase 2（可與 US1 同步）
- **Phase 5 (US4)**: 依賴 Phase 2（結案 service 依賴 training-record-service）
- **Phase 6 (US3)**: 依賴 Phase 2
- **Phase 7 (US5)**: 依賴 Phase 5（訓練紀錄由結案產生）
- **Phase 8 (題庫管理)**: 依賴 Phase 2（可與 Phase 3-6 同步）
- **Phase 9 (Polish)**: 依賴所有 US Phase 完成

### User Story Dependencies

- **US1 (P1)**: Phase 2 完成後即可開始，無其他 US 依賴
- **US2 (P1)**: Phase 2 完成後即可開始，業務上在 US1 之後但程式碼獨立
- **US4 (P1)**: Phase 2 完成後即可開始，`training-record-service` 獨立
- **US3 (P2)**: Phase 2 完成後即可開始，quiz 邏輯獨立於 reflection
- **US5 (P2)**: 依賴 US4（結案後才有訓練紀錄資料）

### Parallel Opportunities

- T008、T009、T010 可並行（Phase 2）
- T012（service）、T013（API）、T014（page）可先實作 T012，再並行 T013/T014
- Phase 6 與 Phase 8 全程可並行（不同服務與頁面檔案）

---

## Parallel Example: User Story 3 (測驗)

```bash
# 並行：建立 quiz-service 的同時建立 quiz-management-service
Task: "實作 quiz-service.ts (T030)"
Task: "實作 quiz-management-service.ts (T042)"

# T030 完成後並行建立 API routes
Task: "建立 /api/enrollments/[id]/quiz/route.ts (T031)"
Task: "建立 /api/enrollments/[id]/quiz/submit/route.ts (T032)"
Task: "建立 /api/hr/quiz-attempts/[attemptId]/grade/route.ts (T033)"
Task: "建立 /api/hr/enrollments/[id]/retry-quiz/route.ts (T034)"
```

---

## Implementation Strategy

### MVP First (US1 + US4 Only)

1. 完成 Phase 1：Schema 擴充與 Migration
2. 完成 Phase 2：共用型別、驗證、通知 builders
3. 完成 Phase 3 (US1)：出席確認（最短路徑：集團內課程直接到 PENDING_HR_CLOSE）
4. 完成 Phase 5 (US4)：結案核准與訓練時數累計
5. **STOP & VALIDATE**: 集團內課程完整結案流程可運作

### Incremental Delivery

1. Setup + Foundational → Schema + 共用邏輯就緒
2. US1 (出席確認) + US4 (結案) → 集團內課程完整閉環 (MVP)
3. US2 (心得) → 一般課程可填寫心得後結案
4. US3 (測驗) + 題庫管理 → 需測驗的課程完整支援
5. US5 (訓練紀錄) + Polish → 員工可查看歷程、端對端驗證

---

## Notes

- T007 與 T050 需要 PostgreSQL 連線，本地無 DB 時標記為 pending（同 002 pattern）
- `quiz-service.ts` 的選擇題評分邏輯 MUST 有 Vitest 覆蓋（見 T038）
- `training-record-service.ts` 的時數累計邏輯 MUST 有 Vitest 覆蓋（見 T029）
- 所有 API routes MUST 在 Server 端驗證角色（不依賴 client-side 隱藏）
- 測驗草稿使用 `localStorage`，key = `quiz-draft-{enrollmentId}`（純前端，非業務邏輯）
- [P] tasks = 不同檔案，無未完成的前置依賴
