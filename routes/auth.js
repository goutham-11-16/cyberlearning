const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

/**
 * POST /api/auth/register
 * Register a new user with name, email, password
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Create auth user with Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error('Auth registration error:', authError);
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user.id;

    // Check if this is the admin email
    const isAdmin = email === process.env.ADMIN_EMAIL;

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        name,
        email,
        current_level: 1,
        is_admin: isAdmin,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Clean up auth user if profile fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(500).json({ error: 'Failed to create user profile' });
    }

    // Initialize level progress — Level 1 unlocked, Level 2 locked
    const { error: progressError } = await supabaseAdmin
      .from('level_progress')
      .insert([
        { user_id: userId, level_number: 1, status: 'unlocked' },
        { user_id: userId, level_number: 2, status: 'locked' },
      ]);

    if (progressError) {
      console.error('Progress init error:', progressError);
    }

    // Sign in the user immediately
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return res.status(200).json({
        message: 'Account created successfully. Please sign in.',
        needsLogin: true,
      });
    }

    return res.status(201).json({
      message: 'Registration successful!',
      user: {
        id: userId,
        name,
        email,
        current_level: 1,
        is_admin: isAdmin,
      },
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
});

/**
 * POST /api/auth/login
 * Sign in with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Fetch profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    return res.status(200).json({
      message: `Welcome back, ${profile.name}!`,
      user: profile,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

/**
 * POST /api/auth/logout
 * Sign out current user
 */
router.post('/logout', async (req, res) => {
  try {
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile (requires auth)
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    return res.status(200).json({ user: req.user });
  } catch (err) {
    console.error('Get user error:', err);
    return res.status(500).json({ error: 'Failed to get user data' });
  }
});

module.exports = router;
