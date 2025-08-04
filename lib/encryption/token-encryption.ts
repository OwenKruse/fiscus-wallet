// Token Encryption/Decryption Utilities for Secure Storage

import crypto from 'crypto';
import { getEncryptionConfig } from '../config';

export interface EncryptionResult {
  encrypted: string;
  iv: string;
}

export class TokenEncryption {
  private readonly algorithm = 'aes-256-cbc';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly key: Buffer;

  constructor() {
    const config = getEncryptionConfig();
    
    // Ensure the key is exactly 32 bytes for AES-256
    if (config.key.length !== 64) { // 32 bytes = 64 hex characters
      throw new Error('Encryption key must be exactly 32 bytes (64 hex characters)');
    }
    
    this.key = Buffer.from(config.key, 'hex');
  }

  /**
   * Encrypts a token string using AES-256-CBC
   * @param token - The token to encrypt
   * @returns Object containing encrypted data and IV
   */
  encrypt(token: string): EncryptionResult {
    try {
      // Generate a random initialization vector
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher using createCipheriv (not deprecated createCipher)
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      // Encrypt the token
      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return {
        encrypted,
        iv: iv.toString('hex'),
      };
    } catch (error) {
      throw new Error(`Token encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypts an encrypted token using AES-256-CBC
   * @param encryptedData - The encrypted token data
   * @param iv - The initialization vector used for encryption
   * @returns The decrypted token string
   */
  decrypt(encryptedData: string, iv: string): string {
    try {
      // Create decipher using createDecipheriv (not deprecated createDecipher)
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, Buffer.from(iv, 'hex'));
      
      // Decrypt the token
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Token decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encrypts a token and returns a single string containing both encrypted data and IV
   * @param token - The token to encrypt
   * @returns Base64 encoded string containing IV and encrypted data
   */
  encryptToString(token: string): string {
    const result = this.encrypt(token);
    const combined = `${result.iv}:${result.encrypted}`;
    return Buffer.from(combined).toString('base64');
  }

  /**
   * Decrypts a token from a single string containing both encrypted data and IV
   * @param encryptedString - Base64 encoded string containing IV and encrypted data
   * @returns The decrypted token string
   */
  decryptFromString(encryptedString: string): string {
    try {
      const combined = Buffer.from(encryptedString, 'base64').toString('utf8');
      const [iv, encrypted] = combined.split(':');
      
      if (!iv || !encrypted) {
        throw new Error('Invalid encrypted string format');
      }
      
      return this.decrypt(encrypted, iv);
    } catch (error) {
      throw new Error(`Token decryption from string failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates that an encrypted string can be decrypted
   * @param encryptedString - The encrypted string to validate
   * @returns True if the string can be decrypted, false otherwise
   */
  validateEncryptedString(encryptedString: string): boolean {
    try {
      this.decryptFromString(encryptedString);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generates a new encryption key for configuration
   * @returns A new 32-byte encryption key as hex string
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Singleton instance
let tokenEncryptionInstance: TokenEncryption | null = null;

export function getTokenEncryption(): TokenEncryption {
  if (!tokenEncryptionInstance) {
    tokenEncryptionInstance = new TokenEncryption();
  }
  return tokenEncryptionInstance;
}

// Convenience functions
export const encryptToken = (token: string): string => {
  return getTokenEncryption().encryptToString(token);
};

export const decryptToken = (encryptedToken: string): string => {
  return getTokenEncryption().decryptFromString(encryptedToken);
};

export const validateEncryptedToken = (encryptedToken: string): boolean => {
  return getTokenEncryption().validateEncryptedString(encryptedToken);
};