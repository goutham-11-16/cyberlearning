// CyberLeaner — Auth Logic (Register/Login)
document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect to dashboard
  if (isLoggedIn() && !window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
    // Allow staying on current auth page
  }

  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = registerForm.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'CREATING ACCOUNT...';

      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;

      if (!name || !email || !password) { showAlert('reg-alert', 'All fields are required'); btn.disabled = false; btn.textContent = 'REGISTER'; return; }
      if (password.length < 6) { showAlert('reg-alert', 'Password must be at least 6 characters'); btn.disabled = false; btn.textContent = 'REGISTER'; return; }

      const { ok, data } = await apiRequest('/auth/register', {
        method: 'POST', body: JSON.stringify({ name, email, password })
      });

      if (ok && data.session) {
        setToken(data.session.access_token);
        setUser(data.user);
        showAlert('reg-alert', 'Account created! Redirecting...', 'success');
        setTimeout(() => window.location.href = '/dashboard.html', 1000);
      } else {
        showAlert('reg-alert', data.error || 'Registration failed');
        btn.disabled = false; btn.textContent = 'REGISTER';
      }
    });
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'AUTHENTICATING...';

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      if (!email || !password) { showAlert('login-alert', 'All fields are required'); btn.disabled = false; btn.textContent = 'LOGIN'; return; }

      const { ok, data } = await apiRequest('/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password })
      });

      if (ok && data.session) {
        setToken(data.session.access_token);
        setUser(data.user);
        showAlert('login-alert', data.message, 'success');
        setTimeout(() => window.location.href = '/dashboard.html', 1000);
      } else {
        showAlert('login-alert', data.error || 'Login failed');
        btn.disabled = false; btn.textContent = 'LOGIN';
      }
    });
  }
});

function logout() {
  clearAuth();
  window.location.href = '/login.html';
}
