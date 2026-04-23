# Data Model: 服務承諾管理

**Branch**: `004-service-commitment` | **Date**: 2026-04-23

## Schema Changes (Prisma)

### 1. 新增 Enum：CommitmentStatus

```prisma
enum CommitmentStatus {
  PENDING_SIGNATURE  // 待員工簽署（48 小時內）
  ACTIVE             // 已簽署、承諾期進行中
  EXPIRED            // 承諾期自然到期（留任期屆滿）
  VOIDED             // 廢止（申請取消、課程取消、重複報名等）
  COMPENSATION_NOTED // 已計算賠償（員工離職觸發）
}
```

### 2. 新增 EnrollmentStatus 值

在現有 enum 中，於 `PENDING_HR` 與 `CONFIRMED` 之間插入：

```prisma
enum EnrollmentStatus {
  PENDING_MANAGER
  PENDING_HR
  PENDING_COMMITMENT  // ← 新增：HR 核准後、員工尚未簽署承諾書
  CONFIRMED
  REJECTED
  CANCELLED
  ATTENDED
  ABSENT
  PENDING_REFLECTION
  REFLECTION_RETURNED
  PENDING_QUIZ
  QUIZ_GRADING
  PENDING_HR_CLOSE
  COMPLETED
}
```

### 3. 新增 NotificationEventType 值

```prisma
enum NotificationEventType {
  // …現有值…
  COMMITMENT_SIGNATURE_REQUIRED  // HR 核准後通知員工簽署
  COMMITMENT_SIGNED              // 員工簽署成功通知
  COMMITMENT_SIGNATURE_EXPIRED   // 48 小時未簽署，通知員工與 HR
  COMMITMENT_EXPIRING_SOON       // 月度提醒：30 天內到期
  COMMITMENT_COMPENSATION        // 離職賠償計算通知給 HR
}
```

### 4. 修改 Course 模型

```prisma
model Course {
  // …現有欄位…
  requiresCommitment Boolean  @default(false)
  commitmentMonths   Int?                      // 留任年限（月數，例如 24 = 2 年）
  commitmentFee      Decimal? @db.Decimal(10, 2) // 課程費用（新台幣整數）

  commitmentRecords  CommitmentRecord[]
}
```

**驗證規則**:
- `requiresCommitment = true` 時，`commitmentMonths` 與 `commitmentFee` MUST NOT 為 null
- `commitmentMonths` MUST 在 1–120 之間（最長 10 年）
- `commitmentFee` MUST ≥ 0（允許 0，但系統發出警告）

### 5. 新增 CommitmentRecord 模型

```prisma
model CommitmentRecord {
  id                  String           @id @default(uuid())
  enrollmentId        String           @unique
  enrollment          CourseEnrollment @relation(fields: [enrollmentId], references: [id])
  courseId            String
  course              Course           @relation(fields: [courseId], references: [id])
  employeeId          String
  employee            Employee         @relation(fields: [employeeId], references: [id])

  // 簽署相關
  status              CommitmentStatus @default(PENDING_SIGNATURE)
  signatureDeadline   DateTime         // 建立時 = now() + 48h
  signedAt            DateTime?        // 員工簽署時間

  // 留任期限
  commitmentMonths    Int              // 從 Course.commitmentMonths 複製（快照）
  commitmentFee       Decimal          @db.Decimal(10, 2) // 從 Course.commitmentFee 複製（快照）
  commitmentExpiresAt DateTime?        // signedAt + commitmentMonths（簽署後計算）

  // 賠償相關（離職時填入）
  compensationAmount  Decimal?         @db.Decimal(10, 2)
  compensationNote    String?
  compensationAt      DateTime?

  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt
}
```

**設計說明**:
- `commitmentMonths` / `commitmentFee` 在建立時從 Course 複製為快照，防止日後課程條款修改影響已有承諾書記錄
- `signatureDeadline` 用於 48 小時自動取消 cron 判斷
- `commitmentExpiresAt` 用於「即將到期 30 天」查詢與月度提醒
- `@@unique([enrollmentId])` 確保每筆報名最多一筆有效承諾書

### 6. 修改 Employee 模型

```prisma
model Employee {
  // …現有欄位…
  resignedAt DateTime?  // 離職日期（HR 手動標記，可填過去日期）

  commitmentRecords CommitmentRecord[]
}
```

### 7. 修改 CourseEnrollment 模型

新增關聯：

```prisma
model CourseEnrollment {
  // …現有欄位…
  commitmentRecord CommitmentRecord?
}
```

---

## Entity Relationships

```
Course ──────────────────── CommitmentRecord (1:many, via courseId)
CourseEnrollment ──────────── CommitmentRecord (1:1, via enrollmentId @unique)
Employee ────────────────── CommitmentRecord (1:many, via employeeId)
```

---

## State Transitions

### CommitmentRecord.status

```
PENDING_SIGNATURE
  ├─→ ACTIVE           (員工在 48h 內簽署)
  └─→ VOIDED           (48h 超時，cron 自動取消)

ACTIVE
  ├─→ EXPIRED          (commitmentExpiresAt < now()，到期自動更新)
  └─→ COMPENSATION_NOTED (HR 標記員工離職且承諾期未到)

EXPIRED → (終態，僅供查閱)
VOIDED → (終態)
COMPENSATION_NOTED → (終態)
```

### EnrollmentStatus（含新狀態）

```
PENDING_MANAGER
  └─→ PENDING_HR
        └─→ PENDING_COMMITMENT  ← [requiresCommitment = true]
        │     ├─→ CONFIRMED     (員工簽署)
        │     └─→ CANCELLED     (48h 超時)
        └─→ CONFIRMED           [requiresCommitment = false，現有邏輯]
```

---

## Prisma Migration

```bash
npx prisma migrate dev --name add-service-commitment
```

預計影響：
- 新 enum `CommitmentStatus`
- 新 enum 值 `PENDING_COMMITMENT`（EnrollmentStatus）
- 新 enum 值 5 個（NotificationEventType）
- Course 新增 3 欄位
- Employee 新增 1 欄位
- CourseEnrollment 新增關聯（無新欄位）
- 新 model `CommitmentRecord`
