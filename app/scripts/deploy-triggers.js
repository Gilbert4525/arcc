#!/usr/bin/env node

/**
 * Database Trigger Deployment Script
 * 
 * This script deploys the voting summary email triggers to the production database.
 * It requires proper environment variables to be set.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function deployTriggers() {
  console.log('🚀 Starting database trigger deployment...');
  
  // Validate environment variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease create a .env.local file with the required variables.');
    console.error('See PRODUCTION_DEPLOYMENT_GUIDE.md for details.');
    process.exit(1);
  }
  
  // Create database client
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database successfully');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '..', 'voting-summary-email-triggers.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL file not found: ${sqlFilePath}`);
    }
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('📄 Loaded SQL trigger file');
    
    // Execute the SQL
    console.log('⚡ Executing database triggers...');
    await client.query(sqlContent);
    console.log('✅ Database triggers deployed successfully');
    
    // Verify deployment by checking if functions exist
    console.log('🔍 Verifying trigger deployment...');
    
    const verificationQueries = [
      "SELECT proname FROM pg_proc WHERE proname = 'trigger_voting_summary_email_enhanced'",
      "SELECT proname FROM pg_proc WHERE proname = 'handle_resolution_vote_change_enhanced'",
      "SELECT proname FROM pg_proc WHERE proname = 'handle_minutes_vote_change_enhanced'",
      "SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_resolution_vote_completion_enhanced'",
      "SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_minutes_vote_completion_enhanced'"
    ];
    
    let allVerified = true;
    
    for (const query of verificationQueries) {
      const result = await client.query(query);
      if (result.rows.length === 0) {
        console.error(`❌ Verification failed for: ${query}`);
        allVerified = false;
      }
    }
    
    if (allVerified) {
      console.log('✅ All triggers and functions verified successfully');
    } else {
      console.error('❌ Some triggers or functions failed verification');
      process.exit(1);
    }
    
    // Test the notification system
    console.log('🧪 Testing notification system...');
    
    try {
      await client.query("SELECT setup_voting_completion_listener()");
      console.log('✅ Notification system test passed');
    } catch (error) {
      console.warn('⚠️  Notification system test failed (this may be normal):', error.message);
    }
    
    console.log('\n🎉 Database trigger deployment completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start your Next.js application');
    console.log('2. Start the voting notification listener via /api/voting-triggers');
    console.log('3. Test the system with sample votes');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('📡 Database connection closed');
  }
}

// Handle script execution
if (require.main === module) {
  deployTriggers().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { deployTriggers };