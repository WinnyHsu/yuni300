const { getAllRecords, upsertRecord, getSettings } = require('./_notion');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { date, homeTime, note } = req.body;
    if (!date || !homeTime)
      return res.status(400).json({ success: false, error: 'Missing date or homeTime' });

    const settings  = await getSettings();
    const deadline  = settings.deadline || '23:00';
    const allRecs   = await getAllRecords();
    const todayRec  = allRecs.find(r => r.date === date);
    const baseRecs  = allRecs.filter(r => r.date !== date);
    const earned    = baseRecs.reduce((a, r) => a + (r.earnedQuota || 0), 0);
    const used      = baseRecs.reduce((a, r) => a + (r.usedQuota   || 0), 0);
    const prevUsed  = todayRec?.usedQuota || 0;
    const available = Math.max(0, earned - used + prevUsed);

    const record = await upsertRecord({ date, homeTime, note, deadline, availableQuota: available });
    res.json({ success: true, record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};
