// Admin Setup Script
// This script creates an admin user when Supabase is accessible

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAdmin() {
  console.log('👤 Setting up admin user...\n');

  const adminEmail = 'admin@arcboard.com';
  const adminPassword = 'admin123456'; // Change this to a secure password

  try {
    // Check if we can connect to Supabase
    const { data: healthCheck, error: healthError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (healthError) {
      console.log('⚠️  Cannot connect to Supabase. Here are the manual steps:');
      console.log('\n📋 Manual Admin Setup:');
      console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
      console.log('2. Open your project');
      console.log('3. Go to Authentication > Users');
      console.log('4. Click "Add user"');
      console.log(`5. Email: ${adminEmail}`);
      console.log(`6. Password: ${adminPassword}`);
      console.log('7. Click "Create user"');
      console.log('\n8. Then go to SQL Editor and run:');
      console.log(`INSERT INTO public.profiles (id, email, full_name, role) 
VALUES (
  (SELECT id FROM auth.users WHERE email = '${adminEmail}'),
  '${adminEmail}',
  'Administrator',
  'admin'
);`);
      return;
    }

    // Try to create admin user
    console.log('🔐 Creating admin user...');
    
    const { data: authUser, error: signUpError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

    if (signUpError && !signUpError.message.includes('already been registered')) {
      console.error('❌ Failed to create admin user:', signUpError.message);
      return;
    }

    const userId = authUser?.user?.id || (await supabase.auth.admin.listUsers())
      .data.users.find(u => u.email === adminEmail)?.id;

    if (!userId) {
      console.error('❌ Could not determine user ID');
      return;
    }

    // Create admin profile
    console.log('📝 Creating admin profile...');
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: adminEmail,
        full_name: 'Administrator',
        role: 'admin',
        position: 'System Administrator',
        is_active: true,
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Failed to create admin profile:', profileError.message);
      return;
    }

    console.log('✅ Admin user created successfully!');
    console.log('\n🎉 Admin Login Credentials:');
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log('\n🌐 Access URLs:');
    console.log('🏠 Main Site: http://localhost:3000');
    console.log('🔐 Login: http://localhost:3000/auth/login');
    console.log('📊 Dashboard: http://localhost:3000/dashboard');
    console.log('👥 Admin Panel: http://localhost:3000/admin');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n🛠️  Troubleshooting:');
    console.log('1. Check your internet connection');
    console.log('2. Verify Supabase project is running');
    console.log('3. Check firewall settings');
    console.log('4. Try using a VPN if corporate firewall is blocking');
  }
}

setupAdmin();
