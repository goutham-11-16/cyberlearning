// CyberLeaner — Dashboard Logic
const timers = {};

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  const user = getUser();
  if (user) {
    document.getElementById('user-name').textContent = user.name || 'Agent';
    document.getElementById('user-email').textContent = user.email || '';
    if (user.is_admin || user.email === 'esambadigouthamreddy@gmail.com') {
      const link = document.getElementById('admin-link');
      if (link) { link.style.display = 'inline'; link.href = '/admin.html'; }
    }
  }
  loadProgress();
});

async function loadProgress() {
  const { ok, data } = await apiRequest('/levels/progress');
  if (!ok || !data.progress) return;

  data.progress.forEach(level => {
    const card = document.getElementById(`level-card-${level.level_number}`);
    const status = document.getElementById(`status-${level.level_number}`);
    const btn = document.getElementById(`start-btn-${level.level_number}`);
    if (!card || !status) return;

    // Reset card classes
    card.classList.remove('locked', 'completed');

    if (level.status === 'locked') {
      card.classList.add('locked');
      status.className = 'status-badge status-locked';
      status.textContent = '🔒 LOCKED';
      if (btn) { btn.disabled = true; btn.textContent = '🔒 LOCKED'; }
    } else if (level.status === 'unlocked') {
      status.className = 'status-badge status-unlocked';
      status.textContent = '🟢 UNLOCKED';
      if (btn) { btn.disabled = false; btn.textContent = '▶ START CHALLENGE'; }
    } else if (level.status === 'in_progress') {
      status.className = 'status-badge status-in-progress';
      status.textContent = '⏱️ IN PROGRESS';
      if (btn) { btn.textContent = '▶ CONTINUE'; btn.disabled = false; }
      // Start persistent timer
      if (level.start_time) {
        const timer = new LevelTimer(`timer-${level.level_number}`, `timer-label-${level.level_number}`);
        timer.start(level.start_time);
        timers[level.level_number] = timer;
      }
    } else if (level.status === 'completed') {
      card.classList.add('completed');
      status.className = 'status-badge status-completed';
      status.textContent = '✅ COMPLETED';
      if (btn) { btn.textContent = '✅ COMPLETED'; btn.disabled = true; btn.className = 'btn btn-green btn-sm'; btn.style.width = '100%'; btn.style.marginTop = '8px'; }
      // Show completion time
      const timer = new LevelTimer(`timer-${level.level_number}`, `timer-label-${level.level_number}`);
      timer.showCompleted(level.duration_seconds);
    }
  });
}

async function startLevel(levelNumber) {
  const { ok, data } = await apiRequest(`/levels/${levelNumber}/start`, { method: 'POST' });
  if (!ok) { alert(data.error || 'Failed to start level'); return; }

  // Navigate to level page
  window.location.href = `/level${levelNumber}.html`;
}
