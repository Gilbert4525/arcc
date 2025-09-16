#!/usr/bin/env node

/**
 * Voting Notification Listener Service
 * 
 * This script starts the background process that listens for database notifications
 * and automatically triggers voting summary emails when voting completes.
 * 
 * Usage:
 *   node scripts/start-voting-listener.js
 * 
 * Environment Variables Required:
 *   - DATABASE_URL: PostgreSQL connection string
 *   - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
 *   - NEXT_PUBLIC_SITE_URL: Your application URL (for API calls)
 */

const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const config = {
  databaseUrl: process.env.DATABASE_URL,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  reconnectDelay: 5000,
  maxReconnectAttempts: 10
};

// Validate required environment variables
function validateConfig() {
  const required = ['databaseUrl', 'supabaseUrl', 'supabaseServiceKey'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    console.error('Please set the following environment variables:');
    missing.forEach(key => {
      const envVar = key === 'databaseUrl' ? 'DATABASE_URL' :
                    key === 'supabaseUrl' ? 'NEXT_PUBLIC_SUPABASE_URL' :
                    key === 'supabaseServiceKey' ? 'SUPABASE_SERVICE_ROLE_KEY' : key;
      console.error(`  - ${envVar}`);
    });
    process.exit(1);
  }
}

class VotingNotificationListener {
  constructor() {
    this.pgClient = null;
    this.supabaseClient = null;
    this.isListening = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = config.maxReconnectAttempts;
    this.reconnectDelay = config.reconnectDelay;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Voting Notification Listener...');
      
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

      // Set up error handlers
      this.pgClient.on('error', this.handleConnectionError.bind(this));
      this.pgClient.on('end', this.handleConnectionEnd.bind(this));

      console.log('✅ Clients initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize clients:', error);
      throw error;
    }
  }

  async startListening() {
    try {
      console.log('🎧 Starting voting notification listener...');
      
      // Connect to PostgreSQL
      await this.pgClient.connect();
      console.log('✅ Connected to PostgreSQL for notifications');

      // Listen to both notification channels
      await this.pgClient.query('LISTEN voting_completion');
      await this.pgClient.query('LISTEN voting_summary_email');
      console.log('🔔 Listening for voting completion and summary email notifications');

      // Set up notification handler
      this.pgClient.on('notification', this.handleNotification.bind(this));

      this.isListening = true;
      this.reconnectAttempts = 0;

      console.log('🚀 Voting notification listener is active');
      console.log('📡 Listening on channels: voting_completion, voting_summary_email');
    } catch (error) {
      console.error('❌ Failed to start voting notification listener:', error);
      await this.handleReconnect();
    }
  }

  async stopListening() {
    try {
      console.log('🛑 Stopping voting notification listener...');
      
      this.isListening = false;
      
      if (this.pgClient) {
        await this.pgClient.query('UNLISTEN voting_completion');
        await this.pgClient.query('UNLISTEN voting_summary_email');
        await this.pgClient.end();
      }
      
      console.log('✅ Voting notification listener stopped');
    } catch (error) {
      console.error('❌ Error stopping voting notification listener:', error);
    }
  }

  async handleNotification(msg) {
    try {
      console.log(`📨 Received notification on channel "${msg.channel}":`, msg.payload);

      // Parse the notification payload
      const payload = JSON.parse(msg.payload);

      // Handle different notification channels
      if (msg.channel === 'voting_completion') {
        await this.processVotingCompletion(payload);
      } else if (msg.channel === 'voting_summary_email') {
        await this.processDirectEmailNotification(payload);
      } else {
        console.warn(`⚠️ Unknown notification channel: ${msg.channel}`);
      }
    } catch (error) {
      console.error('❌ Error handling notification:', error);
    }
  }

  async processVotingCompletion(payload) {
    try {
      console.log(`🎯 Processing ${payload.type} voting completion: ${payload.id}`);

      // Call the voting completion API
      const response = await fetch(`${config.siteUrl}/api/voting-completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.supabaseServiceKey}`
        },
        body: JSON.stringify({
          action: 'check',
          type: payload.type,
          id: payload.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`API call failed: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Successfully processed ${payload.type} completion:`, result);

      // Log success to audit
      await this.logProcessingSuccess(payload, result);
    } catch (error) {
      console.error(`❌ Error processing ${payload.type} completion:`, error);
      await this.logProcessingError(payload, error);
    }
  }

  async processDirectEmailNotification(payload) {
    try {
      console.log(`📧 Processing direct email notification for ${payload.type} ${payload.id}`);

      if (payload.action === 'send_summary') {
        // Call the voting summary API directly
        const response = await fetch(`${config.siteUrl}/api/voting-summary`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.supabaseServiceKey}`
          },
          body: JSON.stringify({
            type: payload.type,
            id: payload.id,
            trigger: 'automatic'
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(`API call failed: ${response.status} - ${errorData.error || response.statusText}`);
        }

        const result = await response.json();
        console.log(`✅ Voting summary email triggered successfully:`, result);

        // Log success to audit
        await this.logEmailTriggerSuccess(payload, result);
      } else {
        console.warn(`⚠️ Unknown email notification action: ${payload.action}`);
      }
    } catch (error) {
      console.error(`❌ Error processing direct email notification:`, error);
      await this.logEmailTriggerError(payload, error);
    }
  }

  async logProcessingSuccess(payload, result) {
    try {
      await this.supabaseClient
        .from('audit_logs')
        .insert({
          user_id: null, // System action
          action: 'VOTING_COMPLETION_PROCESSED',
          table_name: payload.type === 'resolution' ? 'resolutions' : 'minutes',
          record_id: payload.id,
          new_values: {
            trigger_source: 'notification_listener',
            result,
            timestamp: new Date().toISOString()
          }
        });
    } catch (error) {
      console.error('Failed to log processing success:', error);
    }
  }

  async logProcessingError(payload, error) {
    try {
      await this.supabaseClient
        .from('audit_logs')
        .insert({
          user_id: null, // System action
          action: 'VOTING_COMPLETION_ERROR',
          table_name: payload.type === 'resolution' ? 'resolutions' : 'minutes',
          record_id: payload.id,
          new_values: {
            trigger_source: 'notification_listener',
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
          }
        });
    } catch (auditError) {
      console.error('Failed to log processing error:', auditError);
    }
  }

  async logEmailTriggerSuccess(payload, result) {
    try {
      await this.supabaseClient
        .from('audit_logs')
        .insert({
          user_id: null, // System action
          action: 'VOTING_SUMMARY_EMAIL_SENT',
          table_name: payload.type === 'resolution' ? 'resolutions' : 'minutes',
          record_id: payload.id,
          new_values: {
            trigger_source: 'notification_listener',
            result,
            timestamp: new Date().toISOString()
          }
        });
    } catch (error) {
      console.error('Failed to log email trigger success:', error);
    }
  }

  async logEmailTriggerError(payload, error) {
    try {
      await this.supabaseClient
        .from('audit_logs')
        .insert({
          user_id: null, // System action
          action: 'VOTING_SUMMARY_EMAIL_FAILED',
          table_name: payload.type === 'resolution' ? 'resolutions' : 'minutes',
          record_id: payload.id,
          new_values: {
            trigger_source: 'notification_listener',
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
          }
        });
    } catch (auditError) {
      console.error('Failed to log email trigger error:', auditError);
    }
  }

  handleConnectionError(error) {
    console.error('❌ PostgreSQL connection error:', error);
    this.isListening = false;
    
    // Attempt to reconnect
    setTimeout(() => {
      this.handleReconnect();
    }, this.reconnectDelay);
  }

  handleConnectionEnd() {
    console.warn('⚠️ PostgreSQL connection ended');
    this.isListening = false;
    
    // Attempt to reconnect if we were supposed to be listening
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.handleReconnect();
      }, this.reconnectDelay);
    }
  }

  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached. Stopping listener.');
      process.exit(1);
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    try {
      // Close existing connection if it exists
      if (this.pgClient) {
        try {
          await this.pgClient.end();
        } catch (error) {
          // Ignore errors when closing
        }
      }

      // Reinitialize and restart
      await this.initialize();
      await this.startListening();
    } catch (error) {
      console.error(`❌ Reconnection attempt ${this.reconnectAttempts} failed:`, error);
      
      // Exponential backoff for reconnection delay
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 60000); // Max 1 minute
      
      setTimeout(() => {
        this.handleReconnect();
      }, this.reconnectDelay);
    }
  }

  getStatus() {
    return {
      isListening: this.isListening,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      reconnectDelay: this.reconnectDelay
    };
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Voting Notification Listener Service...');
  console.log('=====================================================');
  
  // Validate configuration
  validateConfig();
  
  // Create and start the listener
  const listener = new VotingNotificationListener();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await listener.stopListening();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await listener.stopListening();
    process.exit(0);
  });

  try {
    await listener.initialize();
    await listener.startListening();
    
    // Keep the process running
    console.log('🔄 Service is running. Press Ctrl+C to stop.');
    
    // Log status every 5 minutes
    setInterval(() => {
      const status = listener.getStatus();
      console.log(`📊 Status: Listening=${status.isListening}, Reconnects=${status.reconnectAttempts}`);
    }, 5 * 60 * 1000);
    
  } catch (error) {
    console.error('❌ Failed to start service:', error);
    process.exit(1);
  }
}

// Run the service
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { VotingNotificationListener };
