# API Contracts: 課程出席確認與結案流程

**Feature**: 003-course-completion
**Date**: 2026-04-22

---

## HR 端 — 出席確認

### POST /api/hr/sessions/[sessionId]/attendance
確認整個梯次的出席名單（批次）

**Auth**: HR 角色
**Request Body**:
```json
{
  "attendances": [
    { "enrollmentId": "enr-1", "attended": true },
    { "enrollmentId": "enr-2", "attended": false }
  ]
}
```
**Response 200**:
```json
{
  "updated": 10,
  "attended": 8,
  "absent": 2
}
```
**Errors**: 404（梯次不存在）、400（梯次尚未結束）、409（已結案的申請不可修改）

---

## HR 端 — 心得管理

### GET /api/hr/enrollments/[id]/reflection
查看員工提交的心得

**Auth**: HR 角色
**Response 200**:
```json
{
  "content": "...",
  "submittedAt": "2026-05-15T10:00:00Z",
  "returnedAt": null,
  "returnNote": null
}
```

### POST /api/hr/enrollments/[id]/reflection/return
退回員工心得，要求重填

**Auth**: HR 角色
**Request Body**:
```json
{ "returnNote": "心得內容過於簡短，請詳述學習收穫。" }
```
**Response 200**:
```json
{ "success": true }
```
**Errors**: 400（退回原因為空）、409（申請狀態非 PENDING_HR_CLOSE 或已 COMPLETED）

---

## HR 端 — 測驗評分

### GET /api/hr/quiz-attempts/[attemptId]
取得某次作答的所有題目與答案（供評分）

**Auth**: HR 角色
**Response 200**:
```json
{
  "attemptId": "att-1",
  "attemptNumber": 1,
  "employee": { "id": "emp-1", "name": "陳員工" },
  "questions": [
    {
      "questionId": "q-1",
      "type": "ESSAY",
      "content": "請說明本課程的核心概念",
      "points": 20,
      "answer": "本課程核心概念為...",
      "score": null
    }
  ]
}
```

### POST /api/hr/quiz-attempts/[attemptId]/grade
提交簡答題評分

**Auth**: HR 角色
**Request Body**:
```json
{
  "grades": [
    { "questionId": "q-1", "score": 18, "graderNote": "回答完整，略缺範例" }
  ]
}
```
**Response 200**:
```json
{
  "totalScore": 85,
  "maxScore": 100,
  "passed": true,
  "allGraded": true
}
```
**Errors**: 400（分數超出配分）、409（已評分的題目不可重複提交，需 PATCH）

### PATCH /api/hr/quiz-attempts/[attemptId]/grade
修改簡答題評分（結案前可修改）

**Auth**: HR 角色
**Request Body**: 同 POST
**Response 200**: 同 POST

### POST /api/hr/enrollments/[id]/retry-quiz
允許員工重考

**Auth**: HR 角色
**Response 200**:
```json
{ "newAttemptNumber": 2 }
```
**Errors**: 409（申請狀態非 QUIZ_GRADING 或 PENDING_QUIZ）

---

## HR 端 — 結案

### POST /api/hr/enrollments/[id]/close
執行結案（更新 COMPLETED + 累加訓練時數/學分）

**Auth**: HR 角色
**Response 200**:
```json
{
  "enrollmentId": "enr-1",
  "status": "COMPLETED",
  "trainingRecord": {
    "year": 2026,
    "hoursAdded": 6.0,
    "creditsAdded": 0,
    "newAnnualHours": 18.0
  }
}
```
**Errors**: 409（尚有未完成步驟：列出清單）

---

## 員工端 — 心得填寫

### GET /api/enrollments/[id]/reflection
取得自己的心得（若已提交）

**Auth**: 本人員工
**Response 200**:
```json
{
  "content": "...",
  "submittedAt": "2026-05-15T10:00:00Z",
  "isLocked": true,
  "returnedAt": null,
  "returnNote": null
}
```
**Response 404**: 尚未提交

