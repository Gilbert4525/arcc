#!/usr/bin/env node

/**
 * Voting System Deployment Script
 * 
 * This script helps deploy the complete voting email trigger system.
 * 
 * Usage:
 *   node scripts/deploy-voting-system.js
 */

const fs = require('fs');
const path = require('path');

class VotingSystemDeployer {
  constructor() {
    this.deploymentSteps = [
      {
        name: 'Database Triggers',
        description: 'Deploy database triggers for automatic email sending',
        action: 'manual',
        instructions: [
          '1. Go to your Supabase project dashboard',
          '2. Navigate to SQL Editor',
          '3. Copy the contents of deploy-voting-triggers.sql',
          '4. Paste and run the SQL script',
          '5. Verify the deployment was successful'
        ]
      },
      {
        name: 'Background Process',
        description: 'Start the voting notification listener',
        action: 'command',
        command: 'npm run voting:listener'
      },
      {
        name: 'System Testing',
        description: 'Test the complete voting system',
        action: 'command',
        command: 'npm run voting:test'
      }
    ];
  }

  displayHeader() {
    console.log('🚀 VOTING EMAIL TRIGGER SYSTEM DEPLOYMENT');
    console.log('==========================================');
    console.log('');
    console.log('This script will help you deploy the complete voting email system.');
    console.log('The system will automatically send emails when:');
    console.log('✅ Resolutions are created');
    console.log('✅ Meetings are created');
    console.log('✅ Minutes are created');
    console.log('🎯 Voting is completed (NEW)');
    console.log('🎯 Voting deadlines expire (NEW)');
    console.log('');
  }

  displayStep(step, index) {
    console.log(`\n📋 STEP ${index + 1}: ${step.name}`);
    console.log('='.repeat(50));
    console.log(`Description: ${step.description}`);
    console.log('');
    
    if (step.action === 'manual') {
      console.log('📝 MANUAL ACTION REQUIRED:');
      step.instructions.forEach(instruction => {
        console.log(`   ${instruction}`);
      });
      console.log('');
      console.log('Press Enter when you have completed this step...');
    } else if (step.action === 'command') {
      console.log('⚡ COMMAND TO RUN:');
      console.log(`   ${step.command}`);
      console.log('');
      console.log('Press Enter when you are ready to run this command...');
    }
  }

  async waitForUserInput() {
    return new Promise((resolve) => {
      process.stdin.once('data', () => {
        resolve();
      });
    });
  }

  async runCommand(command) {
    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const [cmd, ...args] = command.split(' ');
      
      console.log(`\n🔄 Running: ${command}`);
      console.log('='.repeat(50));
      
      const child = spawn(cmd, args, {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          console.log(`\n✅ Command completed successfully`);
          resolve();
        } else {
          console.log(`\n❌ Command failed with exit code ${code}`);
          reject(new Error(`Command failed: ${command}`));
        }
      });
      
      child.on('error', (error) => {
        console.log(`\n❌ Error running command: ${error.message}`);
        reject(error);
      });
    });
  }

  async deploy() {
    this.displayHeader();
    
    console.log('⚠️  IMPORTANT: Make sure you have the following environment variables set:');
    console.log('   - DATABASE_URL');
    console.log('   - NEXT_PUBLIC_SUPABASE_URL');
    console.log('   - SUPABASE_SERVICE_ROLE_KEY');
    console.log('   - NEXT_PUBLIC_SITE_URL');
    console.log('');
    console.log('Press Enter to continue with deployment...');
    await this.waitForUserInput();
    
    for (let i = 0; i < this.deploymentSteps.length; i++) {
      const step = this.deploymentSteps[i];
      this.displayStep(step, i);
      
      if (step.action === 'manual') {
        await this.waitForUserInput();
      } else if (step.action === 'command') {
        await this.waitForUserInput();
        try {
          await this.runCommand(step.command);
        } catch (error) {
          console.log(`\n❌ Step ${i + 1} failed: ${error.message}`);
          console.log('Please fix the issue and try again.');
          process.exit(1);
        }
      }
    }
    
    this.displaySuccess();
  }

  displaySuccess() {
    console.log('\n🎉 DEPLOYMENT COMPLETE!');
    console.log('=======================');
    console.log('');
    console.log('✅ Your voting email trigger system is now fully deployed!');
    console.log('');
    console.log('📧 EMAIL FUNCTIONALITY:');
    console.log('   ✅ Resolution creation → Email sent immediately');
    console.log('   ✅ Meeting creation → Email sent immediately');
    console.log('   ✅ Minutes creation → Email sent immediately');
    console.log('   ✅ Voting completion → Email sent automatically');
    console.log('   ✅ Deadline expiration → Email sent automatically');
    console.log('');
    console.log('🔧 MONITORING:');
    console.log('   - Check audit_logs table for trigger activity');
    console.log('   - Monitor background process logs');
    console.log('   - Test with real voting scenarios');
    console.log('');
    console.log('📚 DOCUMENTATION:');
    console.log('   - See VOTING_EMAIL_DEPLOYMENT_GUIDE.md for detailed instructions');
    console.log('   - Use npm run voting:test to test the system');
    console.log('   - Use npm run voting:listener to start the background process');
    console.log('');
    console.log('🚀 Your system is now 100% automated!');
  }
}

// Main execution
async function main() {
  const deployer = new VotingSystemDeployer();
  
  try {
    await deployer.deploy();
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Run the deployment
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { VotingSystemDeployer };
