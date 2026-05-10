const { getSettings, saveSettings } = require('./_notion');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const settings = await getSettings();
      return res.json({ success: true, settings });
    }
    if (req.method === 'POST') {
      const { deadline, youtubeUrl } = req.body;
      const settings = await saveSettings({ deadline, youtubeUrl });
      return res.json({ success: true, settings });
    }
    res.status(405).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};
