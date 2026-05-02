// CyberLeaner — Level 2: Brute Force Logic
let l2Timer;
let currentAttempts = 0;

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  // Start level
  await apiRequest('/levels/2/start', { method: 'POST' });

  // Load progress
  const { ok, data } = await apiRequest('/levels/progress');
  if (ok && data.progress) {
    const level2 = data.progress.find(l => l.level_number === 2);
    if (level2) {
      if (level2.status === 'locked') { window.location.href = '/dashboard.html'; return; }
      currentAttempts = level2.attempts || 0;
      if (level2.start_time) {
        l2Timer = new LevelTimer('timer-2', 'timer-label-2');
        if (level2.status === 'completed') { l2Timer.showCompleted(level2.duration_seconds); }
        else { l2Timer.start(level2.start_time); }
      }
    }
  }

  renderAttemptDots();

  // Form handler
  document.getElementById('brute-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('brute-password').value;
    const btn = document.getElementById('crack-btn');

    btn.disabled = true;
    btn.textContent = '⏳ ATTEMPTING...';

    // Show delay indicator for attempts 4+
    if (currentAttempts + 1 >= 4 && currentAttempts + 1 < 10) {
      const delayS = (currentAttempts + 1 >= 7) ? 5 : 2;
      showDelay(delayS);
    }

    addTerminalLine('prompt', `Trying password: ${password || '(empty)'}...`);

    const { ok, data: result } = await apiRequest('/levels/2/attempt', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });

    hideDelay();

    if (result.success) {
      currentAttempts = result.attempts;
      renderAttemptDots(true);
      addTerminalLine('success', '✅ ' + result.message);
      await completeLevel2();
    } else {
      currentAttempts = result.attempts;
      renderAttemptDots();
      addTerminalLine('error', `✘ ${result.message}`);
      if (result.hint) { addTerminalLine('output', `💡 ${result.hint}`); }
      document.getElementById('brute-password').value = '';
      btn.disabled = false;
      btn.textContent = '🔨 CRACK THE SYSTEM';
    }
  });
});

function renderAttemptDots(allSuccess = false) {
  const container = document.getElementById('attempt-dots');
  container.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const dot = document.createElement('div');
    dot.className = 'attempt-dot';
    if (i < currentAttempts) dot.classList.add(allSuccess && i === currentAttempts - 1 ? 'success' : 'used');
    container.appendChild(dot);
  }
  document.getElementById('attempt-text').textContent = `${currentAttempts} / 10 attempts`;
  document.getElementById('progress-fill').style.width = `${(currentAttempts / 10) * 100}%`;
}

function addTerminalLine(type, text) {
  const terminal = document.getElementById('brute-terminal');
  const line = document.createElement('div');
  line.className = 'terminal-line fade-in';
  if (type === 'prompt') line.innerHTML = `<span class="prompt">brute@force:~$</span> <span class="cmd">${text}</span>`;
  else if (type === 'error') line.innerHTML = `<span class="error">${text}</span>`;
  else if (type === 'success') line.innerHTML = `<span class="success">${text}</span>`;
  else line.innerHTML = `<span class="output">${text}</span>`;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

function showDelay(seconds) {
  const el = document.getElementById('delay-indicator');
  el.style.display = 'block';
  document.getElementById('delay-text').textContent = `System imposing ${seconds}s delay...`;
}

function hideDelay() {
  document.getElementById('delay-indicator').style.display = 'none';
}

async function completeLevel2() {
  const { ok, data } = await apiRequest('/levels/2/complete', { method: 'POST' });
  if (ok) {
    if (l2Timer) l2Timer.stop();
    const info = document.getElementById('completion-info');
    if (info && data.duration_seconds) info.textContent = `Completed in ${formatDuration(data.duration_seconds)}`;
    document.getElementById('success-modal').classList.add('show');
  }
}
