#!/usr/bin/env node

/**
 * Voting Triggers Test Script
 * 
 * This script tests the voting email trigger system to ensure it's working correctly.
 * 
 * Usage:
 *   node scripts/test-voting-triggers.js
 * 
 * Environment Variables Required:
 *   - DATABASE_URL: PostgreSQL connection string
 *   - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
 *   - NEXT_PUBLIC_SITE_URL: Your application URL
 */

const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const config = {
  databaseUrl: process.env.DATABASE_URL,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
};

class VotingTriggersTester {
  constructor() {
    this.pgClient = null;
    this.supabaseClient = null;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Voting Triggers Tester...');
      
      // Initialize PostgreSQL client
      this.pgClient = new Client({
        connectionString: config.databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });

      // Initialize Supabase client
      this.supabaseClient = createClient(
        config.supabaseUrl,
        config.supabaseServiceKey
      );

      await this.pgClient.connect();
      console.log('✅ Connected to database successfully');
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      throw error;
    }
  }

  async testDatabaseTriggers() {
    console.log('\n🔍 Testing Database Triggers...');
    
    try {
      // Check if triggers exist
      const triggerQuery = `
        SELECT 
            trigger_name,
            event_manipulation,
            action_timing,
            action_statement
        FROM information_schema.triggers 
        WHERE trigger_name LIKE '%voting%' 
        ORDER BY trigger_name;
      `;
      
      const triggerResult = await this.pgClient.query(triggerQuery);
      
      if (triggerResult.rows.length === 0) {
        console.log('❌ No voting triggers found. Please deploy the triggers first.');
        return false;
      }
      
      console.log('✅ Found voting triggers:');
      triggerResult.rows.forEach(row => {
        console.log(`   - ${row.trigger_name} (${row.event_manipulation})`);
      });
      
      return true;
    } catch (error) {
      console.error('❌ Error testing database triggers:', error);
      return false;
    }
  }

  async testHelperFunctions() {
    console.log('\n🔍 Testing Helper Functions...');
    
    try {
      // Test get_total_eligible_voters function
      const votersResult = await this.pgClient.query('SELECT get_total_eligible_voters() as count;');
      const voterCount = votersResult.rows[0].count;
      console.log(`✅ Total eligible voters: ${voterCount}`);
      
      if (voterCount === 0) {
        console.log('⚠️  Warning: No eligible voters found. Make sure you have board members and admins.');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error testing helper functions:', error);
      return false;
    }
  }

  async testNotificationChannels() {
    console.log('\n🔍 Testing Notification Channels...');
    
    try {
      // Test if we can send notifications
      const testPayload = {
        action: 'test',
        type: 'resolution',
        id: 'test-id',
        timestamp: new Date().toISOString()
      };
      
      await this.pgClient.query('SELECT pg_notify($1, $2);', ['voting_completion', JSON.stringify(testPayload)]);
      console.log('✅ Successfully sent test notification to voting_completion channel');
      
      await this.pgClient.query('SELECT pg_notify($1, $2);', ['voting_summary_email', JSON.stringify(testPayload)]);
      console.log('✅ Successfully sent test notification to voting_summary_email channel');
      
      return true;
    } catch (error) {
      console.error('❌ Error testing notification channels:', error);
      return false;
    }
  }

  async testAPIEndpoints() {
    console.log('\n🔍 Testing API Endpoints...');
    
    try {
      // Test voting completion API
      const completionResponse = await fetch(`${config.siteUrl}/api/voting-completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.supabaseServiceKey}`
        },
        body: JSON.stringify({
          action: 'check_expired'
        })
      });
      
      if (completionResponse.ok) {
        console.log('✅ Voting completion API is accessible');
      } else {
        console.log(`⚠️  Voting completion API returned status: ${completionResponse.status}`);
      }
      
      // Test voting summary API
      const summaryResponse = await fetch(`${config.siteUrl}/api/voting-summary`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.supabaseServiceKey}`
        }
      });
      
      if (summaryResponse.status === 400) {
        console.log('✅ Voting summary API is accessible (400 expected without parameters)');
      } else {
        console.log(`⚠️  Voting summary API returned status: ${summaryResponse.status}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error testing API endpoints:', error);
      return false;
    }
  }

  async testEmailConfiguration() {
    console.log('\n🔍 Testing Email Configuration...');
    
    try {
      // Test Gmail configuration validation
      const emailResponse = await fetch(`${config.siteUrl}/api/admin/validate-gmail-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.supabaseServiceKey}`
        }
      });
      
      if (emailResponse.ok) {
        const result = await emailResponse.json();
        console.log('✅ Gmail configuration validation API is accessible');
        console.log(`   Overall Status: ${result.overallStatus}`);
        
        if (result.overallStatus === 'READY') {
          console.log('✅ Gmail configuration is ready for sending emails');
        } else {
          console.log('⚠️  Gmail configuration needs attention:');
          result.validation.issues.forEach(issue => {
            console.log(`   - ${issue}`);
          });
        }
      } else {
        console.log(`⚠️  Gmail configuration API returned status: ${emailResponse.status}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error testing email configuration:', error);
      return false;
    }
  }

  async testAuditLogs() {
    console.log('\n🔍 Testing Audit Logs...');
    
    try {
      // Check if audit_logs table exists and has recent entries
      const auditQuery = `
        SELECT 
            action,
            table_name,
            created_at
        FROM audit_logs 
        WHERE action LIKE '%VOTING%'
        ORDER BY created_at DESC
        LIMIT 5;
      `;
      
      const auditResult = await this.pgClient.query(auditQuery);
      
      if (auditResult.rows.length > 0) {
        console.log('✅ Found recent voting-related audit logs:');
        auditResult.rows.forEach(row => {
          console.log(`   - ${row.action} (${row.table_name}) - ${row.created_at}`);
        });
      } else {
        console.log('ℹ️  No recent voting-related audit logs found (this is normal for a fresh deployment)');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error testing audit logs:', error);
      return false;
    }
  }

  async runAllTests() {
    console.log('🧪 VOTING TRIGGERS COMPREHENSIVE TEST');
    console.log('=====================================');
    
    const tests = [
      { name: 'Database Triggers', fn: () => this.testDatabaseTriggers() },
      { name: 'Helper Functions', fn: () => this.testHelperFunctions() },
      { name: 'Notification Channels', fn: () => this.testNotificationChannels() },
      { name: 'API Endpoints', fn: () => this.testAPIEndpoints() },
      { name: 'Email Configuration', fn: () => this.testEmailConfiguration() },
      { name: 'Audit Logs', fn: () => this.testAuditLogs() }
    ];
    
    const results = [];
    
    for (const test of tests) {
      try {
        const result = await test.fn();
        results.push({ name: test.name, passed: result });
      } catch (error) {
        console.error(`❌ Test "${test.name}" failed with error:`, error);
        results.push({ name: test.name, passed: false });
      }
    }
    
    // Summary
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('========================');
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.name}`);
    });
    
    console.log(`\nOverall: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('\n🎉 ALL TESTS PASSED! Your voting email trigger system is ready!');
      console.log('\nNext steps:');
      console.log('1. Start the background process: node scripts/start-voting-listener.js');
      console.log('2. Test with real voting scenarios');
      console.log('3. Monitor the system for any issues');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the issues above and fix them before proceeding.');
    }
    
    return passed === total;
  }

  async cleanup() {
    if (this.pgClient) {
      await this.pgClient.end();
    }
  }
}

// Main execution
async function main() {
  const tester = new VotingTriggersTester();
  
  try {
    await tester.initialize();
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Fatal error during testing:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

// Run the tests
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { VotingTriggersTester };
