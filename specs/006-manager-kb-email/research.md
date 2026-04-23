# Research: 進階功能整合

**Feature**: 006-manager-kb-email
**Date**: 2026-04-23

---

## Decision 1: Email 通知現況

**Decision**: Email 寄送基礎設施已完整實作，無需重建。只需補充「SMTP 未設定時靜默跳過」保護。

**Rationale**: `notification-service.ts` 已有：
- `sendNotification()` — 建立 NotificationLog 並呼叫 `attemptSend`
- `attemptSend()` — 使用 nodemailer 寄送，失敗則更新 log 狀態
- `retryFailedNotifications()` — 重試失敗通知（最多 3 次，已實作）
- `nodemailer` 套件已安裝

缺少的只是：當 `SMTP_HOST` 未設定時，`createTransport` 仍會建立但 `sendMail` 會拋錯。需在 `attemptSend` 加入 SMTP 設定檢查，未設定則 log status 設為 `SKIPPED`。

**Alternatives considered**: 重寫寄信機制 — 不必要，現有實作完整。

---

## Decision 2: 知識庫資料模型

**Decision**: 新增 `KnowledgeBaseResource` model，以 courseId 關聯 Course，支援 LINK 和 TEXT 兩種類型。

**Rationale**: 現有 Course 只有 `knowledgeBaseRef String?`（單一字串），無法支援多筆資源與類型。需要一個獨立 model 才能 CRUD。

**Schema**:
```prisma
enum ResourceType { LINK TEXT }

model KnowledgeBaseResource {
  id        String       @id @default(uuid())
  courseId  String
  course    Course       @relation(fields: [courseId], references: [id])
  title     String
  type      ResourceType
  content   String       // URL or plain text
  order     Int          @default(0)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
}
```

**Alternatives considered**: 使用現有 `knowledgeBaseRef` 欄位存 JSON — 無型別安全、無法獨立 CRUD。

---

## Decision 3: 管理者儀表板查詢策略

**Decision**: 兩個獨立查詢：(1) 下屬訓練達標查詢（Employee + EmployeeTrainingRecord）；(2) 待審申請查詢（CourseEnrollment WHERE status=PENDING_MANAGER）。

**Rationale**: 現有 manager route group 已有 `(manager)/enrollments` 頁面。Dashboard 只需新增 `(manager)/dashboard/page.tsx` 並直接呼叫 service 函式（RSC 模式）。Employee.managerId 已存在，可直接過濾直屬下屬。

**Alternatives considered**: 建立 Manager Dashboard API Route — RSC 直查更簡單，HR 報表已驗證此模式可行。

---

## Decision 4: KnowledgeBase CRUD 位置

**Decision**: HR 端在課程詳情頁（`(hr)/courses/[id]/page.tsx`）新增知識庫管理區塊；Employee 端在員工課程詳情頁顯示資源（唯讀）。API 路由掛在 `/api/hr/courses/[id]/resources`。

**Rationale**: 知識庫資源與課程強關聯，放在課程詳情頁管理最符合業務流程。Employee 端已有 `(employee)/enrollments/[id]` 頁面，可在此加入資源區塊。

---

## Decision 5: Nodemailer SMTP 靜默跳過

**Decision**: 在 `attemptSend` 開頭加入 SMTP_HOST 檢查；若未設定，直接 update log status 為 `SKIPPED` 並 return。

**Rationale**: 最小化改動，不影響現有業務邏輯，測試環境無需 SMTP 也不會拋錯。`NotificationStatus` enum 需新增 `SKIPPED` 值。
