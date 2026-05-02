-- ============================================
-- CYBERLEANER — Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. Profiles table (extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    current_level INTEGER DEFAULT 1,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Level progress tracking
CREATE TABLE IF NOT EXISTS level_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    level_number INTEGER NOT NULL,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    status TEXT DEFAULT 'locked',
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, level_number)
);

-- 3. Brute force attempt tracking
CREATE TABLE IF NOT EXISTS brute_force_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    attempted_password TEXT,
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    is_correct BOOLEAN DEFAULT FALSE
);

-- 4. Admin settings (for API keys, email config, etc.)
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Insert default admin settings
INSERT INTO admin_settings (setting_key, setting_value, description) VALUES
    ('resend_api_key', '', 'Resend API key for sending emails'),
    ('email_from', 'onboarding@resend.dev', 'Sender email address'),
    ('email_enabled', 'false', 'Enable/disable email notifications'),
    ('smtp_host', '', 'SMTP host (alternative to Resend)'),
    ('smtp_port', '', 'SMTP port'),
    ('smtp_user', '', 'SMTP username'),
    ('smtp_pass', '', 'SMTP password')
ON CONFLICT (setting_key) DO NOTHING;

-- 6. Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE brute_force_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies — Profiles
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Service role can do anything with profiles"
    ON profiles FOR ALL
    USING (auth.role() = 'service_role');

-- 8. RLS Policies — Level Progress
CREATE POLICY "Users can view own progress"
    ON level_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
    ON level_progress FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can do anything with level_progress"
    ON level_progress FOR ALL
    USING (auth.role() = 'service_role');

-- 9. RLS Policies — Brute Force Attempts
CREATE POLICY "Users can view own attempts"
    ON brute_force_attempts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can do anything with brute_force_attempts"
    ON brute_force_attempts FOR ALL
    USING (auth.role() = 'service_role');

-- 10. RLS Policies — Admin Settings
CREATE POLICY "Service role can do anything with admin_settings"
    ON admin_settings FOR ALL
    USING (auth.role() = 'service_role');
