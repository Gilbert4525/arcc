#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Checks if the application is properly deployed and database columns exist
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function verifyDeployment() {
  console.log('🔍 Verifying deployment status...\n');

  // Check environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  console.log('📋 Checking environment variables:');
  for (const envVar of requiredEnvVars) {
    const exists = !!process.env[envVar];
    console.log(`  ${exists ? '✅' : '❌'} ${envVar}: ${exists ? 'Set' : 'Missing'}`);
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('\n❌ Missing required environment variables');
    return;
  }

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('\n🗄️  Checking database columns:');
  
  try {
    // Check if the new columns exist
    const { data, error } = await supabase
      .from('profiles')
      .select('email_notifications_enabled, voting_email_notifications, last_email_sent, bounced_at, notification_preferences')
      .limit(1);

    if (error) {
      console.log(`  ❌ Database columns check failed: ${error.message}`);
    } else {
      console.log('  ✅ All required database columns exist');
    }
  } catch (err) {
    console.log(`  ❌ Database connection failed: ${err.message}`);
  }

  console.log('\n🌐 Deployment URLs to check:');
  console.log('  📱 Staging: Check your Vercel dashboard for staging URL');
  console.log('  🚀 Production: Check your Vercel dashboard for production URL');
  
  console.log('\n✅ Verification complete!');
  console.log('💡 If deployments are still failing, check the Vercel dashboard for detailed logs.');
}

verifyDeployment().catch(console.error);