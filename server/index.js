const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
// Bind to localhost only — the API is reached through the Nginx reverse
// proxy (/api), never directly from the internet.
const HOST = process.env.HOST || '127.0.0.1';

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: `running on port ${PORT}`,
    uptime: Math.floor(process.uptime()) + 's',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/info', (req, res) => {
  res.json({
    node: process.version,
    platform: process.platform,
    pid: process.pid,
  });
});

app.listen(PORT, HOST, () => {
  console.log(`API server running on http://${HOST}:${PORT}`);
});
