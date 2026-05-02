const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/users', async (req, res) => {
  try {
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles').select('*').order('created_at', { ascending: false });
    if (profileError) return res.status(500).json({ error: 'Failed to fetch users' });

    const { data: allProgress, error: progressError } = await supabaseAdmin
      .from('level_progress').select('*').order('level_number', { ascending: true });
    if (progressError) return res.status(500).json({ error: 'Failed to fetch progress' });

    const users = profiles.map(profile => ({
      ...profile,
      levels: allProgress.filter(p => p.user_id === profile.id),
    }));

    return res.status(200).json({ users });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id', { count: 'exact' });
    const { data: completedL1 } = await supabaseAdmin.from('level_progress').select('id', { count: 'exact' }).eq('level_number', 1).eq('status', 'completed');
    const { data: completedL2 } = await supabaseAdmin.from('level_progress').select('id', { count: 'exact' }).eq('level_number', 2).eq('status', 'completed');

    return res.status(200).json({
      stats: { total_users: profiles?.length || 0, level1_completed: completedL1?.length || 0, level2_completed: completedL2?.length || 0 },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('admin_settings').select('*').order('setting_key');
    if (error) return res.status(500).json({ error: 'Failed to fetch settings' });
    return res.status(200).json({ settings: data });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || !Array.isArray(settings)) return res.status(400).json({ error: 'Settings array is required' });

    for (const setting of settings) {
      await supabaseAdmin.from('admin_settings')
        .update({ setting_value: setting.value, updated_at: new Date().toISOString() })
        .eq('setting_key', setting.key);
    }
    return res.status(200).json({ message: 'Settings updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
