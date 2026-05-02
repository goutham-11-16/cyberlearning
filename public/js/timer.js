// CyberLeaner — Persistent Timer Utility
class LevelTimer {
  constructor(displayElementId, labelElementId) {
    this.displayEl = document.getElementById(displayElementId);
    this.labelEl = document.getElementById(labelElementId);
    this.interval = null;
    this.startTime = null;
  }

  start(startTimeISO) {
    this.stop();
    this.startTime = new Date(startTimeISO);
    this.update();
    this.interval = setInterval(() => this.update(), 1000);
  }

  update() {
    if (!this.startTime || !this.displayEl) return;
    const now = new Date();
    const elapsed = Math.floor((now - this.startTime) / 1000);
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    this.displayEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  stop() {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
  }

  showCompleted(durationSeconds) {
    this.stop();
    if (this.displayEl) {
      this.displayEl.textContent = formatDuration(durationSeconds);
      this.displayEl.style.color = '#05ffa1';
    }
    if (this.labelEl) this.labelEl.textContent = 'COMPLETED IN';
  }
}
