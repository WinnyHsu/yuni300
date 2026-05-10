module.exports = (req, res) => {
  res.json({
    notionConfigured:   !!(process.env.NOTION_TOKEN && process.env.NOTION_RECORDS_DB_ID),
    settingsDbConfigured: !!process.env.NOTION_SETTINGS_DB_ID,
  });
};
