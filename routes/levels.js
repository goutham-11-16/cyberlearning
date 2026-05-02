const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const { sendCongratulationEmail } = require('./email');

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/levels/progress
 * Get all level progress for the current user
 */
router.get('/progress', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('level_progress')
      .select('*')
      .eq('user_id', req.user.id)
      .order('level_number', { ascending: true });

    if (error) {
      console.error('Fetch progress error:', error);
      return res.status(500).json({ error: 'Failed to fetch progress' });
    }

    return res.status(200).json({ progress: data });
  } catch (err) {
    console.error('Progress error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/levels/:levelNumber/start
 * Start a level — records start_time, sets status to in_progress
 */
router.post('/:levelNumber/start', async (req, res) => {
  try {
    const levelNumber = parseInt(req.params.levelNumber);

    // Check if the level exists and is unlocked
    const { data: progress, error: fetchError } = await supabaseAdmin
      .from('level_progress')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('level_number', levelNumber)
      .single();

    if (fetchError || !progress) {
      return res.status(404).json({ error: 'Level not found' });
    }

    if (progress.status === 'locked') {
      return res.status(403).json({ error: 'This level is locked. Complete previous levels first.' });
    }

    if (progress.status === 'completed') {
      return res.status(200).json({
        message: 'Level already completed',
        progress,
      });
    }

    // If already in progress, return existing progress (timer continues)
    if (progress.status === 'in_progress' && progress.start_time) {
      return res.status(200).json({
        message: 'Level already in progress',
        progress,
      });
    }

    // Start the level
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('level_progress')
      .update({
        start_time: now,
        status: 'in_progress',
      })
      .eq('id', progress.id)
      .select()
      .single();

    if (updateError) {
      console.error('Start level error:', updateError);
      return res.status(500).json({ error: 'Failed to start level' });
    }

    return res.status(200).json({
      message: `Level ${levelNumber} started!`,
      progress: updated,
    });
  } catch (err) {
    console.error('Start level error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/levels/:levelNumber/complete
 * Complete a level — records end_time, calculates duration, unlocks next level
 */
router.post('/:levelNumber/complete', async (req, res) => {
  try {
    const levelNumber = parseInt(req.params.levelNumber);

    // Fetch current progress
    const { data: progress, error: fetchError } = await supabaseAdmin
      .from('level_progress')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('level_number', levelNumber)
      .single();

    if (fetchError || !progress) {
      return res.status(404).json({ error: 'Level not found' });
    }

    if (progress.status === 'completed') {
      return res.status(200).json({
        message: 'Level already completed',
        progress,
      });
    }

    if (progress.status !== 'in_progress') {
      return res.status(400).json({ error: 'Level not started yet' });
    }

    // Calculate duration
    const now = new Date();
    const startTime = new Date(progress.start_time);
    const durationSeconds = Math.floor((now - startTime) / 1000);

    // Update level as completed
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('level_progress')
      .update({
        end_time: now.toISOString(),
        duration_seconds: durationSeconds,
        status: 'completed',
      })
      .eq('id', progress.id)
      .select()
      .single();

    if (updateError) {
      console.error('Complete level error:', updateError);
      return res.status(500).json({ error: 'Failed to complete level' });
    }

    // Unlock next level
    const nextLevel = levelNumber + 1;
    const { data: nextProgress } = await supabaseAdmin
      .from('level_progress')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('level_number', nextLevel)
      .single();

    if (nextProgress && nextProgress.status === 'locked') {
      await supabaseAdmin
        .from('level_progress')
        .update({ status: 'unlocked' })
        .eq('id', nextProgress.id);
    }

    // Update user's current level
    await supabaseAdmin
      .from('profiles')
      .update({ current_level: nextLevel })
      .eq('id', req.user.id);

    // Send congratulation email (future — will silently fail if not configured)
    try {
      await sendCongratulationEmail(
        req.user.email,
        req.user.name,
        levelNumber,
        progress.start_time,
        now.toISOString(),
        durationSeconds
      );
    } catch (emailErr) {
      console.log('Email not sent (not configured):', emailErr.message);
    }

    return res.status(200).json({
      message: `🎉 Level ${levelNumber} completed!`,
      progress: updated,
      duration_seconds: durationSeconds,
      next_level_unlocked: nextLevel,
    });
  } catch (err) {
    console.error('Complete level error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/levels/1/attempt
 * Level 1 — SQL Injection challenge attempt
 * Detects SQL injection patterns and checks for header-based bypass
 */
router.post('/1/attempt', async (req, res) => {
  try {
    const { username, password } = req.body;
    const bypassHeader = req.headers['x-auth-bypass'];

    // Increment attempt count
    await supabaseAdmin
      .from('level_progress')
      .update({ attempts: (req.user.current_level >= 1) ? undefined : 0 })
      .eq('user_id', req.user.id)
      .eq('level_number', 1);

    // Increment attempts using RPC or raw increment
    const { data: currentProgress } = await supabaseAdmin
      .from('level_progress')
      .select('attempts')
      .eq('user_id', req.user.id)
      .eq('level_number', 1)
      .single();

    const newAttempts = (currentProgress?.attempts || 0) + 1;
    await supabaseAdmin
      .from('level_progress')
      .update({ attempts: newAttempts })
      .eq('user_id', req.user.id)
      .eq('level_number', 1);

    // Check for SQL injection patterns
    const sqlPatterns = [
      /('|")\s*(or|OR)\s*/i,
      /1\s*=\s*1/,
      /--/,
      /;/,
      /union\s+select/i,
      /drop\s+table/i,
      /insert\s+into/i,
      /delete\s+from/i,
      /update\s+.*set/i,
      /'\s*or\s*'.*'\s*=\s*'/i,
      /admin'--/i,
      /or\s+1=1/i,
      /'\s*;\s*drop/i,
    ];

    const input = `${username || ''} ${password || ''}`;
    const isSQLInjection = sqlPatterns.some(pattern => pattern.test(input));

    if (isSQLInjection) {
      return res.status(200).json({
        success: false,
        type: 'sql_injection_detected',
        message: 'Nice try 😏 This method will not work. Try Header-based method.',
      });
    }

    // Check for header-based bypass
    if (bypassHeader === 'true') {
      return res.status(200).json({
        success: true,
        message: '🎉 Access Granted! You found the header bypass!',
      });
    }

    // Normal failed login
    return res.status(200).json({
      success: false,
      type: 'invalid_credentials',
      message: 'Access Denied. Invalid credentials.',
    });
  } catch (err) {
    console.error('Level 1 attempt error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/levels/2/attempt
 * Level 2 — Brute Force challenge attempt
 * Tracks attempts and applies progressive delays
 */
router.post('/2/attempt', async (req, res) => {
  try {
    const { password } = req.body;

    // Get current attempt count
    const { data: progress } = await supabaseAdmin
      .from('level_progress')
      .select('attempts')
      .eq('user_id', req.user.id)
      .eq('level_number', 2)
      .single();

    const currentAttempts = (progress?.attempts || 0) + 1;

    // Record the attempt
    await supabaseAdmin
      .from('brute_force_attempts')
      .insert({
        user_id: req.user.id,
        attempt_number: currentAttempts,
        attempted_password: password || '',
        is_correct: currentAttempts >= 10,
      });

    // Update attempt count
    await supabaseAdmin
      .from('level_progress')
      .update({ attempts: currentAttempts })
      .eq('user_id', req.user.id)
      .eq('level_number', 2);

    // Determine delay based on attempts
    let delayMs = 0;
    if (currentAttempts >= 4 && currentAttempts <= 6) {
      delayMs = 2000;
    } else if (currentAttempts >= 7 && currentAttempts <= 9) {
      delayMs = 5000;
    }

    // Apply delay if needed
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    // Check if threshold reached (10 attempts = unlock)
    if (currentAttempts >= 10) {
      return res.status(200).json({
        success: true,
        message: '🔓 System compromised! Brute force successful!',
        attempts: currentAttempts,
        delay: 0,
      });
    }

    // Calculate delay for next attempt
    let nextDelay = 0;
    if (currentAttempts + 1 >= 4 && currentAttempts + 1 <= 6) {
      nextDelay = 2;
    } else if (currentAttempts + 1 >= 7 && currentAttempts + 1 <= 9) {
      nextDelay = 5;
    }

    return res.status(200).json({
      success: false,
      message: `ACCESS DENIED — Attempt ${currentAttempts}/10`,
      attempts: currentAttempts,
      remaining: 10 - currentAttempts,
      delay: nextDelay,
      hint: currentAttempts >= 5 ? 'Keep going... the system weakens with each attempt.' : null,
    });
  } catch (err) {
    console.error('Level 2 attempt error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
