# 宇倪三百天

每天追蹤回家時間，自動計算 quota。

## Notion 資料庫設定

### 回家記錄 Database
欄位：`Date` (Date), `HomeTime` (Text), `EarnedQuota` (Number), `UsedQuota` (Number), `OnTime` (Checkbox), `Note` (Text)

### 設定 Database（可選）
欄位：`Name` (Title), `Deadline` (Text), `YoutubeUrl` (URL)

## Zeabur 環境變數

```
NOTION_TOKEN=secret_xxx...
NOTION_RECORDS_DB_ID=xxx...
NOTION_SETTINGS_DB_ID=xxx...  # 可選
DEADLINE=23:00
PORT=3000
```

## Quota 規則

- 提早回家 → 賺 (截止時間 - 回家時間) 分鐘
- 超時回家 → 自動扣除 quota（最多扣 60 分鐘/天）
- 截止時間可在 App 設定頁自訂
# yuni300
