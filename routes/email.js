const { supabaseAdmin } = require('../config/supabase');

/**
 * Send congratulation email after level completion (Future — requires API key config)
 */
async function sendCongratulationEmail(userEmail, userName, levelNumber, startTime, endTime, durationSeconds) {
  // Check if email is configured via admin settings
  const { data: settings } = await supabaseAdmin
    .from('admin_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['resend_api_key', 'email_from', 'email_enabled']);

  const settingsMap = {};
  (settings || []).forEach(s => { settingsMap[s.setting_key] = s.setting_value; });

  if (settingsMap.email_enabled !== 'true' || !settingsMap.resend_api_key) {
    console.log(`[EMAIL] Skipped — email not configured. Would send to ${userEmail} for Level ${levelNumber}`);
    return { sent: false, reason: 'Email not configured' };
  }

  // Format times
  const start = new Date(startTime);
  const end = new Date(endTime);
  const formatDate = (d) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} : ${hh}:${min}`;
  };

  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;
  const durationStr = `${hours}h ${minutes}m ${seconds}s`;

  const levelNames = { 1: 'SQL Injection', 2: 'Brute Force' };
  const html = `
    <div style="background:#0a0a0f;color:#e0e0e8;padding:40px;font-family:'Courier New',monospace;border:1px solid #00f0ff;">
      <h1 style="color:#00f0ff;text-align:center;">🎉 LEVEL ${levelNumber} COMPLETE</h1>
      <h2 style="color:#05ffa1;text-align:center;">${levelNames[levelNumber] || `Level ${levelNumber}`}</h2>
      <hr style="border-color:#00f0ff33;">
      <p>Congratulations, <strong style="color:#00f0ff;">${userName}</strong>!</p>
      <p>You have successfully completed Level ${levelNumber} of CyberLeaner.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr><td style="padding:8px;color:#888;">Start Time</td><td style="padding:8px;color:#05ffa1;">${formatDate(start)}</td></tr>
        <tr><td style="padding:8px;color:#888;">End Time</td><td style="padding:8px;color:#ff2a6d;">${formatDate(end)}</td></tr>
        <tr><td style="padding:8px;color:#888;">Total Duration</td><td style="padding:8px;color:#ffd700;">${durationStr}</td></tr>
      </table>
      <p style="text-align:center;color:#888;margin-top:30px;">— CyberLeaner Platform —</p>
    </div>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settingsMap.resend_api_key}` },
      body: JSON.stringify({
        from: settingsMap.email_from || 'onboarding@resend.dev',
        to: userEmail,
        subject: `🏆 CyberLeaner — Level ${levelNumber} Completed!`,
        html,
      }),
    });
    const result = await response.json();
    console.log(`[EMAIL] Sent to ${userEmail}:`, result);
    return { sent: true, result };
  } catch (err) {
    console.error('[EMAIL] Send failed:', err);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendCongratulationEmail };
