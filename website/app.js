const API_URL =
  (window.APP_CONFIG && window.APP_CONFIG.API_URL) || '';

async function pingServer() {
  const el = document.getElementById('status');

  try {
    const res = await fetch(`${API_URL}/api/health`);
    const data = await res.json();
    el.textContent = `Server OK — ${data.uptime} uptime`;
    el.className = 'status ok';
  } catch {
    el.textContent = 'API offline';
    el.className = 'status fail';
  }
}

pingServer();
