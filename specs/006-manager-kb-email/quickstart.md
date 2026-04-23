# Quickstart: 進階功能整合

**Feature**: 006-manager-kb-email
**Date**: 2026-04-23

---

## Step 1: 驗證 Schema Migration

```bash
npx prisma migrate dev --name add-knowledge-base-and-notification-skipped
```

確認：`KnowledgeBaseResource` table 建立、`NotificationStatus` 新增 `SKIPPED` 值。

---

## Step 2: 驗證 US1 — 管理者儀表板

1. 以 `manager01 / dev` 登入（主管角色）
2. 導覽至 `/manager/dashboard`
3. 確認顯示直屬下屬訓練狀態（已完訓 / 未完訓）
4. 確認「待審申請」清單顯示下屬的 PENDING_MANAGER 申請

**預期**: 頁面顯示正確人數與達標率，空白狀態無報錯。

---

## Step 3: 驗證 US2 — 知識庫（HR 端）

1. 以 `hr01 / dev` 登入
2. 進入任一課程詳情頁 → 知識庫資源區塊
3. 新增一筆 LINK 資源（標題 + URL）
4. 新增一筆 TEXT 資源（標題 + 說明文字）
5. 確認兩筆資源出現在清單中
6. 刪除其中一筆，確認清單更新

---

## Step 4: 驗證 US2 — 知識庫（員工端）

1. 以 `employee01 / dev` 登入
2. 進入有報名的課程詳情頁
3. 確認知識庫資源區塊顯示 HR 新增的資源
4. 點擊連結確認可開啟（type=LINK）

---

## Step 5: 驗證 US3 — Email 靜默模式（無 SMTP）

1. 確認 `.env` 中 `SMTP_HOST` 為空
2. 觸發任意通知（如：HR 核准一筆申請）
3. 查看 NotificationLog：status 應為 `SKIPPED`
4. 確認業務動作（核准）成功完成，無例外拋出

---

## Step 6: 驗證 US3 — Email 寄送（有 SMTP）

1. 設定有效的 SMTP 環境變數
2. 觸發通知（HR 核准申請）
3. 確認申請員工收到 Email
4. 查看 NotificationLog：status 應為 `SENT`
