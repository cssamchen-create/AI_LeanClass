# Research: 訓練報表與統計

**Feature**: 005-training-reports
**Date**: 2026-04-23

---

## Decision 1: 達標率計算依據

**Decision**: 使用 `EmployeeTrainingRecord` 表判斷員工是否「已達標」，而非直接查 `CourseEnrollment`。

**Rationale**: `EmployeeTrainingRecord` 已是系統在完訓流程中自動維護的年度彙整紀錄（`@@unique([employeeId, year])`），`totalHours` 或 `totalCredits > 0` 即代表該年度有完訓。直接讀取此表比掃描所有 `CourseEnrollment` 更高效，且語意清晰。

**Alternatives considered**:
- 直接查 `CourseEnrollment WHERE status=COMPLETED AND session.startDate YEAR=year`：需 JOIN 多層，效能較差。
- 兩者並用：增加複雜度，不必要。

---

## Decision 2: 部門統計查詢策略

**Decision**: 單一 `prisma.employee.findMany` 帶 nested `trainingRecords` include，在 TypeScript 記憶體中 group by department。

**Rationale**: 員工數量一般不超過數百人，單次查詢 + 記憶體分組比 raw SQL group by 更易維護、更易測試，且避免 N+1。已在 Feature 004 同類設計中驗證可行。

**Alternatives considered**:
- `$queryRaw` GROUP BY SQL：效能略高，但增加 SQL 字串維護成本且無法享受 Prisma 型別安全。
- 個別查詢每個部門：N+1 問題，不採用。

---

## Decision 3: 課程完訓率資料來源

**Decision**: 查詢 `CourseEnrollment` 按 `courseId`（透過 `session.courseId`）分組，計算 status=COMPLETED 比例；以 `session.startDate` 的年份做年度篩選。

**Rationale**: 課程完訓率是「申請後是否完成」的比率，`CourseEnrollment` 是唯一記錄此狀態的地方。課程可跨年度多梯次，用 `session.startDate` 年份過濾最符合業務語意。

**Alternatives considered**:
- 用 `EmployeeTrainingRecord`：無法追溯到特定課程，不適用。
- 用 `CourseSession` 層級計算：可取得每梯次完訓率，但 US4 要求課程層級，需再 aggregate。

---

## Decision 4: 員工訓練歷程顯示資料

**Decision**: 使用 `CourseEnrollment WHERE employeeId=X AND status=COMPLETED`，include `session.course`，補充 `EmployeeTrainingRecord` 做學分/時數摘要。

**Rationale**: 歷程需要課程名稱（在 Course model），完訓狀態在 CourseEnrollment，年度學分彙整在 EmployeeTrainingRecord。組合使用可提供完整視圖。

**Alternatives considered**:
- 只用 EmployeeTrainingRecord：缺少個別課程明細。
- 只用 CourseEnrollment include course：缺少年度彙整（totalCredits, totalHours）。

---

## Decision 5: Server Components（RSC）直接查詢 vs API Routes

**Decision**: HR 報表頁面使用 Next.js Server Components 直接呼叫 service 函式；同時提供 API Routes 供年度切換的動態重新整理。

**Rationale**: 初始載入用 RSC（SEO、無需額外 fetch），年度切換用 API Route（避免整頁重整）。與現有 HR 頁面（如 commitments/page.tsx）模式一致。

**Alternatives considered**:
- 純 API Route + Client Component：需要額外的 loading state 管理，初始載入較慢。
- 純 RSC + URL searchParams：年度切換需整頁重整，UX 可接受但稍遜。決定混合使用。

---

## Decision 6: 無需 Schema 變更

**Decision**: Feature 005 不新增任何 Prisma model 或欄位，完全讀取現有資料。

**Rationale**: 現有 schema 已有所有必要資料：`EmployeeTrainingRecord`（年度彙整）、`CourseEnrollment`（申請狀態）、`Employee.department`（部門）、`Employee.isActive`（在職狀態）。無需 migration。

**Alternatives considered**:
- 建立 ReportCache 表：可加速查詢，但增加資料同步複雜度。在員工規模 < 1000 時無必要。
