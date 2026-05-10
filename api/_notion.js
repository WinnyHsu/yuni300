const { Client } = require('@notionhq/client');

function getClient() {
  if (!process.env.NOTION_TOKEN) throw new Error('NOTION_TOKEN not set');
  return new Client({ auth: process.env.NOTION_TOKEN });
}

const MAX_QUOTA_USE = 60;

function timeToMins(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

function getDeadlineMins(dl) {
  return dl ? timeToMins(dl) : 23 * 60;
}

function earnedQuota(homeTime, deadline) {
  const dl = getDeadlineMins(deadline);
  const m  = timeToMins(homeTime);
  return m < dl ? dl - m : 0;
}

function usedQuota(homeTime, deadline, available) {
  const dl = getDeadlineMins(deadline);
  const m  = timeToMins(homeTime);
  if (m <= dl) return 0;
  return Math.min(m - dl, MAX_QUOTA_USE, available);
}

function isOnTime(homeTime, deadline, available) {
  const dl = getDeadlineMins(deadline);
  const m  = timeToMins(homeTime);
  if (m <= dl) return true;
  return (m - dl) <= Math.min(MAX_QUOTA_USE, available);
}

function mapRecord(page) {
  const p = page.properties;
  return {
    id:          page.id,
    date:        p.Date?.date?.start ?? null,
    homeTime:    p.HomeTime?.rich_text?.[0]?.plain_text ?? null,
    earnedQuota: p.EarnedQuota?.number ?? 0,
    usedQuota:   p.UsedQuota?.number   ?? 0,
    onTime:      p.OnTime?.checkbox    ?? false,
    note:        p.Note?.rich_text?.[0]?.plain_text ?? '',
  };
}

async function getAllRecords() {
  const notion = getClient();
  const dbId   = process.env.NOTION_RECORDS_DB_ID;
  if (!dbId) throw new Error('NOTION_RECORDS_DB_ID not set');

  const res = await notion.databases.query({
    database_id: dbId,
    sorts: [{ property: 'Date', direction: 'descending' }],
    page_size: 300,
  });
  return res.results.map(mapRecord);
}

async function upsertRecord({ date, homeTime, note = '', deadline, availableQuota = 0 }) {
  const notion = getClient();
  const dbId   = process.env.NOTION_RECORDS_DB_ID;
  if (!dbId) throw new Error('NOTION_RECORDS_DB_ID not set');

  const earned = earnedQuota(homeTime, deadline);
  const used   = usedQuota(homeTime, deadline, availableQuota);
  const onT    = isOnTime(homeTime, deadline, availableQuota);

  const existing = await notion.databases.query({
    database_id: dbId,
    filter: { property: 'Date', date: { equals: date } },
  });

  const props = {
    Date:        { date: { start: date } },
    HomeTime:    { rich_text: [{ text: { content: homeTime } }] },
    EarnedQuota: { number: earned },
    UsedQuota:   { number: used },
    OnTime:      { checkbox: onT },
    Note:        { rich_text: note ? [{ text: { content: note } }] : [] },
  };

  const page = existing.results.length > 0
    ? await notion.pages.update({ page_id: existing.results[0].id, properties: props })
    : await notion.pages.create({ parent: { database_id: dbId }, properties: props });

  return mapRecord(page);
}

async function getSettings() {
  const defaults = {
    deadline:   process.env.DEADLINE    || '23:00',
    youtubeUrl: process.env.YOUTUBE_URL || '',
  };
  const dbId = process.env.NOTION_SETTINGS_DB_ID;
  if (!dbId) return defaults;
  try {
    const notion = getClient();
    const res    = await notion.databases.query({ database_id: dbId, page_size: 1 });
    if (!res.results.length) return defaults;
    const p = res.results[0].properties;
    return {
      deadline:   p.Deadline?.rich_text?.[0]?.plain_text ?? defaults.deadline,
      youtubeUrl: p.YoutubeUrl?.url ?? defaults.youtubeUrl,
    };
  } catch { return defaults; }
}

async function saveSettings({ deadline, youtubeUrl }) {
  const dbId = process.env.NOTION_SETTINGS_DB_ID;
  if (!dbId) return { deadline, youtubeUrl };
  const notion = getClient();
  const res    = await notion.databases.query({ database_id: dbId, page_size: 1 });
  const props  = {
    Name:       { title: [{ text: { content: '設定' } }] },
    Deadline:   { rich_text: [{ text: { content: deadline || '23:00' } }] },
    YoutubeUrl: { url: youtubeUrl || null },
  };
  if (res.results.length > 0)
    await notion.pages.update({ page_id: res.results[0].id, properties: props });
  else
    await notion.pages.create({ parent: { database_id: dbId }, properties: props });
  return { deadline, youtubeUrl };
}

module.exports = { getAllRecords, upsertRecord, getSettings, saveSettings, MAX_QUOTA_USE };
