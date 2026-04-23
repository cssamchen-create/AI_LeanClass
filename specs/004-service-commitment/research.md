# Research: 服務承諾管理

**Branch**: `004-service-commitment` | **Date**: 2026-04-23

## 1. EnrollmentStatus 狀態機整合

**Decision**: 在現有 `EnrollmentStatus` enum 插入 `PENDING_COMMITMENT` 狀態，位置在 `PENDING_HR` → `CONFIRMED` 之間。

**Rationale**:
- 現有狀態機已有 13 個狀態（PENDING_MANAGER → … → COMPLETED）
- `PENDING_COMMITMENT` 邏輯上在 HR 核准後、員工確認前，與現有 `PENDING_WAITLIST_CONFIRM` 模式類似（參考 WaitlistEntry.PENDING_CONFIRMATION）
- 修改現有 `approveEnrollmentByHRAction`：若課程 `requiresCommitment = true`，status 設為 `PENDING_COMMITMENT` 並建立 `CommitmentRecord`；否則沿用原本 `CONFIRMED`。

**State Flow（完整）**:
```
PENDING_MANAGER → PENDING_HR → [PENDING_COMMITMENT →] CONFIRMED → ATTENDED/ABSENT → … → COMPLETED
```

**Alternatives considered**:
- 獨立模型不修改 EnrollmentStatus：會讓前端顯示邏輯碎片化，違反現有 status-driven UI 設計原則，捨棄。

---

## 2. 48 小時簽署期限機制

**Decision**: 複用現有 Cron 架構（`/api/cron/waitlist-expiry` 模式），新增 `/api/cron/commitment-expiry` 每小時執行，檢查 `CommitmentRecord.signatureDeadline < now()` 且 `status = PENDING_SIGNATURE`，自動取消申請。

**Rationale**:
- 現有 `waitlist-expiry` cron route 已有 Vercel Cron 設定於 `vercel.json`，可直接參考。
- 48 小時期限儲存在 `CommitmentRecord.signatureDeadline`（建立時設為 `now() + 48h`）。
- 取消時：enrollment status → CANCELLED，CommitmentRecord.status → VOIDED，通知員工與 HR。

**Alternatives considered**:
- 使用 DB-level trigger：不在 Next.js 架構範圍內，捨棄。

---

## 3. 比例賠償金額計算

**Decision**: 計算公式：`賠償金額 = ceil(feeAmount × remainingMonths / totalMonths)`（進位至整數元）。

**Rationale**:
- `remainingMonths = totalMonths - floor((resignDate - signedAt) / 月)`（使用整月計算）
- 課程尚未開始即離職（`signedAt != null && session.startDate > resignDate`）→ `remainingMonths = totalMonths`（全額）
- 使用 `Decimal`（`@prisma/client/runtime/library`）避免浮點誤差，與 training-record-service 一致。
- 四捨五入採 Decimal.ROUND_HALF_UP。

**公式驗證範例**:
- feeAmount = 30,000、年限 24 月、已履行 6 月 → 剩餘 18 月 → 30,000 × 18/24 = 22,500 元 ✓
- feeAmount = 30,000、年限 24 月、已履行 0 月（尚未開課）→ 剩餘 24 月 → 30,000 × 24/24 = 30,000 元 ✓

---

## 4. HR 月度自動提醒

**Decision**: 新增 `/api/cron/commitment-monthly-reminder` 排程，每月 1 日 09:00（Asia/Taipei）觸發；查詢 30 天內 `commitmentExpiresAt` 的 ACTIVE CommitmentRecord，彙整後以單一通知批次發送給所有 HR 帳號。

**Rationale**:
- 複用現有 `NotificationLog` + email 送信架構（`notification-service.ts`）
- 無 30 天到期清單時不發送，避免 noise
- 不使用即時計算（每月彙整比每日查詢更符合業務期望）

**Alternatives considered**:
- 每日發送即將到期提醒：過於頻繁，leanWeb.txt 明確要求「每月提醒」。

---

## 5. CommitmentRecord 到期日計算

**Decision**: `commitmentExpiresAt = signedAt + commitmentMonths 個月`（使用 date-fns addMonths 函式，跨月邊界處理）。

**Rationale**:
- `date-fns` 已在專案中存在（透過 Next.js 依賴），無需新增套件。
- 「30 天內到期」篩選：`commitmentExpiresAt BETWEEN now() AND now() + 30 days`。
- 「即將到期」通知的到期定義以 `commitmentExpiresAt`（留任期屆滿）而非 `signatureDeadline`（簽署期限）。

---

## 6. 員工離職標記

**Decision**: 在 `Employee` 模型新增 `resignedAt DateTime?` 欄位；HR 在員工管理頁觸發「標記離職」操作（`isActive = false`, `resignedAt = now()`）；操作時系統同步計算賠償並顯示確認對話框。

**Rationale**:
- `Employee.isActive` 已存在，`resignedAt` 作為精確時間戳補充。
- 賠償計算在 server side action 中同步完成（不是非同步），確保 HR 在確認前看到結果。
- HR 可回填離職日期（`resignedAt` 可接受過去日期），此為業務需求。

---

## 7. Constitution Phase 越界處理

**Decision**: 繼續實作，並在本 plan.md 記錄越界原因（依 Constitution §III 規定）。

**Rationale**:
- Constitution §III 規定服務承諾管理為 Phase 2。
- 專案負責人明確要求此功能納入當前開發週期。
- 功能已自然接續於 001（課程）、002（報名）、003（結案）之後，且與報名流程深度耦合。
- 越界記錄於 Complexity Tracking，建議下次 constitution 修訂時調整 Phase 定義。
