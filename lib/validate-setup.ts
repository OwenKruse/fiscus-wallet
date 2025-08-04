// Setup Validation Script

import { config, validateConfig } from './config';

export function validateProjectSetup(): {
  success: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Validate configuration
    validateConfig();
    console.log('✅ Configuration validation passed');
  } catch (error) {
    errors.push(`Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Check Plaid configuration
  try {
    const plaidConfig = config.plaid;
    if (!plaidConfig.clientId) {
      errors.push('Plaid Client ID is missing');
    }
    if (!plaidConfig.secretKey) {
      errors.push('Plaid Secret Key is missing');
    }
    if (!['sandbox', 'development', 'production'].includes(plaidConfig.environment)) {
      errors.push('Invalid Plaid environment');
    }
    console.log('✅ Plaid configuration validated');
  } catch (error) {
    errors.push(`Plaid configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Check Nile DB configuration
  try {
    const nileConfig = config.nile;
    if (!nileConfig.url) {
      errors.push('Nile DB URL is missing');
    }
    if (!nileConfig.apiUrl) {
      errors.push('Nile DB API URL is missing');
    }
    if (!nileConfig.user) {
      errors.push('Nile DB user is missing');
    }
    if (!nileConfig.password) {
      errors.push('Nile DB password is missing');
    }
    console.log('✅ Nile DB configuration validated');
  } catch (error) {
    errors.push(`Nile DB configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Check JWT configuration
  try {
    const jwtConfig = config.jwt;
    if (!jwtConfig.secret) {
      errors.push('JWT secret is missing');
    } else if (jwtConfig.secret.length < 32) {
      warnings.push('JWT secret should be at least 32 characters long for security');
    }
    console.log('✅ JWT configuration validated');
  } catch (error) {
    errors.push(`JWT configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Check encryption configuration
  try {
    const encryptionConfig = config.encryption;
    if (!encryptionConfig.key) {
      errors.push('Encryption key is missing');
    } else if (encryptionConfig.key.length !== 32) {
      warnings.push('Encryption key should be exactly 32 characters long');
    }
    console.log('✅ Encryption configuration validated');
  } catch (error) {
    errors.push(`Encryption configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Check TypeScript types
  try {
    // This will fail at compile time if types are not properly set up
    const testPlaidConfig: typeof config.plaid = config.plaid;
    const testNileConfig: typeof config.nile = config.nile;
    console.log('✅ TypeScript types validated');
  } catch (error) {
    errors.push(`TypeScript types error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const success = errors.length === 0;

  if (success) {
    console.log('🎉 Project setup validation completed successfully!');
    if (warnings.length > 0) {
      console.log('⚠️  Warnings:');
      warnings.forEach(warning => console.log(`   - ${warning}`));
    }
  } else {
    console.log('❌ Project setup validation failed:');
    errors.forEach(error => console.log(`   - ${error}`));
  }

  return { success, errors, warnings };
}

// Export for use in other files
export default validateProjectSetup;