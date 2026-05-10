const { Client } = require('@notionhq/client');

function getClient() {
  if (!process.env.NOTION_TOKEN) throw new Error('NOTION_TOKEN not set');
  return new Client({ auth: process.env.NOTION_TOKEN });
}

const MAX_QUOTA_USE = 60; // max minutes of quota usable per day

function timeToMins(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

function getDeadlineMins(deadlineStr) {
  return deadlineStr ? timeToMins(deadlineStr) : 23 * 60;
}

// Earned quota: how many minutes early before deadline
function earnedQuota(homeTime, deadlineStr) {
  const dl = getDeadlineMins(deadlineStr);
  const mins = timeToMins(homeTime);
  return mins < dl ? dl - mins : 0;
}

// Used quota: how many minutes over deadline (capped at MAX_QUOTA_USE)
function usedQuota(homeTime, deadlineStr, availableQuota) {
  const dl = getDeadlineMins(deadlineStr);
  const mins = timeToMins(homeTime);
  if (mins <= dl) return 0;
  const over = mins - dl;
  // Can only use up to MAX_QUOTA_USE per day AND what's available
  return Math.min(over, MAX_QUOTA_USE, availableQuota);
}

// Whether the record is "on time" after accounting for quota usage
function isOnTime(homeTime, deadlineStr, availableQuota) {
  const dl = getDeadlineMins(deadlineStr);
  const mins = timeToMins(homeTime);
  if (mins <= dl) return true;
  const over = mins - dl;
  return over <= Math.min(MAX_QUOTA_USE, availableQuota);
}

// ─── Records DB ──────────────────────────────────────────────

async function getAllRecords() {
  const notion = getClient();
  const dbId = process.env.NOTION_RECORDS_DB_ID;
  if (!dbId) throw new Error('NOTION_RECORDS_DB_ID not set');

  const res = await notion.databases.query({
    database_id: dbId,
    sorts: [{ property: 'Date', direction: 'descending' }],
    page_size: 300,
  });

  return res.results.map(page => mapRecord(page));
}

function mapRecord(page) {
  const p = page.properties;
  return {
    id: page.id,
    date: p.Date?.date?.start ?? null,
    homeTime: p.HomeTime?.rich_text?.[0]?.plain_text ?? null,
    earnedQuota: p.EarnedQuota?.number ?? 0,
    usedQuota: p.UsedQuota?.number ?? 0,
    onTime: p.OnTime?.checkbox ?? false,
    note: p.Note?.rich_text?.[0]?.plain_text ?? '',
  };
}

async function upsertRecord({ date, homeTime, note = '', deadline, availableQuota = 0 }) {
  const notion = getClient();
  const dbId = process.env.NOTION_RECORDS_DB_ID;
  if (!dbId) throw new Error('NOTION_RECORDS_DB_ID not set');

  const earned = earnedQuota(homeTime, deadline);
  const used   = usedQuota(homeTime, deadline, availableQuota);
  const onT    = isOnTime(homeTime, deadline, availableQuota);

  // Check if record for this date already exists
  const existing = await notion.databases.query({
    database_id: dbId,
    filter: { property: 'Date', date: { equals: date } },
  });

  const props = {
    Date: { date: { start: date } },
    HomeTime: { rich_text: [{ text: { content: homeTime } }] },
    EarnedQuota: { number: earned },
    UsedQuota:   { number: used },
    OnTime:      { checkbox: onT },
    Note: { rich_text: note ? [{ text: { content: note } }] : [] },
  };

  let page;
  if (existing.results.length > 0) {
    page = await notion.pages.update({ page_id: existing.results[0].id, properties: props });
  } else {
    page = await notion.pages.create({ parent: { database_id: dbId }, properties: props });
  }

  return mapRecord(page);
}

// ─── Settings DB ─────────────────────────────────────────────

async function getSettings() {
  const defaults = {
    deadline:   process.env.DEADLINE    || '23:00',
    youtubeUrl: process.env.YOUTUBE_URL || '',
  };

  const dbId = process.env.NOTION_SETTINGS_DB_ID;
  if (!dbId) return defaults;

  try {
    const notion = getClient();
    const res = await notion.databases.query({ database_id: dbId, page_size: 1 });
    if (res.results.length === 0) return defaults;
    const p = res.results[0].properties;
    return {
      deadline:   p.Deadline?.rich_text?.[0]?.plain_text ?? defaults.deadline,
      youtubeUrl: p.YoutubeUrl?.url ?? defaults.youtubeUrl,
    };
  } catch {
    return defaults;
  }
}

async function saveSettings({ deadline, youtubeUrl }) {
  const dbId = process.env.NOTION_SETTINGS_DB_ID;
  if (!dbId) return { deadline, youtubeUrl };

  const notion = getClient();
  const res = await notion.databases.query({ database_id: dbId, page_size: 1 });

  const props = {
    Name:       { title: [{ text: { content: '設定' } }] },
    Deadline:   { rich_text: [{ text: { content: deadline || '23:00' } }] },
    YoutubeUrl: { url: youtubeUrl || null },
  };

  if (res.results.length > 0) {
    await notion.pages.update({ page_id: res.results[0].id, properties: props });
  } else {
    await notion.pages.create({ parent: { database_id: dbId }, properties: props });
  }
  return { deadline, youtubeUrl };
}

module.exports = {
  getAllRecords, upsertRecord, getSettings, saveSettings,
  earnedQuota, usedQuota, isOnTime, timeToMins, getDeadlineMins, MAX_QUOTA_USE,
};
