// CyberLeaner — Frontend Configuration
const CONFIG = {
  API_BASE: window.location.origin + '/api',
  TOKEN_KEY: 'cl_token',
  USER_KEY: 'cl_user',
};

// Auth helpers
function getToken() { return localStorage.getItem(CONFIG.TOKEN_KEY); }
function setToken(token) { localStorage.setItem(CONFIG.TOKEN_KEY, token); }
function getUser() { try { return JSON.parse(localStorage.getItem(CONFIG.USER_KEY)); } catch { return null; } }
function setUser(user) { localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user)); }
function clearAuth() { localStorage.removeItem(CONFIG.TOKEN_KEY); localStorage.removeItem(CONFIG.USER_KEY); }
function isLoggedIn() { return !!getToken(); }

// API helper
async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${CONFIG.API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (res.status === 401) { clearAuth(); window.location.href = '/login.html'; return; }
  return { ok: res.ok, status: res.status, data };
}

// Format date as DD-MM-YYYY : HH:MM
function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2,'0');
  const min = String(d.getMinutes()).padStart(2,'0');
  return `${dd}-${mm}-${yyyy} : ${hh}:${min}`;
}

// Format seconds to duration string
function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// Show alert message
function showAlert(elementId, message, type = 'error') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.className = `alert alert-${type} show`;
  el.textContent = message;
  if (type === 'success' || type === 'info') setTimeout(() => el.classList.remove('show'), 5000);
}

// Redirect if not logged in
function requireAuth() {
  if (!isLoggedIn()) { window.location.href = '/login.html'; return false; }
  return true;
}
