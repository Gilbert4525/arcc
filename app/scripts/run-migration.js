// Database Migration Runner
// This script will create all database tables in your Supabase project

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting database migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Running migration: 001_initial_schema.sql');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // If exec_sql doesn't exist, we'll split and run individual statements
      console.log('⚠️  Using fallback method...');
      
      // Split SQL into individual statements and run them
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement) {
          try {
            const { error: stmtError } = await supabase.rpc('exec_sql', {
              sql: statement + ';'
            });
            
            if (stmtError) {
              console.log(`⚠️  Statement ${i + 1}: ${stmtError.message}`);
            } else {
              console.log(`✅ Statement ${i + 1}: executed successfully`);
            }
          } catch (err) {
            console.log(`⚠️  Statement ${i + 1}: ${err.message}`);
          }
        }
      }
    } else {
      console.log('✅ Migration executed successfully!');
    }

    // Verify tables were created
    console.log('\n🔍 Verifying table creation...');
    const tables = ['profiles', 'categories', 'documents', 'meetings', 'resolutions', 'resolution_votes'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        
        if (error) {
          console.log(`❌ Table "${table}": ${error.message}`);
        } else {
          console.log(`✅ Table "${table}": created successfully`);
        }
      } catch (err) {
        console.log(`❌ Table "${table}": ${err.message}`);
      }
    }

    console.log('\n🎉 Database setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
    console.log('2. Navigate to your project');
    console.log('3. Check the "Table Editor" to see your new tables');
    console.log('4. You may need to set up more specific Row Level Security policies');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n🛠️  Manual Setup Option:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Open your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Copy and paste the content from supabase/migrations/001_initial_schema.sql');
    console.log('5. Click "Run" to execute the SQL');
  }
}

runMigration();
