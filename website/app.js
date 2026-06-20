// Empty API_URL → call the API at the same origin (/api), which Nginx
// reverse-proxies to the Node server. No port, no CORS, HTTPS-ready.
const API_URL =
  (window.APP_CONFIG && window.APP_CONFIG.API_URL) || '';

async function pingServer() {
  const el = document.getElementById('status');
  el.className = '';
  el.textContent = 'Pinging...';

  try {
    const res = await fetch(`${API_URL}/api/health`);
    const data = await res.json();
    el.textContent = `Server OK — ${data.message}`;
    el.className = 'ok';
  } catch {
    el.textContent = 'Server unreachable';
    el.className = 'fail';
  }
}

pingServer();
