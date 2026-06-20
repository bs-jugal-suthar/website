const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// CORS — allow the static site (served by Nginx) to call this API.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

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

app.listen(PORT, () => {
  console.log(`API server running on http://0.0.0.0:${PORT}`);
});
