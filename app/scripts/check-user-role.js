const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserRole() {
  try {
    // Get all profiles to see user roles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }

    console.log('All user profiles:');
    profiles.forEach(profile => {
      console.log(`- ${profile.email} (${profile.full_name || 'No name'}) - Role: ${profile.role}`);
    });

    // Check if there are any admin users
    const adminUsers = profiles.filter(p => p.role === 'admin');
    console.log(`\nAdmin users: ${adminUsers.length}`);
    adminUsers.forEach(admin => {
      console.log(`- ${admin.email} (${admin.full_name || 'No name'})`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkUserRole();
