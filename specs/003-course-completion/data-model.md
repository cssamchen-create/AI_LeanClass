# Data Model: 課程出席確認與結案流程

**Feature**: 003-course-completion
**Date**: 2026-04-22

---

## EnrollmentStatus 擴充（新增 8 個狀態）

```prisma
enum EnrollmentStatus {
  // === 既有狀態（002-course-enrollment）===
  PENDING_MANAGER     // 待主管審核
  PENDING_HR          // 待 HR 審核
  CONFIRMED           // 已確認報名
  REJECTED            // 已退回
  CANCELLED           // 已取消

  // === 新增狀態（003-course-completion）===
  ATTENDED            // HR 確認出席
  ABSENT              // HR 確認缺席（終止）
  PENDING_REFLECTION  // 待員工填寫心得
  REFLECTION_RETURNED // 心得被 HR 退回，待重填
  PENDING_QUIZ        // 待員工完成測驗
  QUIZ_GRADING        // 測驗已提交，待 HR 評分（含簡答題）
  PENDING_HR_CLOSE    // 所有步驟完成，待 HR 結案
  COMPLETED           // 已結案
}
```

---

## 新增 Prisma 模型

### CourseReflection（課程心得）

```prisma
model CourseReflection {
  id           String           @id @default(uuid())
  enrollmentId String           @unique
  enrollment   CourseEnrollment @relation(fields: [enrollmentId], references: [id])
  content      String
  isLocked     Boolean          @default(true)   // 送出後鎖定；HR 退回後解鎖
  submittedAt  DateTime         @default(now())
  returnedAt   DateTime?        // HR 退回時間
  returnNote   String?          // HR 退回原因
  updatedAt    DateTime         @updatedAt
}
```

### Quiz（課程測驗）

```prisma
model Quiz {
  id           String         @id @default(uuid())
  courseId     String         @unique
  course       Course         @relation(fields: [courseId], references: [id])
  passingScore Int            // 通過門檻（總分百分比，如 60 表示 60%）
  questions    QuizQuestion[]
  attempts     QuizAttempt[]
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}
```

### QuizQuestion（測驗題目）

```prisma
enum QuestionType {
  MULTIPLE_CHOICE  // 單選題（自動評分）
  ESSAY            // 簡答題（人工評分）
}

model QuizQuestion {
  id       String       @id @default(uuid())
  quizId   String
  quiz     Quiz         @relation(fields: [quizId], references: [id])
  type     QuestionType
  content  String
  order    Int          // 題目排序
  points   Int          // 本題配分
  options  Json?        // MULTIPLE_CHOICE: [{text: string, isCorrect: boolean}]
  answers  QuizAnswer[]
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
}
```

### QuizAttempt（作答記錄）

```prisma
model QuizAttempt {
  id            String           @id @default(uuid())
  enrollmentId  String
  enrollment    CourseEnrollment @relation(fields: [enrollmentId], references: [id])
  quizId        String
  quiz          Quiz             @relation(fields: [quizId], references: [id])
  attemptNumber Int              // 第幾次作答（從 1 開始）
  totalScore    Int?             // null 直到所有題目評分完成
  maxScore      Int              // 測驗總分（所有題目 points 之和）
  passed        Boolean?         // null 直到 totalScore 確定
  submittedAt   DateTime         @default(now())
  gradedAt      DateTime?        // 所有題目評分完成時間
  answers       QuizAnswer[]
  createdAt     DateTime         @default(now())
}
```

### QuizAnswer（每題答案）

```prisma
model QuizAnswer {
  id         String       @id @default(uuid())
  attemptId  String
  attempt    QuizAttempt  @relation(fields: [attemptId], references: [id])
  questionId String
  question   QuizQuestion @relation(fields: [questionId], references: [id])
  answer     String       // MC: 選項 index (0-based)；ESSAY: 答案文字
  score      Int?         // null（待評）→ 整數（評分後）
  gradedAt   DateTime?
  graderNote String?      // HR 評分備注
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt

  @@unique([attemptId, questionId])
}
```

### EmployeeTrainingRecord（員工訓練紀錄）

```prisma
model EmployeeTrainingRecord {
  id           String   @id @default(uuid())
  employeeId   String
  employee     Employee @relation(fields: [employeeId], references: [id])
  year         Int      // 自然年，如 2026
  totalHours   Decimal  @default(0) @db.Decimal(8, 2)   // 全部課程時數（含新人訓練）
  annualHours  Decimal  @default(0) @db.Decimal(8, 2)   // 年度計入時數（排除新人訓練）
  totalCredits Decimal  @default(0) @db.Decimal(8, 2)   // 學分累計
  updatedAt    DateTime @updatedAt

  @@unique([employeeId, year])
}
```

---

## Course 模型擴充

在既有 `Course` 模型（001-hr-course-mgmt）新增欄位：

```prisma
// 新增欄位
requiresQuiz        Boolean  @default(false) // 是否需要通過測驗
isNewHireTraining   Boolean  @default(false) // 是否為新進人員訓練（不計入年度時數）

// 新增關聯
quiz                Quiz?
```

---

## CourseEnrollment 模型擴充

在既有 `CourseEnrollment` 模型（002-course-enrollment）新增關聯：

```prisma
// 新增關聯
reflection    CourseReflection?
quizAttempts  QuizAttempt[]
```

---

## Employee 模型擴充

```prisma
// 新增關聯
trainingRecords EmployeeTrainingRecord[]
```

---

## 狀態轉換規則（業務邏輯）

| 當前狀態 | 條件 | 下一狀態 | 操作者 |
|---------|------|---------|--------|
| CONFIRMED | HR 標記出席 | ATTENDED | HR |
| CONFIRMED | HR 標記缺席 | ABSENT | HR |
| ATTENDED | 集團內課程 | PENDING_HR_CLOSE | 系統自動 |
| ATTENDED | requiresReflection=true | PENDING_REFLECTION | 系統自動 |
| ATTENDED | requiresReflection=false + requiresQuiz=true | PENDING_QUIZ | 系統自動 |
| ATTENDED | requiresReflection=false + requiresQuiz=false | PENDING_HR_CLOSE | 系統自動 |
| PENDING_REFLECTION | 員工送出心得 + requiresQuiz=true | PENDING_QUIZ | 員工 |
| PENDING_REFLECTION | 員工送出心得 + requiresQuiz=false | PENDING_HR_CLOSE | 員工 |
| PENDING_REFLECTION | HR 退回心得 | REFLECTION_RETURNED | HR |
| REFLECTION_RETURNED | 員工重新送出心得 | PENDING_REFLECTION（再走一遍） | 員工 |
| PENDING_QUIZ | 員工提交（含簡答題） | QUIZ_GRADING | 員工 |
| PENDING_QUIZ | 員工提交（純選擇題，全過） | PENDING_HR_CLOSE | 系統自動 |
| PENDING_QUIZ | 員工提交（純選擇題，未過）+ HR 允許重考 | PENDING_QUIZ（新 Attempt） | HR |
| QUIZ_GRADING | HR 完成所有簡答題評分 + 通過 | PENDING_HR_CLOSE | 系統自動 |
| QUIZ_GRADING | HR 完成所有簡答題評分 + 未通過 + HR 允許重考 | PENDING_QUIZ（新 Attempt） | HR |
| PENDING_HR_CLOSE | HR 執行結案 | COMPLETED | HR |
