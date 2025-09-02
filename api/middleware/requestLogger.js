// api/middleware/requestLogger.js - Request logging middleware

/**
 * Log all incoming requests for monitoring and debugging
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Log request start
  console.log(`📥 ${req.method} ${req.originalUrl} - Started`);
  
  // Log request details in development
  if (process.env.NODE_ENV === 'development') {
    console.log('   📋 Request Details:', {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: req.params,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    
    // Log response
    const emoji = statusCode < 400 ? '✅' : statusCode < 500 ? '⚠️' : '❌';
    console.log(`${emoji} ${req.method} ${req.originalUrl} - ${statusCode} (${duration}ms)`);
    
    // Log response details in development for errors
    if (process.env.NODE_ENV === 'development' && statusCode >= 400) {
      console.log('   📋 Response Details:', {
        statusCode,
        duration: `${duration}ms`,
        headers: res.getHeaders()
      });
    }
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
}
