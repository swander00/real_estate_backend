import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Global sync state
let syncState = {
  active: false,
  type: null,
  process: null,
  startTime: null,
  progress: {
    tables: [],
    completed: false,
    error: null
  }
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Dashboard route
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Real Estate Backend API is running',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Dashboard API endpoints
app.post('/api/sync/start', async (req, res) => {
  try {
    const { type } = req.body;
    
    if (syncState.active) {
      return res.status(400).json({ 
        error: 'Sync already in progress',
        message: 'Please wait for the current sync to complete or stop it first'
      });
    }

    if (!['idx', 'vow', 'all'].includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid sync type',
        message: 'Type must be one of: idx, vow, all'
      });
    }

    // Initialize sync state
    syncState.active = true;
    syncState.type = type;
    syncState.startTime = new Date();
    syncState.progress = {
      tables: [],
      completed: false,
      error: null
    };

    // Start the appropriate sync process
    let scriptPath;
    if (type === 'idx') {
      scriptPath = path.join(__dirname, 'lib', 'syncIdx.js');
    } else if (type === 'vow') {
      scriptPath = path.join(__dirname, 'lib', 'syncVow.js');
    } else if (type === 'all') {
      // For 'all', we'll run both sequentially
      scriptPath = path.join(__dirname, 'lib', 'syncIdx.js');
    }

    const childProcess = spawn('node', [scriptPath], {
      cwd: __dirname,
      env: { ...process.env }
    });

    syncState.process = childProcess;

    // Handle process output
    childProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[${type.toUpperCase()}] ${output}`);
      parseSyncOutput(output, type);
    });

    childProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error(`[${type.toUpperCase()}] ERROR: ${error}`);
      syncState.progress.error = error;
    });

    childProcess.on('close', (code) => {
      syncState.active = false;
      syncState.process = null;
      
      if (code === 0) {
        syncState.progress.completed = true;
        console.log(`[${type.toUpperCase()}] Sync completed successfully`);
      } else {
        syncState.progress.error = `Process exited with code ${code}`;
        console.error(`[${type.toUpperCase()}] Sync failed with code ${code}`);
      }
    });

    childProcess.on('error', (error) => {
      console.error(`[${type.toUpperCase()}] Process error:`, error);
      syncState.active = false;
      syncState.process = null;
      syncState.progress.error = error.message;
    });

    // Add timeout to prevent indefinite running
    const timeout = setTimeout(() => {
      if (syncState.active && syncState.process) {
        console.log(`[${type.toUpperCase()}] Sync timeout reached, terminating process`);
        syncState.process.kill('SIGKILL');
        syncState.active = false;
        syncState.process = null;
        syncState.progress.error = 'Sync timeout - process terminated after 30 minutes';
      }
    }, 30 * 60 * 1000); // 30 minute timeout

    // Clear timeout when process completes
    childProcess.on('close', () => {
      clearTimeout(timeout);
    });

    res.json({ 
      success: true,
      message: `${type.toUpperCase()} sync started successfully`,
      syncId: Date.now()
    });

  } catch (error) {
    syncState.active = false;
    syncState.process = null;
    res.status(500).json({ 
      error: 'Failed to start sync',
      message: error.message
    });
  }
});

app.post('/api/sync/stop', (req, res) => {
  try {
    if (!syncState.active || !syncState.process) {
      return res.status(400).json({ 
        error: 'No active sync to stop',
        message: 'There is no sync process currently running'
      });
    }

    console.log(`[${syncState.type?.toUpperCase()}] Stopping sync process...`);
    
    // Try graceful termination first
    syncState.process.kill('SIGTERM');
    
    // Force kill after 5 seconds if still running
    setTimeout(() => {
      if (syncState.process && !syncState.process.killed) {
        console.log(`[${syncState.type?.toUpperCase()}] Force killing sync process...`);
        syncState.process.kill('SIGKILL');
      }
    }, 5000);
    
    syncState.active = false;
    syncState.process = null;
    syncState.progress.error = 'Sync stopped by user';

    res.json({ 
      success: true,
      message: 'Sync stop requested'
    });

  } catch (error) {
    console.error('Error stopping sync:', error);
    res.status(500).json({ 
      error: 'Failed to stop sync',
      message: error.message
    });
  }
});

app.get('/api/sync/progress', (req, res) => {
  res.json({
    active: syncState.active,
    type: syncState.type,
    startTime: syncState.startTime,
    progress: syncState.progress,
    duration: syncState.startTime ? Date.now() - syncState.startTime.getTime() : 0
  });
});

app.post('/api/sync/reset', (req, res) => {
  try {
    console.log('Resetting sync state...');
    
    // Kill any active process
    if (syncState.process) {
      syncState.process.kill('SIGKILL');
    }
    
    // Reset state
    syncState.active = false;
    syncState.type = null;
    syncState.process = null;
    syncState.startTime = null;
    syncState.progress = {
      tables: [],
      completed: false,
      error: null
    };
    
    res.json({ 
      success: true,
      message: 'Sync state reset successfully'
    });
    
  } catch (error) {
    console.error('Error resetting sync state:', error);
    res.status(500).json({ 
      error: 'Failed to reset sync state',
      message: error.message
    });
  }
});

app.get('/api/stats/database', async (req, res) => {
  try {
    // Get table counts
    const tables = [
      'common_fields',
      'residential_freehold', 
      'residential_condo',
      'residential_lease',
      'property_media',
      'property_openhouse',
      'property_rooms'
    ];

    const stats = {
      properties: 0,
      media: 0,
      openHouses: 0,
      lastSync: 'Never',
      storage: {
        used: 0,
        limit: 0
      }
    };

    // Count records in each table
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.error(`Error counting ${table}:`, error);
          continue;
        }

        // Categorize counts
        if (table === 'common_fields') {
          stats.properties += count || 0;
        } else if (table === 'property_media') {
          stats.media += count || 0;
        } else if (table === 'property_openhouse') {
          stats.openHouses += count || 0;
        }
      } catch (error) {
        console.error(`Error accessing table ${table}:`, error);
      }
    }

    // Get last sync time (this would need to be tracked in your sync scripts)
    // For now, we'll use a placeholder
    stats.lastSync = syncState.startTime ? syncState.startTime.toLocaleString() : 'Never';

    // Storage usage (placeholder - would need actual Supabase storage API)
    stats.storage = {
      used: 1024 * 1024 * 100, // 100MB placeholder
      limit: 1024 * 1024 * 1024 // 1GB placeholder
    };

    res.json(stats);

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get database stats',
      message: error.message
    });
  }
});

// Feed completion status endpoint
app.get('/api/feeds/completion', async (req, res) => {
  try {
    const { fetchODataPage } = await import('./lib/fetchFeed.js');
    
    // Table configurations
    const FEED_TABLES = [
      {
        name: 'common_fields',
        url: process.env.IDX_URL,
        token: process.env.IDX_TOKEN,
        displayName: 'IDX Common Fields'
      },
      {
        name: 'residential_freehold',
        url: process.env.IDX_FREEHOLD_URL,
        token: process.env.IDX_TOKEN,
        displayName: 'IDX Freehold'
      },
      {
        name: 'residential_condo',
        url: process.env.IDX_CONDO_URL,
        token: process.env.IDX_TOKEN,
        displayName: 'IDX Condo'
      },
      {
        name: 'residential_lease',
        url: process.env.IDX_LEASE_URL,
        token: process.env.IDX_TOKEN,
        displayName: 'IDX Lease'
      },
      {
        name: 'property_media',
        url: process.env.IDX_MEDIA_URL,
        token: process.env.IDX_TOKEN,
        displayName: 'IDX Media'
      },
      {
        name: 'property_openhouse',
        url: process.env.IDX_OPENHOUSE_URL,
        token: process.env.IDX_TOKEN,
        displayName: 'IDX OpenHouse'
      },
      {
        name: 'property_rooms',
        url: process.env.IDX_ROOMS_URL,
        token: process.env.IDX_TOKEN,
        displayName: 'IDX Rooms'
      }
    ];

    const results = [];
    let totalDbRecords = 0;
    let feedsWithData = 0;
    let feedsComplete = 0;
    let feedsAtLimit = 0;
    let feedsWithErrors = 0;

    for (const feed of FEED_TABLES) {
      try {
        // Get current record count in database
        const { count: dbCount, error: countError } = await supabase
          .from(feed.name)
          .select('*', { count: 'exact', head: true });
        
        if (countError) {
          results.push({
            name: feed.name,
            displayName: feed.displayName,
            status: 'error',
            error: countError.message,
            dbCount: 0,
            feedAvailable: false
          });
          feedsWithErrors++;
          continue;
        }

        const currentSkip = dbCount || 0;
        totalDbRecords += currentSkip;
        
        // Try to fetch a small batch from the feed to see if there's more data
        const testBatchSize = 10;
        const { records, error: fetchError } = await fetchODataPage({
          baseUrl: feed.url,
          token: feed.token,
          top: testBatchSize,
          skip: currentSkip
        });

        if (fetchError) {
          // Check if it's an API limit error
          if (fetchError.message.includes('exceeds 100000') || fetchError.message.includes('1108')) {
            results.push({
              name: feed.name,
              displayName: feed.displayName,
              status: 'api_limit',
              dbCount: currentSkip,
              feedAvailable: false,
              message: `API limit reached (skip ${currentSkip} + batch > 100,000)`
            });
            feedsAtLimit++;
          } else {
            results.push({
              name: feed.name,
              displayName: feed.displayName,
              status: 'error',
              error: fetchError.message,
              dbCount: currentSkip,
              feedAvailable: false
            });
            feedsWithErrors++;
          }
          continue;
        }

        const hasMoreData = records && records.length > 0;
        const recordsAvailable = records ? records.length : 0;

        if (hasMoreData) {
          feedsWithData++;
        } else {
          feedsComplete++;
        }

        results.push({
          name: feed.name,
          displayName: feed.displayName,
          status: hasMoreData ? 'has_data' : 'complete',
          dbCount: currentSkip,
          feedAvailable: hasMoreData,
          recordsAvailable,
          message: hasMoreData 
            ? `${recordsAvailable} records available at skip ${currentSkip}`
            : `No more data available (tried skip ${currentSkip})`
        });

      } catch (error) {
        results.push({
          name: feed.name,
          displayName: feed.displayName,
          status: 'error',
          error: error.message,
          dbCount: 0,
          feedAvailable: false
        });
        feedsWithErrors++;
      }
    }

    res.json({
      totalDbRecords,
      feedsWithData,
      feedsComplete,
      feedsAtLimit,
      feedsWithErrors,
      allComplete: feedsWithData === 0 && feedsWithErrors === 0,
      results
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to check feed completion',
      message: error.message
    });
  }
});

// Helper function to parse sync output and update progress
function parseSyncOutput(output, type) {
  const lines = output.split('\n');
  
  for (const line of lines) {
    // Parse table progress from sync output
    if (line.includes('| Fetched:') && line.includes('| Processed:')) {
      const parts = line.split('|');
      if (parts.length >= 4) {
        const tableName = parts[0].trim().replace(/[✅❌]/g, '').trim();
        const fetched = parseInt(parts[1].replace('Fetched:', '').trim()) || 0;
        const processed = parseInt(parts[2].replace('Processed:', '').trim()) || 0;
        
        // Update or create table progress
        let tableProgress = syncState.progress.tables.find(t => t.name === tableName);
        if (!tableProgress) {
          tableProgress = {
            name: tableName,
            status: 'active',
            fetched: 0,
            processed: 0,
            total: 0,
            rounds: 0
          };
          syncState.progress.tables.push(tableProgress);
        }
        
        tableProgress.fetched += fetched;
        tableProgress.processed += processed;
        tableProgress.total = Math.max(tableProgress.total, tableProgress.fetched);
        tableProgress.rounds += 1;
        
        // Mark as completed if no more data or if we've had multiple rounds with no new data
        if (fetched === 0) {
          tableProgress.status = 'completed';
        }
      }
    }
    
    // Check for various completion indicators
    if (line.includes('synchronization finished') || 
        line.includes('Complete IDX synchronization finished') ||
        line.includes('Complete VOW synchronization finished') ||
        line.includes('✅ Done') ||
        line.includes('Final Results:')) {
      syncState.progress.completed = true;
      syncState.progress.tables.forEach(table => {
        if (table.status === 'active') {
          table.status = 'completed';
        }
      });
    }
    
    // Check for error conditions
    if (line.includes('❌') || line.includes('Failed:') || line.includes('Error:')) {
      syncState.progress.error = line.trim();
    }
    
    // Check for max rounds reached
    if (line.includes('Max rounds reached') || line.includes('No activity but not complete')) {
      syncState.progress.completed = true;
      syncState.progress.error = 'Sync completed with warnings - max rounds reached';
    }
  }
}

// RESO Web API endpoints (placeholder)
app.get('/api/reso', (req, res) => {
  res.json({
    service: 'RESO Web API 2.0.0',
    version: '2.0.0',
    endpoints: {
      metadata: '/api/reso/$metadata',
      property: '/api/reso/Property',
      media: '/api/reso/Media',
      openhouse: '/api/reso/OpenHouse'
    }
  });
});

// RESO Metadata endpoint
app.get('/api/reso/$metadata', (req, res) => {
  res.set('Content-Type', 'application/xml');
  res.send(`<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="RESO" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityType Name="Property">
        <Key>
          <PropertyRef Name="ListingKey" />
        </Key>
        <Property Name="ListingKey" Type="Edm.String" Nullable="false" />
        <Property Name="ListingId" Type="Edm.String" />
        <Property Name="StandardStatus" Type="Edm.String" />
        <Property Name="PropertyType" Type="Edm.String" />
        <Property Name="PropertySubType" Type="Edm.String" />
        <Property Name="ListPrice" Type="Edm.Decimal" />
        <Property Name="UnparsedAddress" Type="Edm.String" />
        <Property Name="City" Type="Edm.String" />
        <Property Name="StateOrProvince" Type="Edm.String" />
        <Property Name="PostalCode" Type="Edm.String" />
        <Property Name="BedroomsTotal" Type="Edm.Int32" />
        <Property Name="BathroomsTotalInteger" Type="Edm.Int32" />
        <Property Name="LivingArea" Type="Edm.Decimal" />
        <Property Name="YearBuilt" Type="Edm.Int32" />
      </EntityType>
      <EntityType Name="Media">
        <Key>
          <PropertyRef Name="MediaKey" />
        </Key>
        <Property Name="MediaKey" Type="Edm.String" Nullable="false" />
        <Property Name="ListingKey" Type="Edm.String" />
        <Property Name="MediaType" Type="Edm.String" />
        <Property Name="MediaURL" Type="Edm.String" />
        <Property Name="Order" Type="Edm.Int32" />
      </EntityType>
      <EntityType Name="OpenHouse">
        <Key>
          <PropertyRef Name="OpenHouseKey" />
        </Key>
        <Property Name="OpenHouseKey" Type="Edm.String" Nullable="false" />
        <Property Name="ListingKey" Type="Edm.String" />
        <Property Name="OpenHouseDate" Type="Edm.DateTimeOffset" />
        <Property Name="OpenHouseStartTime" Type="Edm.TimeOfDay" />
        <Property Name="OpenHouseEndTime" Type="Edm.TimeOfDay" />
        <Property Name="ShowingAgentKey" Type="Edm.String" />
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Property" EntityType="RESO.Property" />
        <EntitySet Name="Media" EntityType="RESO.Media" />
        <EntitySet Name="OpenHouse" EntityType="RESO.OpenHouse" />
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`);
});

// Placeholder endpoints for RESO resources
app.get('/api/reso/Property', (req, res) => {
  res.json({
    "@odata.context": "/api/reso/$metadata#Property",
    "value": [
      {
        "ListingKey": "sample-001",
        "ListingId": "MLS123456",
        "StandardStatus": "Active",
        "PropertyType": "Residential",
        "PropertySubType": "Single Family Residence",
        "ListPrice": 750000,
        "UnparsedAddress": "123 Main St",
        "City": "Sample City",
        "StateOrProvince": "CA",
        "PostalCode": "90210",
        "BedroomsTotal": 3,
        "BathroomsTotalInteger": 2,
        "LivingArea": 1800,
        "YearBuilt": 2020
      }
    ]
  });
});

app.get('/api/reso/Media', (req, res) => {
  res.json({
    "@odata.context": "/api/reso/$metadata#Media",
    "value": [
      {
        "MediaKey": "media-001",
        "ListingKey": "sample-001",
        "MediaType": "Photo",
        "MediaURL": "https://example.com/image1.jpg",
        "Order": 1
      }
    ]
  });
});

app.get('/api/reso/OpenHouse', (req, res) => {
  res.json({
    "@odata.context": "/api/reso/$metadata#OpenHouse",
    "value": [
      {
        "OpenHouseKey": "oh-001",
        "ListingKey": "sample-001",
        "OpenHouseDate": "2024-01-15T00:00:00Z",
        "OpenHouseStartTime": "14:00:00",
        "OpenHouseEndTime": "16:00:00",
        "ShowingAgentKey": "agent-001"
      }
    ]
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Real Estate Backend API',
    version: '2.0.0',
    description: 'RESO Web API 2.0.0 compliant real estate backend',
    endpoints: {
      health: '/api/health',
      reso: '/api/reso',
      metadata: '/api/reso/$metadata',
      property: '/api/reso/Property',
      media: '/api/reso/Media',
      openhouse: '/api/reso/OpenHouse'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Real Estate Backend API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🏠 RESO API: http://localhost:${PORT}/api/reso`);
  console.log(`📋 Metadata: http://localhost:${PORT}/api/reso/$metadata`);
});

export default app;
