#!/usr/bin/env node
// setup-database.js - Initialize required database tables
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const logger = require('./lib/utils/logger');

async function setupDatabase() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  logger.info('=== Database Setup Started ===');

  try {
    // Check if sync_log table exists
    const { data: tables, error: tablesError } = await supabase
      .from('sync_log')
      .select('*')
      .limit(1);

    if (tablesError && tablesError.code === '42P01') {
      logger.info('sync_log table does not exist. Creating it...');
      
      // Create sync_log table using raw SQL
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS sync_log (
            ResourceType TEXT PRIMARY KEY,
            LastProcessedTimestamp TIMESTAMP,
            UpdatedAt TIMESTAMP DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_sync_log_resource_type ON sync_log(ResourceType);
        `
      });

      if (createError) {
        logger.error('Failed to create sync_log table via RPC:', createError.message);
        logger.info('');
        logger.info('Please create the sync_log table manually in Supabase:');
        logger.info('1. Go to your Supabase dashboard');
        logger.info('2. Navigate to the SQL Editor');
        logger.info('3. Run the following SQL:');
        logger.info('');
        logger.info(`
CREATE TABLE IF NOT EXISTS sync_log (
  ResourceType TEXT PRIMARY KEY,
  LastProcessedTimestamp TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_log_resource_type ON sync_log(ResourceType);
        `);
        logger.info('');
        return;
      }

      logger.info('✅ sync_log table created successfully');
    } else if (tablesError) {
      logger.error('Error checking sync_log table:', tablesError.message);
      throw tablesError;
    } else {
      logger.info('✅ sync_log table already exists');
    }

    // Verify all required tables exist
    const requiredTables = ['property', 'media', 'sync_log'];
    const missingTables = [];

    for (const tableName of requiredTables) {
      const { error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error && error.code === '42P01') {
        missingTables.push(tableName);
      } else if (!error) {
        logger.info(`✅ Table '${tableName}' exists`);
      }
    }

    if (missingTables.length > 0) {
      logger.warn('');
      logger.warn('⚠️  Missing tables:', missingTables.join(', '));
      logger.warn('Please create these tables in Supabase before running the sync.');
      
      if (missingTables.includes('property')) {
        logger.info('');
        logger.info('Example property table schema:');
        logger.info(`
CREATE TABLE property (
  ListingKey TEXT PRIMARY KEY,
  ModificationTimestamp TIMESTAMP,
  -- Add all other RESO fields here
  -- See RESO Data Dictionary for complete field list
);
        `);
      }

      if (missingTables.includes('media')) {
        logger.info('');
        logger.info('Example media table schema:');
        logger.info(`
CREATE TABLE media (
  ResourceRecordKey TEXT,
  MediaKey TEXT,
  ModificationTimestamp TIMESTAMP,
  -- Add all other RESO media fields here
  PRIMARY KEY (ResourceRecordKey, MediaKey)
);
        `);
      }
    } else {
      logger.info('');
      logger.info('=== ✅ Database setup complete! ===');
      logger.info('All required tables are present.');
      logger.info('You can now run: node sync.js');
    }

  } catch (error) {
    logger.error('Database setup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };