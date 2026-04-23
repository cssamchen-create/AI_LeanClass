# Research: 課程出席確認與結案流程

**Feature**: 003-course-completion
**Date**: 2026-04-22

---

## Decision 1: 結案狀態機設計（EnrollmentStatus 擴充）

**Decision**: 在既有 `EnrollmentStatus` enum 新增 8 個狀態，完整描述結案流程的每個步驟。

新增狀態：
- `ATTENDED`：HR 確認出席
- `ABSENT`：HR 確認缺席
- `PENDING_REFLECTION`：待員工填寫心得（僅心得必填且非集團內課程）
- `REFLECTION_RETURNED`：心得被 HR 退回，待重新填寫
- `PENDING_QUIZ`：待員工完成測驗（僅需測驗的課程）
- `QUIZ_GRADING`：測驗已提交，含簡答題待 HR 評分
- `PENDING_HR_CLOSE`：所有步驟完成，待 HR 執行結案
- `COMPLETED`：已結案

**狀態轉換路徑**：
```
CONFIRMED
  → ATTENDED (HR 確認出席)
  → ABSENT (HR 確認缺席，終止)

ATTENDED
  [集團內課程]          → PENDING_HR_CLOSE
  [心得必填]            → PENDING_REFLECTION
  [心得非必填+需測驗]    → PENDING_QUIZ
  [心得非必填+無測驗]    → PENDING_HR_CLOSE

PENDING_REFLECTION
  → REFLECTION_RETURNED (HR 退回)
  → [需測驗] PENDING_QUIZ
  → [無測驗] PENDING_HR_CLOSE

REFLECTION_RETURNED → PENDING_REFLECTION (員工重新填寫)

PENDING_QUIZ
  → QUIZ_GRADING (含簡答題)
  → PENDING_HR_CLOSE (純選擇題，全自動評分)

QUIZ_GRADING → PENDING_HR_CLOSE (HR 評分完成)

PENDING_HR_CLOSE → COMPLETED (HR 結案)
```

**Rationale**: 每個狀態對應明確的操作主體（員工/HR）與前提條件，避免在代碼中處理隱式跳躍邏輯。狀態名稱自文件化，便於 debug 與 audit。

**Alternatives considered**:
- 分開的 CompletionStatus 表：增加 JOIN 複雜度，與現有申請狀態難以整合查詢
- 使用 flag 欄位（如 `attendanceConfirmed`, `reflectionSubmitted`）：難以用單一查詢篩選「待處理」清單

---

## Decision 2: 測驗資料模型（Quiz → QuizQuestion → QuizAttempt → QuizAnswer）

**Decision**: 四層結構，Quiz 對應課程（一對一），QuizQuestion 存題目與配分，QuizAttempt 存每次作答記錄，QuizAnswer 存每題答案與得分。

- `QuizQuestion.type`：`MULTIPLE_CHOICE` | `ESSAY`
- `QuizQuestion.options`：JSON 陣列 `[{text, isCorrect}]`（僅 MULTIPLE_CHOICE）
- `QuizAttempt`：一位員工可有多筆（重考），結案以最新一筆為準
- `QuizAnswer.score`：選擇題提交時立即計算，簡答題為 null 直到 HR 評分

**Rationale**: 分層結構支援重考、歷史記錄保存（Constitution V：永久保存），且 QuizAttempt 可加 `attemptNumber` 欄位顯示第幾次作答。QuizAnswer 與 QuizQuestion 分離，便於未來題庫擴充。

**Alternatives considered**:
- 將 options 與 answer 合並存一個 JSON：難以個別評分與統計正確率

---

## Decision 3: 心得（Reflection）模型設計

**Decision**: 獨立 `CourseReflection` 表，與 `CourseEnrollment` 一對一關聯。

欄位設計：
- `content`：心得內文（非空白）
- `submittedAt`：送出時間
- `returnedAt` / `returnNote`：HR 退回的時間與原因（可 null）
- `isLocked`：Boolean，送出後設為 true，HR 退回後設回 false 直到重新提交

**Rationale**: 與申請紀錄分離，心得內容不污染 enrollment 表；退回機制透過 returnedAt 是否為 null 判斷，不需額外 status 欄位（enrollment 狀態已追蹤）。

**Alternatives considered**:
- 直接在 CourseEnrollment 加 `reflectionContent` 欄位：長文字影響主表查詢效能

---

## Decision 4: 訓練紀錄累計（EmployeeTrainingRecord）

**Decision**: 使用 `EmployeeTrainingRecord` 按年度彙整，結案時 upsert（年份 + 員工 composite unique key）。

- `totalHours`：該年所有課程時數累計（含新人訓練）
- `annualHours`：年度訓練時數（排除 `isNewHireTraining=true` 的課程）
- `totalCredits`：學分累計
- 年度以自然年（1/1–12/31）計算，取梯次 `startDate` 的年份

**Rationale**: upsert 設計避免重算全部歷史記錄；分開 `totalHours` 與 `annualHours` 讓報表篩選更直觀，不需在查詢時動態過濾課程類別。

**Alternatives considered**:
- 每次查詢動態 SUM：效能可接受，但隨資料增長線性變慢
- 每筆 CompletionLog 累加：需處理取消結案後的回滾邏輯

---

## Decision 5: 測驗作答草稿（Browser-side 暫存）

**Decision**: 測驗進行中的未提交答案使用 `localStorage` 在瀏覽器端暫存（key = `quiz-draft-{enrollmentId}`），非資料庫存儲。

**Rationale**: 降低後端複雜度；作答草稿屬於暫時狀態，非業務記錄，不需永久保存（Constitution V 的永久保存原則適用於「已提交」記錄）；網路恢復後自動讀取繼續作答。

**Alternatives considered**:
- 後端 QuizDraft 表：增加 API 呼叫次數與表格複雜度，對低頻功能過度設計
- sessionStorage：頁面關閉後遺失，使用者體驗較差

---

## Decision 6: Quiz 設定時機（屬於 001 延伸）

**Decision**: Quiz 的題目建立（HR 建立課程時設定測驗題庫）在本 Feature 範圍內實作，但 UI 整合至 HR 的課程詳細管理頁面（非新增獨立頁面）。

**Rationale**: spec.md 假設「測驗題庫由 HR 在課程建立時設定」，但 001-hr-course-mgmt 尚未實作此功能。本 Feature 需補齊 HR 端的測驗題目管理（新增/編輯題目），才能讓結案測驗流程完整。
