/**
 * CyberLeaner — One-time Setup Script
 * Creates database tables and seeds the admin account
 * Run: node setup.js
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function setup() {
  console.log('\n⚡ CyberLeaner Setup\n');
  console.log('━'.repeat(50));

  // ---- Step 1: Create Tables ----
  console.log('\n📦 Step 1: Creating database tables...');

  const tables = [
    {
      name: 'profiles',
      sql: `CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        current_level INTEGER DEFAULT 1,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );`
    },
    {
      name: 'level_progress',
      sql: `CREATE TABLE IF NOT EXISTS level_progress (
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
      );`
    },
    {
      name: 'brute_force_attempts',
      sql: `CREATE TABLE IF NOT EXISTS brute_force_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        attempt_number INTEGER NOT NULL,
        attempted_password TEXT,
        attempted_at TIMESTAMPTZ DEFAULT NOW(),
        is_correct BOOLEAN DEFAULT FALSE
      );`
    },
    {
      name: 'admin_settings',
      sql: `CREATE TABLE IF NOT EXISTS admin_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT,
        description TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );`
    }
  ];

  for (const table of tables) {
    const { error } = await supabase.rpc('exec_sql', { query: table.sql }).maybeSingle();
    // rpc may not exist, try direct approach
    if (error) {
      console.log(`   ⚠ Table "${table.name}" — run SQL manually if needed (RPC not available)`);
    } else {
      console.log(`   ✅ Table "${table.name}" ready`);
    }
  }

  console.log('\n   💡 If tables were not created, paste sql/schema.sql into Supabase SQL Editor');

  // ---- Step 2: Create Admin User ----
  console.log('\n👤 Step 2: Creating admin account...');
  console.log(`   Email: ${adminEmail}`);

  // Check if admin already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingAdmin = existingUsers?.users?.find(u => u.email === adminEmail);

  let adminId;

  if (existingAdmin) {
    console.log('   ℹ Admin user already exists in Auth');
    adminId = existingAdmin.id;

    // Update password in case it changed
    const { error: updateErr } = await supabase.auth.admin.updateUserById(adminId, {
      password: adminPassword,
    });
    if (updateErr) {
      console.log(`   ⚠ Could not update password: ${updateErr.message}`);
    } else {
      console.log('   ✅ Admin password updated');
    }
  } else {
    // Create new admin user
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

    if (createErr) {
      console.error(`   ❌ Failed to create admin user: ${createErr.message}`);
      process.exit(1);
    }

    adminId = newUser.user.id;
    console.log(`   ✅ Admin user created (ID: ${adminId})`);
  }

  // ---- Step 3: Create Admin Profile ----
  console.log('\n📋 Step 3: Creating admin profile...');

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', adminId)
    .maybeSingle();

  if (existingProfile) {
    // Update to ensure admin flag is set
    await supabase
      .from('profiles')
      .update({ is_admin: true, name: 'Admin' })
      .eq('id', adminId);
    console.log('   ✅ Admin profile updated');
  } else {
    const { error: profileErr } = await supabase
      .from('profiles')
      .insert({
        id: adminId,
        name: 'Admin',
        email: adminEmail,
        current_level: 1,
        is_admin: true,
      });

    if (profileErr) {
      console.error(`   ❌ Profile creation failed: ${profileErr.message}`);
      console.log('   💡 Make sure the "profiles" table exists. Run sql/schema.sql first.');
    } else {
      console.log('   ✅ Admin profile created');
    }
  }

  // ---- Step 4: Seed Admin Settings ----
  console.log('\n⚙️ Step 4: Seeding admin settings...');

  const defaultSettings = [
    { setting_key: 'resend_api_key', setting_value: '', description: 'Resend API key for sending emails' },
    { setting_key: 'email_from', setting_value: 'onboarding@resend.dev', description: 'Sender email address' },
    { setting_key: 'email_enabled', setting_value: 'false', description: 'Enable/disable email notifications' },
    { setting_key: 'smtp_host', setting_value: '', description: 'SMTP host (alternative to Resend)' },
    { setting_key: 'smtp_port', setting_value: '', description: 'SMTP port' },
    { setting_key: 'smtp_user', setting_value: '', description: 'SMTP username' },
    { setting_key: 'smtp_pass', setting_value: '', description: 'SMTP password' },
  ];

  for (const s of defaultSettings) {
    const { error } = await supabase
      .from('admin_settings')
      .upsert(s, { onConflict: 'setting_key' });
    if (error) {
      console.log(`   ⚠ Setting "${s.setting_key}" — ${error.message}`);
    }
  }
  console.log('   ✅ Default settings seeded');

  // ---- Done ----
  console.log('\n' + '━'.repeat(50));
  console.log('✅ Setup complete!\n');
  console.log(`🔐 Admin Login:`);
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`\n🚀 Start server: npm run dev`);
  console.log(`🌐 Open: http://localhost:3000\n`);
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
