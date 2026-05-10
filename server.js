require('dotenv').config();
const express = require('express');
const path = require('path');
const notion = require('./src/api/notion');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const wrap = fn => (req, res) =>
  fn(req, res).catch(err => {
    console.error('[API Error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  });

app.get('/api/status', (req, res) => {
  res.json({
    notionConfigured: !!(process.env.NOTION_TOKEN && process.env.NOTION_RECORDS_DB_ID),
    settingsDbConfigured: !!process.env.NOTION_SETTINGS_DB_ID,
  });
});

app.get('/api/records', wrap(async (req, res) => {
  const records = await notion.getAllRecords();
  res.json({ success: true, records });
}));

app.post('/api/record', wrap(async (req, res) => {
  const { date, homeTime, note } = req.body;
  if (!date || !homeTime) return res.status(400).json({ success: false, error: 'Missing fields' });

  const settings = await notion.getSettings();
  const deadline = settings.deadline || '23:00';

  const allRecords = await notion.getAllRecords();
  const todayRecord = allRecords.find(r => r.date === date);
  const baseRecords = allRecords.filter(r => r.date !== date);
  const totalEarned = baseRecords.reduce((a, r) => a + (r.earnedQuota || 0), 0);
  const totalUsed   = baseRecords.reduce((a, r) => a + (r.usedQuota   || 0), 0);
  const prevUsed    = todayRecord?.usedQuota || 0;
  const availableQuota = Math.max(0, totalEarned - totalUsed + prevUsed);

  const record = await notion.upsertRecord({ date, homeTime, note, deadline, availableQuota });
  res.json({ success: true, record, availableQuota });
}));

app.get('/api/settings', wrap(async (req, res) => {
  const settings = await notion.getSettings();
  res.json({ success: true, settings });
}));

app.post('/api/settings', wrap(async (req, res) => {
  const { deadline, youtubeUrl } = req.body;
  const settings = await notion.saveSettings({ deadline, youtubeUrl });
  res.json({ success: true, settings });
}));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🏠 宇倪三百天 on :${PORT}`));
