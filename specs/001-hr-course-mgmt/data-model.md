# Data Model: HR 課程管理

**Feature**: 001-hr-course-mgmt
**Date**: 2026-04-22

---

## Entities

### CourseCategory（課程類別）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| name | String | 類別名稱（唯一） |
| countsTowardAnnualHours | Boolean | 是否計入年度時數 |
| defaultHours | Float? | 預設時數（年度特訓為 12，其餘為 null） |
| createdAt | DateTime | 建立時間 |
| updatedAt | DateTime | 最後修改時間 |

**Business Rules**:
- 「新人教育訓練」類別：`countsTowardAnnualHours = false`
- 「年度特訓」類別：`countsTowardAnnualHours = true`，`defaultHours = 12`
- 其他類別：`countsTowardAnnualHours = true`，`defaultHours = null`

---

### Course（課程）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| name | String | 課程名稱（必填） |
| categoryId | UUID | 外鍵 → CourseCategory |
| measurementUnit | Enum | `CREDIT` 或 `HOURS` |
| measurementValue | Float | 學分數或時數 |
| requiresReflection | Boolean | 心得是否必填（預設 true） |
| isGroupCourse | Boolean | 是否為集團內課程（預設 false） |
| status | Enum | `DRAFT` / `ACTIVE` / `INACTIVE` |
| knowledgeBaseRef | String? | 知識庫文件參考（Phase 3 預留欄位） |
| createdAt | DateTime | 建立時間 |
| updatedAt | DateTime | 最後修改時間 |
| createdBy | UUID | 外鍵 → User（HR） |

**Business Rules**:
- 集團內課程（`isGroupCourse = true`）結案僅需出席確認，忽略 `requiresReflection`
- 有 CourseSession 記錄的課程不可刪除，只能改為 `INACTIVE`
- `measurementValue` 若類別有 `defaultHours`，建立時自動帶入預設值

**State Transitions**:
```
DRAFT → ACTIVE（HR 上架）
ACTIVE → INACTIVE（HR 下架）
INACTIVE → ACTIVE（HR 重新上架）
```

---

### CourseSession（梯次）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| courseId | UUID | 外鍵 → Course |
| startDate | Date | 開課日期 |
| endDate | Date? | 結課日期（選填） |
| location | String | 地點（自由文字） |
| instructorName | String | 講師姓名（自由文字） |
| capacity | Int | 名額上限 |
| enrolledCount | Int | 目前報名人數（快取值） |
| status | Enum | `OPEN` / `CANCELLED` |
| cancelledAt | DateTime? | 取消時間 |
| cancelledBy | UUID? | 外鍵 → User（HR） |
| createdAt | DateTime | 建立時間 |
| updatedAt | DateTime | 最後修改時間 |

**Business Rules**:
- 取消梯次（`CANCELLED`）時：所有相關申請退回，通知申請人與 HR
- 報名人數達 `capacity` 時：新報名者自動進入等待名單
- `enrolledCount` 由申請模組維護，本模組唯讀參考

---

## Relationships

```
CourseCategory 1──* Course 1──* CourseSession
User(HR)       1──* Course (createdBy)
User(HR)       1──* CourseSession (cancelledBy)
```

---

## Prisma Schema（參考）

```prisma
enum MeasurementUnit {
  CREDIT
  HOURS
}

enum CourseStatus {
  DRAFT
  ACTIVE
  INACTIVE
}

enum SessionStatus {
  OPEN
  CANCELLED
}

model CourseCategory {
  id                      String   @id @default(uuid())
  name                    String   @unique
  countsTowardAnnualHours Boolean  @default(true)
  defaultHours            Float?
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  courses                 Course[]
}

model Course {
  id                 String          @id @default(uuid())
  name               String
  categoryId         String
  category           CourseCategory  @relation(fields: [categoryId], references: [id])
  measurementUnit    MeasurementUnit
  measurementValue   Float
  requiresReflection Boolean         @default(true)
  isGroupCourse      Boolean         @default(false)
  status             CourseStatus    @default(DRAFT)
  knowledgeBaseRef   String?
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt
  createdBy          String
  sessions           CourseSession[]
}

model CourseSession {
  id             String        @id @default(uuid())
  courseId       String
  course         Course        @relation(fields: [courseId], references: [id])
  startDate      DateTime
  endDate        DateTime?
  location       String
  instructorName String
  capacity       Int
  enrolledCount  Int           @default(0)
  status         SessionStatus @default(OPEN)
  cancelledAt    DateTime?
  cancelledBy    String?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
}
```
