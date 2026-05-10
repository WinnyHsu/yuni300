# 宇倪三百天

每天追蹤回家時間，自動計算 quota。

## 專案結構（Vercel 版）

```
yunei-300days/
├── api/
│   ├── _notion.js    # Notion 共用邏輯
│   ├── records.js    # GET  /api/records
│   ├── record.js     # POST /api/record
│   ├── settings.js   # GET/POST /api/settings
│   └── status.js     # GET  /api/status
├── public/
│   └── index.html    # 前端 App
├── vercel.json
└── package.json
```

## Notion 資料庫設定

### 回家記錄 Database
欄位：`Date` (Date), `HomeTime` (Text), `EarnedQuota` (Number),
`UsedQuota` (Number), `OnTime` (Checkbox), `Note` (Text)

### 設定 Database（可選）
欄位：`Name` (Title), `Deadline` (Text), `YoutubeUrl` (URL)

## Vercel 部署步驟

1. 把這個資料夾推到 GitHub
2. 前往 vercel.com → Import Git Repository
3. 在 Settings → Environment Variables 填入：

```
NOTION_TOKEN          = secret_xxx...
NOTION_RECORDS_DB_ID  = 32字元資料庫ID
NOTION_SETTINGS_DB_ID = 32字元資料庫ID（可選）
DEADLINE              = 23:00
```

4. Deploy！拿到 xxx.vercel.app 網址
5. iPhone Safari 開啟 → 分享 → 加入主畫面

## Quota 規則

- 提早回家 → 賺 (截止時間 - 回家時間) 分鐘
- 超時回家 → 自動扣除 quota（最多扣 60 分鐘/天）
- 截止時間可在 App 設定頁自訂
