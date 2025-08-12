// Application Configuration

import { config as dotenvConfig } from 'dotenv';
import { AppConfig } from '../types';

// Load environment variables from .env file
dotenvConfig();

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  return value || defaultValue!;
}

function getEnvVarOptional(name: string, defaultValue?: string): string | undefined {
  return process.env[name] || defaultValue;
}

export const config: AppConfig = {
  environment: (process.env.ENVIRONMENT as 'development' | 'staging' | 'production') || 'development',
  
  plaid: {
    clientId: getEnvVar('PLAID_CLIENT_ID'),
    secretKey: process.env.ENVIRONMENT === 'production' 
      ? getEnvVar('PLAID_PRODUCTION_API_KEY')
      : getEnvVar('PLAID_SANDBOX_API_KEY'),
    environment: (process.env.PLAID_ENV as 'sandbox' | 'development' | 'production') || 'sandbox',
    products: ['transactions', 'assets'],
    countryCodes: ['US'],
  },
  
  nile: {
    url: getEnvVar('NILEDB_URL'),
    apiUrl: getEnvVar('NILEDB_API_URL'),
    user: getEnvVar('NILEDB_USER'),
    password: getEnvVar('NILEDB_PASSWORD'),
    database: getEnvVar('NILEDB_DATABASE'),
  },
  
  jwt: {
    secret: getEnvVar('JWT_SECRET'),
    expiresIn: getEnvVarOptional('JWT_EXPIRES_IN', '7d')!,
  },
  
  encryption: {
    key: getEnvVar('ENCRYPTION_KEY'),
  },
  
  stripe: {
    publishableKey: getEnvVar('STRIPE_PUBLISHABLE_KEY'),
    secretKey: getEnvVar('STRIPE_SECRET_KEY'),
    webhookSecret: getEnvVar('STRIPE_WEBHOOK_SECRET'),
  },
};

// Validation function to ensure all required config is present
export function validateConfig(): void {
  const requiredFields = [
    'plaid.clientId',
    'plaid.secretKey',
    'nile.url',
    'nile.apiUrl',
    'nile.user',
    'nile.password',
    'nile.database',
    'jwt.secret',
    'encryption.key',
    'stripe.publishableKey',
    'stripe.secretKey',
    'stripe.webhookSecret',
  ];

  const missingFields: string[] = [];

  requiredFields.forEach(field => {
    const keys = field.split('.');
    let value: any = config;
    
    for (const key of keys) {
      value = value?.[key];
    }
    
    if (!value) {
      missingFields.push(field);
    }
  });

  if (missingFields.length > 0) {
    throw new Error(
      `Missing required configuration fields: ${missingFields.join(', ')}\n` +
      'Please check your environment variables.'
    );
  }
}

// Helper functions for specific configurations
export const getPlaidConfig = () => config.plaid;
export const getNileConfig = () => config.nile;
export const getJWTConfig = () => config.jwt;
export const getEncryptionConfig = () => config.encryption;
export const getStripeConfig = () => config.stripe;

// Environment helpers
export const isDevelopment = () => config.environment === 'development';
export const isProduction = () => config.environment === 'production';
export const isStaging = () => config.environment === 'staging';

// Database connection string builder
export const buildNileConnectionString = (): string => {
  const { url } = config.nile;
  return url;
};

// Plaid environment mapping
export const getPlaidEnvironment = (): 'sandbox' | 'development' | 'production' => {
  return config.plaid.environment;
};

// Export individual config sections for convenience
export { config as default };