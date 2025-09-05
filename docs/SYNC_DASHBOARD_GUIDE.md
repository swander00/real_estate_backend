# 🔄 Sync Dashboard Guide

The Sync Dashboard is a comprehensive web interface for managing database synchronization operations in your Real Estate Backend. It provides an intuitive, click-based interface for all sync operations.

## 🌐 Accessing the Dashboard

Open your web browser and navigate to:
```
http://localhost:3001/sync-dashboard
```

## 🎯 Features

### **Operations Tab**
- **Backfill Operations**: Perform initial data loading from IDX and VOW APIs
- **Quick Actions**: Trigger individual provider syncs
- **Provider Selection**: Choose between IDX, VOW, or both
- **Sync Types**: Full sync (backfill) or incremental sync
- **Force Options**: Overwrite existing data when needed

### **Status Tab**
- **System Status**: Real-time server, database, and cache health
- **Sync Statistics**: Job counts, success rates, and performance metrics
- **Active Jobs**: Monitor currently running sync operations
- **Progress Tracking**: See real-time progress of sync jobs

### **Logs Tab**
- **Activity Logs**: Real-time log of all sync operations
- **Color-coded Messages**: Info (blue), success (green), warning (yellow), error (red)
- **Timestamped Entries**: Track when operations occurred
- **Log Management**: Clear logs and maintain history

### **Settings Tab**
- **API Configuration**: Set server URL and authentication
- **Auto-refresh**: Configure automatic status updates
- **Connection Testing**: Verify API connectivity
- **Persistent Settings**: Save configuration for future sessions

## 🚀 Getting Started

### 1. **Initial Setup**
1. Open the dashboard in your browser
2. Go to the **Settings** tab
3. Verify the API Base URL is correct (`http://localhost:3001`)
4. Click **Test Connection** to verify connectivity
5. Save your settings

### 2. **First Backfill**
1. Go to the **Operations** tab
2. Select your providers (IDX, VOW, or both)
3. Choose **Full Sync** for initial backfill
4. Click **Start Backfill**
5. Monitor progress in the **Status** tab

### 3. **Regular Operations**
1. Use **Incremental Sync** for regular updates
2. Monitor **Active Jobs** for progress
3. Check **Logs** for detailed operation history
4. Review **Statistics** for performance insights

## 🔧 Configuration Options

### **Provider Selection**
- **IDX**: Internet Data Exchange provider
- **VOW**: Virtual Office Website provider
- **Both**: Sync from both providers simultaneously

### **Sync Types**
- **Full Sync**: Complete data refresh (recommended for initial setup)
- **Incremental Sync**: Only new/updated records (recommended for regular updates)

### **Force Sync**
- **Enabled**: Overwrites existing data even if unchanged
- **Disabled**: Skips unchanged records (faster, recommended)

### **Auto-refresh Intervals**
- **5 seconds**: High-frequency updates (for active monitoring)
- **10 seconds**: Balanced updates (recommended)
- **30 seconds**: Low-frequency updates (for background monitoring)
- **1 minute**: Minimal updates (for occasional checking)
- **Disabled**: Manual refresh only

## 📊 Understanding the Interface

### **Status Indicators**
- 🟢 **Healthy**: System is operating normally
- 🟡 **Warning**: Minor issues or active operations
- 🔴 **Error**: Critical issues requiring attention
- 🔵 **Idle**: System is ready and waiting

### **Button Colors**
- **Blue**: Standard operations (sync, refresh)
- **Green**: Start operations (backfill, sync)
- **Yellow**: Warning operations (incremental sync)
- **Red**: Destructive operations (clear logs)

### **Log Messages**
- **Info** (Blue): General information and status updates
- **Success** (Green): Successful operations and completions
- **Warning** (Yellow): Non-critical issues and notifications
- **Error** (Red): Failed operations and critical issues

## 🛠️ Troubleshooting

### **Connection Issues**
1. Check that the server is running on the correct port
2. Verify the API Base URL in Settings
3. Use **Test Connection** to diagnose issues
4. Check server logs for detailed error messages

### **Authentication Errors**
1. Ensure you have a valid JWT token (if required)
2. Check that the token is properly configured in Settings
3. Verify user permissions for sync operations

### **Sync Failures**
1. Check the **Logs** tab for detailed error messages
2. Verify API credentials are configured correctly
3. Ensure database connectivity is working
4. Check that required tables exist

### **Performance Issues**
1. Monitor **Statistics** for performance trends
2. Adjust auto-refresh intervals if needed
3. Check system resources (memory, CPU)
4. Consider reducing batch sizes for large datasets

## 🔒 Security Considerations

### **Authentication**
- The dashboard requires JWT authentication for write operations
- Read operations (status, logs) are accessible without authentication
- Store JWT tokens securely and don't share them

### **Network Security**
- Use HTTPS in production environments
- Restrict access to the dashboard in production
- Consider IP whitelisting for sensitive operations

### **Data Protection**
- Sync operations can modify large amounts of data
- Always backup your database before major operations
- Test sync operations in a development environment first

## 📈 Best Practices

### **Initial Setup**
1. Run a full backfill during off-peak hours
2. Monitor system resources during initial data load
3. Verify data quality after backfill completion
4. Set up automated incremental syncs

### **Regular Operations**
1. Use incremental syncs for regular updates
2. Monitor sync success rates and performance
3. Set up alerts for failed syncs
4. Regularly review sync statistics

### **Monitoring**
1. Check the dashboard regularly for system health
2. Monitor active jobs and their progress
3. Review logs for any issues or patterns
4. Keep track of sync performance over time

## 🆘 Support

If you encounter issues:

1. **Check the Logs**: Review the activity logs for error messages
2. **Test Connection**: Use the connection test in Settings
3. **Verify Configuration**: Ensure all settings are correct
4. **Check Server Status**: Verify the backend server is running
5. **Review Documentation**: Consult the main sync guide for detailed information

For additional help, refer to the main project documentation or create an issue in the project repository.

---

**Happy Syncing!** 🚀