### POST /api/enrollments/[id]/reflection
送出心得

**Auth**: 本人員工
**Request Body**:
```json
{ "content": "本次課程讓我了解..." }
```
**Response 201**:
```json
{ "submittedAt": "2026-05-15T10:00:00Z" }
```
**Errors**: 400（內容為空）、409（申請狀態非 PENDING_REFLECTION/REFLECTION_RETURNED）

---

## 員工端 — 測驗作答

### GET /api/enrollments/[id]/quiz
取得課程測驗題目（不含正確答案）

**Auth**: 本人員工（申請狀態需為 PENDING_QUIZ）
**Response 200**:
```json
{
  "quizId": "quiz-1",
  "passingScore": 60,
  "totalPoints": 100,
  "attemptNumber": 1,
  "questions": [
    {
      "id": "q-1",
      "type": "MULTIPLE_CHOICE",
      "content": "以下何者為正確？",
      "points": 5,
      "order": 1,
      "options": ["選項A", "選項B", "選項C", "選項D"]
    },
    {
      "id": "q-2",
      "type": "ESSAY",
      "content": "請說明本課程核心概念",
      "points": 20,
      "order": 2
    }
  ]
}
```

### POST /api/enrollments/[id]/quiz/submit
提交測驗答案

**Auth**: 本人員工
**Request Body**:
```json
{
  "answers": [
    { "questionId": "q-1", "answer": "2" },
    { "questionId": "q-2", "answer": "本課程強調..." }
  ]
}
```
**Response 201**:
```json
{
  "attemptId": "att-1",
  "autoScore": 80,
  "maxAutoScore": 80,
  "pendingEssayGrading": true,
  "status": "QUIZ_GRADING"
}
```
**Errors**: 400（答案不完整）、409（申請狀態非 PENDING_QUIZ）

---

## 員工端 — 訓練紀錄

### GET /api/employee/training-records
取得個人訓練紀錄（所有已結案課程）

**Auth**: 已登入員工（本人）
**Query Params**: `year` (optional, 篩選年度)
**Response 200**:
```json
{
  "summary": {
    "year": 2026,
    "annualHours": 18.0,
    "totalHours": 24.0,
    "totalCredits": 3.0
  },
  "completions": [
    {
      "enrollmentId": "enr-1",
      "courseName": "法治教育課程",
      "sessionDate": "2026-05-10",
      "hours": 6.0,
      "credits": 0,
      "quizScore": 85,
      "quizPassed": true,
      "completedAt": "2026-05-20T09:00:00Z"
    }
  ]
}
```

---

## HR 端 — 測驗題庫管理（擴充 Course 管理）

### GET /api/hr/courses/[id]/quiz
取得課程的測驗題目設定

**Auth**: HR 角色
**Response 200**:
```json
{
  "quizId": "quiz-1",
  "passingScore": 60,
  "questions": [...]
}
```

### POST /api/hr/courses/[id]/quiz
建立課程測驗

**Auth**: HR 角色
**Request Body**:
```json
{
  "passingScore": 60,
  "questions": [
    {
      "type": "MULTIPLE_CHOICE",
      "content": "以下何者...",
      "points": 5,
      "order": 1,
      "options": [
        { "text": "選項A", "isCorrect": false },
        { "text": "選項B", "isCorrect": true },
        { "text": "選項C", "isCorrect": false }
      ]
    },
    {
      "type": "ESSAY",
      "content": "請說明...",
      "points": 20,
      "order": 2
    }
  ]
}
```
**Response 201**: `{ "quizId": "quiz-1" }`

### PUT /api/hr/courses/[id]/quiz
更新測驗設定（整體替換）

**Auth**: HR 角色
**Request Body**: 同 POST
**Errors**: 409（已有結案申請使用此測驗，不可修改題目內容）
