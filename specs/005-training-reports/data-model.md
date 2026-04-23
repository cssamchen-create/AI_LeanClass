# Data Model: 訓練報表與統計

**Feature**: 005-training-reports
**Date**: 2026-04-23
**Note**: 本 feature 不新增任何 schema，僅讀取現有資料。以下為報表功能使用的現有實體說明。

---

## 使用的現有實體

### Employee

報表分母與搜尋基礎。

| 欄位 | 型別 | 用途 |
|------|------|------|
| id | String | 主鍵 |
| name | String | 員工搜尋顯示 |
| department | String | 部門統計分組依據 |
| isActive | Boolean | 篩選在職員工（達標率分母） |
| resignedAt | DateTime? | 輔助確認離職狀態 |

### EmployeeTrainingRecord

年度訓練達標判斷依據（每位員工每年一筆，完訓時系統自動建立/更新）。

| 欄位 | 型別 | 用途 |
|------|------|------|
| employeeId | String | FK → Employee |
| year | Int | 年度（篩選條件） |
| totalHours | Decimal | 年度總時數顯示 |
| totalCredits | Decimal | 年度總學分顯示 |

**達標判斷**：該年度存在 EmployeeTrainingRecord 記錄（totalHours > 0 或 totalCredits > 0）。

### CourseEnrollment

課程完訓率計算及員工歷程查詢來源。

| 欄位 | 型別 | 用途 |
|------|------|------|
| employeeId | String | FK → Employee |
| sessionId | String | FK → CourseSession（取得課程資訊） |
| status | EnrollmentStatus | COMPLETED = 完訓 |
| createdAt | DateTime | 申請年度輔助判斷 |

### CourseSession

課程梯次，提供開課年度資訊。

| 欄位 | 型別 | 用途 |
|------|------|------|
| courseId | String | FK → Course |
| startDate | DateTime | 年度篩選（`startDate.getFullYear() === year`） |

### Course

課程完訓率分析的主要維度。

| 欄位 | 型別 | 用途 |
|------|------|------|
| name | String | 課程名稱顯示 |
| measurementUnit | MeasurementUnit | CREDIT 或 HOURS |
| measurementValue | Float | 學分或時數值 |

---

## 報表計算邏輯

### US1 年度達標率

```
在職員工總數 = Employee.count WHERE isActive=true
已達標人數  = EmployeeTrainingRecord.count WHERE year=Y AND employeeId IN (在職員工)
達標率      = 已達標人數 / 在職員工總數 * 100%
```

### US2 部門統計

```
for each department in Employee.groupBy(department) WHERE isActive=true:
  totalEmployees = count
  trained = count WHERE trainingRecords.some(year=Y)
  rate = trained / totalEmployees * 100%
```

### US3 員工訓練歷程

```
enrollments = CourseEnrollment
  WHERE employeeId=E AND status=COMPLETED
  include session.course
  orderBy createdAt DESC

yearSummary = EmployeeTrainingRecord WHERE employeeId=E (all years)
```

### US4 課程完訓率

```
for each Course (sessions.startDate year=Y):
  totalEnrolled = CourseEnrollment.count WHERE session.courseId=C AND session.startDate year=Y
  completed     = CourseEnrollment.count WHERE ... AND status=COMPLETED
  rate          = completed / totalEnrolled * 100%
```

---

## TypeScript 回傳型別（計畫）

```typescript
// US1
type ComplianceOverview = {
  year: number
  totalActive: number
  trained: number
  untrained: number
  complianceRate: number // 0-100
}

// US2
type DepartmentStat = {
  department: string
  totalEmployees: number
  trained: number
  untrained: number
  complianceRate: number
}

// US3
type EmployeeTrainingHistory = {
  employee: { id: string; name: string; department: string }
  enrollments: Array<{
    courseId: string
    courseName: string
    sessionStartDate: Date
    year: number
    measurementUnit: string
    measurementValue: number
    status: string
  }>
  yearSummaries: Array<{
    year: number
    totalHours: string
    totalCredits: string
  }>
}

// US4
type CourseStat = {
  courseId: string
  courseName: string
  totalEnrolled: number
  completed: number
  completionRate: number
}
```
