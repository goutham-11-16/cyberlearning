// CyberLeaner — Admin Panel Logic
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  loadStats();
  loadUsers();
  loadSettings();
});

async function loadStats() {
  const { ok, data } = await apiRequest('/admin/stats');
  if (ok && data.stats) {
    document.getElementById('stat-users').textContent = data.stats.total_users;
    document.getElementById('stat-l1').textContent = data.stats.level1_completed;
    document.getElementById('stat-l2').textContent = data.stats.level2_completed;
  }
}

async function loadUsers() {
  const { ok, data } = await apiRequest('/admin/users');
  if (!ok) return;

  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = '';

  if (!data.users || data.users.length === 0) {
    document.getElementById('no-users').style.display = 'block';
    return;
  }

  data.users.forEach(user => {
    const l1 = user.levels.find(l => l.level_number === 1) || {};
    const l2 = user.levels.find(l => l.level_number === 2) || {};
    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="color:var(--text-primary);font-weight:500;">${user.name}</td>
      <td>${user.email}</td>
      <td><span style="color:var(--cyan);">${user.current_level}</span></td>
      <td>${formatDateTime(l1.start_time)}</td>
      <td>${formatDateTime(l1.end_time)}</td>
      <td style="color:var(--gold);">${l1.duration_seconds ? formatDuration(l1.duration_seconds) : '—'}</td>
      <td>${formatDateTime(l2.start_time)}</td>
      <td>${formatDateTime(l2.end_time)}</td>
      <td style="color:var(--gold);">${l2.duration_seconds ? formatDuration(l2.duration_seconds) : '—'}</td>
    `;
    tbody.appendChild(row);
  });
}

async function loadSettings() {
  const { ok, data } = await apiRequest('/admin/settings');
  if (!ok || !data.settings) return;

  const grid = document.getElementById('settings-grid');
  grid.innerHTML = '';

  const labels = {
    resend_api_key: 'Resend API Key',
    email_from: 'Sender Email',
    email_enabled: 'Email Enabled (true/false)',
    smtp_host: 'SMTP Host',
    smtp_port: 'SMTP Port',
    smtp_user: 'SMTP Username',
    smtp_pass: 'SMTP Password',
  };

  data.settings.forEach(s => {
    const group = document.createElement('div');
    group.className = 'form-group';
    const isPassword = s.setting_key.includes('key') || s.setting_key.includes('pass');
    group.innerHTML = `
      <label>${labels[s.setting_key] || s.setting_key}</label>
      <input type="${isPassword ? 'password' : 'text'}" 
             value="${s.setting_value || ''}" 
             data-key="${s.setting_key}" 
             placeholder="${s.description || ''}">
    `;
    grid.appendChild(group);
  });
}

async function saveSettings() {
  const inputs = document.querySelectorAll('#settings-grid input[data-key]');
  const settings = [];
  inputs.forEach(input => {
    settings.push({ key: input.dataset.key, value: input.value });
  });

  const { ok } = await apiRequest('/admin/settings', {
    method: 'PUT',
    body: JSON.stringify({ settings }),
  });

  if (ok) {
    showAlert('settings-alert', 'Settings saved successfully!', 'success');
  } else {
    showAlert('settings-alert', 'Failed to save settings', 'error');
  }
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');
  event.target.classList.add('active');
}

function exportCSV() {
  const table = document.getElementById('users-table');
  const rows = table.querySelectorAll('tr');
  let csv = '';
  rows.forEach(row => {
    const cells = row.querySelectorAll('th, td');
    const rowData = [];
    cells.forEach(cell => rowData.push(`"${cell.textContent.replace(/"/g, '""')}"`));
    csv += rowData.join(',') + '\n';
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `cyberleaner_users_${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}
