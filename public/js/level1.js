// CyberLeaner — Level 1: SQL Injection Logic
let l1Timer;

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  // Start level if not started
  await apiRequest('/levels/1/start', { method: 'POST' });

  // Load progress and start timer
  const { ok, data } = await apiRequest('/levels/progress');
  if (ok && data.progress) {
    const level1 = data.progress.find(l => l.level_number === 1);
    if (level1 && level1.start_time) {
      l1Timer = new LevelTimer('timer-1', 'timer-label-1');
      if (level1.status === 'completed') {
        l1Timer.showCompleted(level1.duration_seconds);
      } else {
        l1Timer.start(level1.start_time);
      }
    }
  }

  // Form handler
  document.getElementById('sql-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('sql-username').value;
    const password = document.getElementById('sql-password').value;

    if (!username && !password) {
      showAlert('level-alert', 'Enter credentials to attempt authentication', 'warning');
      return;
    }

    addTerminalLine('prompt', `Attempting login as: ${username}...`);

    const { ok, data } = await apiRequest('/levels/1/attempt', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (data.success) {
      // Level completed!
      addTerminalLine('success', '✅ Authentication bypassed!');
      await completeLevel1();
    } else if (data.type === 'sql_injection_detected') {
      addTerminalLine('error', '⚠ SQL injection pattern detected!');
      document.getElementById('sql-modal').classList.add('show');
    } else {
      addTerminalLine('error', `✘ ${data.message}`);
      showAlert('level-alert', data.message, 'error');
    }
  });
});

function addTerminalLine(type, text) {
  const output = document.getElementById('terminal-output');
  const line = document.createElement('div');
  line.className = 'terminal-line fade-in';
  if (type === 'prompt') {
    line.innerHTML = `<span class="prompt">user@attack:~$</span> <span class="cmd">${text}</span>`;
  } else if (type === 'error') {
    line.innerHTML = `<span class="error">${text}</span>`;
  } else if (type === 'success') {
    line.innerHTML = `<span class="success">${text}</span>`;
  } else {
    line.innerHTML = `<span class="output">${text}</span>`;
  }
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

function closeModal() {
  document.getElementById('sql-modal').classList.remove('show');
}

async function completeLevel1() {
  const { ok, data } = await apiRequest('/levels/1/complete', { method: 'POST' });
  if (ok) {
    if (l1Timer) l1Timer.stop();
    const info = document.getElementById('completion-info');
    if (info && data.duration_seconds) {
      info.textContent = `Completed in ${formatDuration(data.duration_seconds)}`;
    }
    document.getElementById('success-modal').classList.add('show');
  }
}

function goToNext() {
  window.location.href = '/dashboard.html';
}

// Easter egg: expose bypass hint in console
console.log('%c🔑 HINT: Try sending a custom header with your request...', 'color: #00f0ff; font-size: 14px; font-weight: bold;');
console.log('%cHeader Name: X-Auth-Bypass', 'color: #ffd700; font-size: 12px;');
console.log('%cHeader Value: true', 'color: #05ffa1; font-size: 12px;');
