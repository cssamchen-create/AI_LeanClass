# Quickstart: 課程出席確認與結案流程

**Feature**: 003-course-completion
**Date**: 2026-04-22

本文件提供端對端驗證步驟，確認結案流程的所有核心路徑正常運作。

---

## 前提條件

- 已執行 `npx prisma migrate dev --name add-completion-models`
- 資料庫已有種子資料（employee01 / manager01 / hr01）
- 至少有一個梯次處於 `CONFIRMED` 狀態的申請（由 002 流程建立）
- 環境變數 `CRON_SECRET` 已設定

---

## Step 1: HR 確認出席

```bash
# 取得梯次 ses-1 的確認報名清單
curl -X GET http://localhost:3000/api/hr/sessions/ses-1/attendance \
  -H "Cookie: <hr01 session>"

# 提交出席名單（enr-1 出席，enr-2 缺席）
curl -X POST http://localhost:3000/api/hr/sessions/ses-1/attendance \
  -H "Content-Type: application/json" \
  -H "Cookie: <hr01 session>" \
  -d '{"attendances": [{"enrollmentId":"enr-1","attended":true},{"enrollmentId":"enr-2","attended":false}]}'
```

**預期結果**:
- `enr-1` 狀態 → `ATTENDED`（若課程 requiresReflection=true）或 `PENDING_HR_CLOSE`（集團內課程）
- `enr-2` 狀態 → `ABSENT`

---

## Step 2: 員工填寫心得（心得必填課程）

```bash
# 員工查看申請狀態（應為 PENDING_REFLECTION）
curl -X GET http://localhost:3000/api/enrollments/enr-1 \
  -H "Cookie: <employee01 session>"

# 員工送出心得
curl -X POST http://localhost:3000/api/enrollments/enr-1/reflection \
  -H "Content-Type: application/json" \
  -H "Cookie: <employee01 session>" \
  -d '{"content": "本次法治課程讓我深入了解公司合規規範，特別是資料保護與利益迴避等面向..."}'
```

**預期結果**:
- `enr-1` 狀態 → `PENDING_QUIZ`（若 requiresQuiz=true）或 `PENDING_HR_CLOSE`

---

## Step 3: 員工完成測驗

```bash
# 取得測驗題目
curl -X GET http://localhost:3000/api/enrollments/enr-1/quiz \
  -H "Cookie: <employee01 session>"

# 提交答案
curl -X POST http://localhost:3000/api/enrollments/enr-1/quiz/submit \
  -H "Content-Type: application/json" \
  -H "Cookie: <employee01 session>" \
  -d '{
    "answers": [
      {"questionId": "q-1", "answer": "1"},
      {"questionId": "q-2", "answer": "公司治理的核心在於透明度與責任制，...", }
    ]
  }'
```

**預期結果**:
- 若含簡答題：`enr-1` 狀態 → `QUIZ_GRADING`
- 若純選擇題且通過：`enr-1` 狀態 → `PENDING_HR_CLOSE`

---

## Step 4: HR 評分簡答題

```bash
# 取得待評分的作答記錄
curl -X GET http://localhost:3000/api/hr/quiz-attempts/att-1 \
  -H "Cookie: <hr01 session>"

# 提交評分
curl -X POST http://localhost:3000/api/hr/quiz-attempts/att-1/grade \
  -H "Content-Type: application/json" \
  -H "Cookie: <hr01 session>" \
  -d '{
    "grades": [
      {"questionId": "q-2", "score": 18, "graderNote": "回答完整"}
    ]
  }'
```

**預期結果**:
- 所有題目評分完成後 `enr-1` 狀態 → `PENDING_HR_CLOSE`
- Response 包含 `totalScore`、`passed: true/false`

---

## Step 5: HR 執行結案

```bash
curl -X POST http://localhost:3000/api/hr/enrollments/enr-1/close \
  -H "Cookie: <hr01 session>"
```

**預期結果**:
- `enr-1` 狀態 → `COMPLETED`
- Response 包含 `trainingRecord.hoursAdded`
- 員工訓練紀錄更新（`/api/employee/training-records`）

---

## Step 6: 員工查看訓練紀錄

```bash
curl -X GET "http://localhost:3000/api/employee/training-records?year=2026" \
  -H "Cookie: <employee01 session>"
```

**預期結果**:
- `summary.annualHours` 增加本課程時數
- `completions` 列表包含剛結案的課程
- 若課程為 `isNewHireTraining=true`，`annualHours` 不增加（但 `totalHours` 增加）

---

## Step 7: 心得退回流程

```bash
# HR 退回心得
curl -X POST http://localhost:3000/api/hr/enrollments/enr-1/reflection/return \
  -H "Content-Type: application/json" \
  -H "Cookie: <hr01 session>" \
  -d '{"returnNote": "請補充實際工作場景的應用範例"}'

# 員工重新填寫
curl -X POST http://localhost:3000/api/enrollments/enr-1/reflection \
  -H "Content-Type: application/json" \
  -H "Cookie: <employee01 session>" \
  -d '{"content": "（修改後）本課程讓我了解...，在實際工作中，我將..."}'
```

**預期結果**:
- 退回後 `enr-1` 狀態 → `REFLECTION_RETURNED`，員工收到通知
- 重填後狀態回到 `PENDING_QUIZ` 或 `PENDING_HR_CLOSE`

---

## Step 8: 集團內課程快速結案

```bash
# 對一個 isInternal=true 課程的 CONFIRMED 申請確認出席
curl -X POST http://localhost:3000/api/hr/sessions/ses-internal/attendance \
  -H "Content-Type: application/json" \
  -H "Cookie: <hr01 session>" \
  -d '{"attendances": [{"enrollmentId":"enr-internal","attended":true}]}'
```

**預期結果**:
- `enr-internal` 狀態直接 → `PENDING_HR_CLOSE`（跳過心得與測驗）
