// Database Setup Checker
// This script will help us verify your Supabase database setup

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

async function checkDatabase() {
  console.log('🔍 Checking your Supabase database setup...\n');

  try {
    // Check each table
    const tables = ['profiles', 'categories', 'documents', 'meetings', 'resolutions', 'resolution_votes'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        
        if (error) {
          console.log(`❌ Table "${table}": ${error.message}`);
        } else {
          console.log(`✅ Table "${table}": exists and accessible`);
        }
      } catch (err) {
        console.log(`❌ Table "${table}": ${err.message}`);
      }
    }

    // Check authentication
    console.log('\n🔑 Checking authentication...');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log(`❌ Auth: ${authError.message}`);
    } else {
      console.log(`✅ Auth: Working (${users.length} users registered)`);
    }

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

checkDatabase();
