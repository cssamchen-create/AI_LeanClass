# Research: 員工課程申請與審核流程

**Feature**: 002-course-enrollment
**Date**: 2026-04-22

---

## 1. Email 通知實作策略

**Decision**: Nodemailer + 公司 SMTP + DB-based 重試佇列

**Rationale**:
- Nodemailer 是 Node.js 生態中最成熟的 SMTP 客戶端，與 Next.js 的 Server Action / API Routes 無縫整合
- 使用 PostgreSQL 的 `NotificationLog` 表作為輕量的通知佇列，記錄發送狀態與重試次數
- 符合 Constitution V：通知失敗記錄永久保存，HR 可查看失敗清單並手動補發
- 重試機制：最多 3 次，間隔 5/15/30 分鐘，透過 Vercel Cron Jobs 定期觸發

**Alternatives considered**:
- Resend / SendGrid：managed Email API，deliverability 更佳，但需對外傳送員工資料，有合規疑慮；Constitution 假設使用公司現有 SMTP
- Bull/BullMQ + Redis：完整的 job queue，但過度設計；需額外 Redis 服務，增加部署複雜度
- Vercel Queue（Edge Functions）：仍在 Beta，穩定性未確認

---

## 2. 申請狀態機設計

**Decision**: 單一 `status` 欄位（Enum）搭配嚴格的業務邏輯層驗證

**Rationale**:
- 狀態流轉：`PENDING_MANAGER → PENDING_HR → CONFIRMED` 或退回 `REJECTED` / 取消 `CANCELLED`
- 等待名單有獨立的 `WaitlistEntry` 實體（非 Enrollment 狀態），避免狀態欄位過於複雜
- 業務邏輯集中於 `service.ts`，所有狀態轉換前進行合法性驗證，Zod schema 覆蓋輸入驗證
- 符合 Constitution IV：service 層需有 Vitest 單元測試覆蓋所有狀態轉換路徑

**States**:
```
PENDING_MANAGER  → 申請已送出，等待主管審核
PENDING_HR       → 主管已核准，等待 HR 核准
CONFIRMED        → HR 核准，報名正式確認
REJECTED         → 主管或 HR 退回
CANCELLED        → 員工主動取消（或 HR 代為取消）
```

**Alternatives considered**:
- 多張 approval 表：彈性高但 join 複雜，過度設計
- Enum + JSONB history：可行但查詢複雜；改以 `enrollmentHistory` 記錄審核軌跡

---

## 3. 等待名單遞補機制

**Decision**: 資料庫層 FIFO 序列 + 48 小時確認計時

**Rationale**:
- `WaitlistEntry` 記錄 `position`（等待序號）與 `notifiedAt`、`confirmDeadline` 欄位
- 名額釋出時，Service 層查詢 `position` 最小且 `status = WAITING` 的條目，更新為 `PENDING_CONFIRMATION` 並設定 `confirmDeadline = now() + 48h`
- Vercel Cron Job（每小時執行）掃描逾期條目（`confirmDeadline < now() AND status = PENDING_CONFIRMATION`），自動失效並遞補下一位
- 先到先得競爭：`enrolledCount < capacity` 的原子性驗證使用 Prisma transaction

**Alternatives considered**:
- Redis ZADD：適合高並發場景，但系統規模不需要；增加基礎設施複雜度
- 即時 WebSocket 通知：超過此功能範圍，Phase 1 使用 Email 即可

---

## 4. 並發名額控制

**Decision**: Prisma transaction + `enrolledCount` 樂觀更新 + 資料庫層 CHECK constraint

**Rationale**:
- 申請確認（HR 核准時）使用 Prisma transaction：先查詢 `enrolledCount < capacity`，再更新 `enrolledCount += 1`，確保原子性
- 資料庫層加入 CHECK constraint：`enrolledCount <= capacity`，作為最後防線
- 針對高並發邊緣案例（兩人同時申請最後一個名額），transaction 的 row-level lock 確保先到先得

**Alternatives considered**:
- 樂觀鎖（version 欄位）：適合讀多寫少場景，但 enrollment 場景寫入衝突較頻繁，改用悲觀鎖（SELECT FOR UPDATE）

---

## 5. 主管從屬關係驗證

**Decision**: Employee 實體的 `managerId` 欄位（自引用 FK）

**Rationale**:
- 現有架構假設員工資料由 HR 手動維護；在 Employee 表新增 `managerId`（FK → Employee）
- 主管審核時 Server 端驗證：申請人的 `managerId = 當前登入主管的 employeeId`
- Phase 1 不支援多層主管（Team Manager + Dept Manager）同時審核的複合情境，只做直屬主管審核

**Alternatives considered**:
- 獨立的 `ManagerRelationship` 表：支援多對多，但 Phase 1 只需一對一直屬關係，過度設計
- AD/LDAP 動態查詢主管資訊：理想方案，但 Phase 1 假設員工資料手動維護，待 API 文件確認後評估
