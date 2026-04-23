# Quickstart: 服務承諾管理 端對端驗證腳本

**Branch**: `004-service-commitment` | **Date**: 2026-04-23

## 前置條件

- 資料庫 migration 完成（`npx prisma migrate dev --name add-service-commitment`）
- 至少一名 HR 帳號、一名 Employee 帳號、一名 Manager 帳號存在
- 課程「進階管理培訓」已建立（ACTIVE 狀態）、已有一個開放梯次

---

## Step 1：HR 設定課程服務承諾條款

1. HR 登入 → 課程管理 → 進入「進階管理培訓」詳情頁
2. 點擊「編輯」
3. 勾選「此課程需服務承諾書」
4. 填入：留任年限 = 24 個月、課程費用 = 30,000 元
5. 儲存

**預期結果**:
- 課程詳情頁顯示「服務承諾：24 個月 / 30,000 元」
- 現有已確認的報名不受影響

---

## Step 2：員工申請課程並通過審核

1. Employee 登入 → 課程瀏覽 → 報名「進階管理培訓」
2. Manager 登入 → 報名審核 → 核准
3. HR 登入 → 報名審核 → 核准

**預期結果**:
- 申請狀態變為 `PENDING_COMMITMENT`（而非 CONFIRMED）
- 員工收到「請簽署服務承諾書」通知（含 48 小時期限）
- HR 待結案清單不顯示此筆（尚未確認）

---

## Step 3：員工查看並簽署承諾書

1. Employee 登入 → 我的申請 → 找到狀態為「待簽署承諾書」的申請
2. 點擊「簽署承諾書」連結
3. 確認承諾書內容：
   - 課程名稱正確
   - 費用 30,000 元
   - 賠償試算表（6 個月 → 22,500 元、12 個月 → 15,000 元 等）
4. 點擊「確認簽署」

**預期結果**:
- 申請狀態更新為 `CONFIRMED`
- CommitmentRecord.signedAt 記錄當前時間
- CommitmentRecord.commitmentExpiresAt = signedAt + 24 個月
- 員工收到「承諾書簽署成功」確認通知

---

## Step 4：驗證 48 小時逾期自動取消

1. 建立另一筆相同課程的報名，通過審核至 `PENDING_COMMITMENT` 狀態
2. 手動將 `CommitmentRecord.signatureDeadline` 設為過去時間（模擬逾期）
3. 觸發 `/api/cron/commitment-expiry`（測試環境直接呼叫）

**預期結果**:
- 該筆申請狀態更新為 `CANCELLED`
- CommitmentRecord.status → `VOIDED`
- 員工與 HR 均收到逾期取消通知

---

## Step 5：HR 查看承諾書總覽

1. HR 登入 → 服務承諾管理頁
2. 確認清單顯示步驟 3 簽署的承諾書（狀態：ACTIVE）
3. 篩選「即將到期（30 天內）」→ 確認步驟 3 的承諾書不在清單（2 年後才到期）
4. 點擊承諾書詳情 → 確認賠償試算說明正確

**預期結果**:
- 清單正確顯示 ACTIVE 承諾書
- 30 天篩選正確過濾
- 詳情頁顯示完整承諾書資訊

---

## Step 6：HR 標記員工離職並查看賠償計算

1. HR 登入 → 員工管理 → 找到步驟 3 的員工
2. 點擊「標記離職」
3. 填入離職日期（例如今天）
4. 系統顯示賠償試算確認對話框

**預期結果**:
- 確認對話框顯示：「此員工有 1 筆服務承諾書仍在期限內」
- 賠償金額正確（依公式計算）
- 若課程尚未開始：顯示「全額賠償 30,000 元（課程尚未開始即離職）」
- 確認後：Employee.isActive = false、Employee.resignedAt = 填入日期
- CommitmentRecord.status → `COMPENSATION_NOTED`、補填 compensationAmount
- HR 收到賠償計算通知

---

## Step 7：月度提醒排程驗證

1. 建立一筆 30 天內到期的承諾書（手動設定 `commitmentExpiresAt`）
2. 觸發 `/api/cron/commitment-monthly-reminder`

**預期結果**:
- HR 收到通知，列出即將到期的員工清單
- 通知內容包含：員工姓名、課程、到期日、剩餘天數

---

## Step 8：邊界條件驗證

| 情境 | 預期行為 |
|------|---------|
| 承諾費用為 0 | 系統顯示警告但允許儲存；仍需簽署承諾書 |
| 員工已有多筆有效承諾書後離職 | 所有承諾書分別計算，顯示合計金額 |
| 課程已設承諾但後來關閉此設定 | 已簽署的承諾書繼續有效，新報名不需簽署 |
| 員工重複報名同一課程 | 第二次報名建立新承諾書；第一次承諾書標記 VOIDED |
