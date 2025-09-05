/**
 * Environment Validation
 * Validates environment variables and configuration on startup
 */

// import { logger } from '../api/services/monitoringService.js'; // Commented out to avoid circular dependency

class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.validated = false;
  }

  // Validate all environment variables
  validate() {
    console.log('🔍 Validating environment configuration...\n');

    this.validateRequired();
    this.validateOptional();
    this.validateFormats();
    this.validateSecurity();
    this.validateExternalServices();

    this.validated = true;
    this.generateReport();

    if (this.errors.length > 0) {
      throw new Error(`Environment validation failed: ${this.errors.join(', ')}`);
    }

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  // Validate required environment variables
  validateRequired() {
    const required = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'JWT_SECRET'
    ];

    for (const varName of required) {
      if (!process.env[varName]) {
        this.errors.push(`Required environment variable ${varName} is missing`);
      } else {
        this.addSuccess(`Required environment variable ${varName} is set`);
      }
    }
  }

  // Validate optional environment variables
  validateOptional() {
    const optional = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'REDIS_URL',
      'IDX_API_URL',
      'IDX_API_KEY',
      'IDX_FREEHOLD_URL',
      'IDX_CONDO_URL',
      'IDX_LEASE_URL',
      'IDX_MEDIA_URL',
      'IDX_OPENHOUSE_URL',
      'IDX_ROOMS_URL',
      'VOW_API_URL',
      'VOW_API_KEY',
      'VOW_FREEHOLD_URL',
      'VOW_CONDO_URL',
      'VOW_LEASE_URL',
      'VOW_MEDIA_URL',
      'VOW_OPENHOUSE_URL',
      'VOW_ROOMS_URL',
      'PORT',
      'NODE_ENV',
      'LOG_LEVEL',
      'RATE_LIMIT_WINDOW_MS',
      'RATE_LIMIT_MAX_REQUESTS',
      'CACHE_TTL_SECONDS'
    ];

    for (const varName of optional) {
      if (process.env[varName]) {
        this.addSuccess(`Optional environment variable ${varName} is set`);
      } else {
        this.addWarning(`Optional environment variable ${varName} is not set`);
      }
    }
  }

  // Validate environment variable formats
  validateFormats() {
    // Validate SUPABASE_URL format
    if (process.env.SUPABASE_URL) {
      if (!process.env.SUPABASE_URL.startsWith('https://') || !process.env.SUPABASE_URL.includes('.supabase.co')) {
        this.errors.push('SUPABASE_URL must be a valid Supabase URL (https://*.supabase.co)');
      } else {
        this.addSuccess('SUPABASE_URL format is valid');
      }
    }

    // Validate JWT_SECRET strength
    if (process.env.JWT_SECRET) {
      if (process.env.JWT_SECRET.length < 32) {
        this.errors.push('JWT_SECRET must be at least 32 characters long');
      } else {
        this.addSuccess('JWT_SECRET is sufficiently long');
      }
    }

    // Validate PORT format
    if (process.env.PORT) {
      const port = parseInt(process.env.PORT);
      if (isNaN(port) || port < 1 || port > 65535) {
        this.errors.push('PORT must be a valid port number (1-65535)');
      } else {
        this.addSuccess('PORT format is valid');
      }
    }

    // Validate NODE_ENV
    if (process.env.NODE_ENV) {
      const validEnvs = ['development', 'production', 'test', 'staging'];
      if (!validEnvs.includes(process.env.NODE_ENV)) {
        this.errors.push(`NODE_ENV must be one of: ${validEnvs.join(', ')}`);
      } else {
        this.addSuccess('NODE_ENV is valid');
      }
    }

    // Validate REDIS_URL format
    if (process.env.REDIS_URL) {
      if (!process.env.REDIS_URL.startsWith('redis://') && !process.env.REDIS_URL.startsWith('rediss://')) {
        this.errors.push('REDIS_URL must start with redis:// or rediss://');
      } else {
        this.addSuccess('REDIS_URL format is valid');
      }
    }

    // Validate numeric values
    const numericVars = [
      'RATE_LIMIT_WINDOW_MS',
      'RATE_LIMIT_MAX_REQUESTS',
      'CACHE_TTL_SECONDS'
    ];

    for (const varName of numericVars) {
      if (process.env[varName]) {
        const value = parseInt(process.env[varName]);
        if (isNaN(value) || value <= 0) {
          this.errors.push(`${varName} must be a positive number`);
        } else {
          this.addSuccess(`${varName} format is valid`);
        }
      }
    }
  }

  // Validate security-related configuration
  validateSecurity() {
    // Check for weak JWT secrets in development
    if (process.env.NODE_ENV === 'development' && process.env.JWT_SECRET) {
      const weakSecrets = ['secret', 'password', '123456', 'jwt-secret', 'your-secret-key'];
      if (weakSecrets.includes(process.env.JWT_SECRET)) {
        this.addWarning('JWT_SECRET appears to be a weak default value');
      }
    }

    // Check for production security settings
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        this.addWarning('SUPABASE_SERVICE_ROLE_KEY not set in production');
      }

      if (process.env.LOG_LEVEL === 'debug') {
        this.addWarning('LOG_LEVEL is set to debug in production');
      }

      if (!process.env.REDIS_URL) {
        this.addWarning('REDIS_URL not set in production - using memory cache');
      }
    }

    // Check for exposed sensitive data
    const sensitiveVars = ['SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET', 'IDX_API_KEY', 'VOW_API_KEY'];
    for (const varName of sensitiveVars) {
      if (process.env[varName] && process.env[varName].length < 20) {
        this.addWarning(`${varName} appears to be too short for a secure key`);
      }
    }
  }

  // Validate external service configuration
  validateExternalServices() {
    // Validate IDX API configuration
    if (process.env.IDX_API_URL && !process.env.IDX_API_KEY) {
      this.addWarning('IDX_API_URL is set but IDX_API_KEY is missing');
    } else if (!process.env.IDX_API_URL && process.env.IDX_API_KEY) {
      this.addWarning('IDX_API_KEY is set but IDX_API_URL is missing');
    } else if (process.env.IDX_API_URL && process.env.IDX_API_KEY) {
      this.addSuccess('IDX API configuration is complete');
    }

    // Validate VOW API configuration
    if (process.env.VOW_API_URL && !process.env.VOW_API_KEY) {
      this.addWarning('VOW_API_URL is set but VOW_API_KEY is missing');
    } else if (!process.env.VOW_API_URL && process.env.VOW_API_KEY) {
      this.addWarning('VOW_API_KEY is set but VOW_API_URL is missing');
    } else if (process.env.VOW_API_URL && process.env.VOW_API_KEY) {
      this.addSuccess('VOW API configuration is complete');
    }

    // Check for at least one external API
    if (!process.env.IDX_API_URL && !process.env.VOW_API_URL) {
      this.addWarning('No external APIs configured - sync functionality will be limited');
    }
  }

  // Add success message
  addSuccess(message) {
    console.log(`  ✅ ${message}`);
  }

  // Add warning message
  addWarning(message) {
    this.warnings.push(message);
    console.log(`  ⚠️  ${message}`);
  }

  // Add error message
  addError(message) {
    this.errors.push(message);
    console.log(`  ❌ ${message}`);
  }

  // Generate validation report
  generateReport() {
    console.log('\n📊 Environment Validation Report');
    console.log('='.repeat(50));
    console.log(`Errors: ${this.errors.length}`);
    console.log(`Warnings: ${this.warnings.length}`);
    console.log(`Status: ${this.errors.length === 0 ? 'VALID' : 'INVALID'}`);

    if (this.errors.length > 0) {
      console.log('\n❌ Critical Issues:');
      this.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('\n✅ All environment variables are properly configured!');
    } else if (this.errors.length === 0) {
      console.log('\n✅ Environment is valid with some warnings to consider.');
    } else {
      console.log('\n🚨 Environment validation failed. Please fix the errors above.');
    }

    // Log to monitoring service
    if (this.validated) {
      console.log('Environment validation completed', {
        errors: this.errors.length,
        warnings: this.warnings.length,
        valid: this.errors.length === 0
      });
    }
  }

  // Get environment summary
  getSummary() {
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      timestamp: new Date().toISOString()
    };
  }

  // Validate specific environment variable
  validateVariable(name, value, rules = {}) {
    const errors = [];

    if (rules.required && !value) {
      errors.push(`${name} is required`);
    }

    if (value && rules.minLength && value.length < rules.minLength) {
      errors.push(`${name} must be at least ${rules.minLength} characters long`);
    }

    if (value && rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${name} must be no more than ${rules.maxLength} characters long`);
    }

    if (value && rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${name} format is invalid`);
    }

    if (value && rules.numeric) {
      const num = parseInt(value);
      if (isNaN(num)) {
        errors.push(`${name} must be a number`);
      } else if (rules.min && num < rules.min) {
        errors.push(`${name} must be at least ${rules.min}`);
      } else if (rules.max && num > rules.max) {
        errors.push(`${name} must be no more than ${rules.max}`);
      }
    }

    return errors;
  }
}

// Create global validator instance
const environmentValidator = new EnvironmentValidator();

export { environmentValidator };
export default environmentValidator;
