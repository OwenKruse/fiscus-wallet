// Password Hashing and Validation Utilities

import bcrypt from 'bcryptjs';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
  score: number;
}

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxLength?: number;
  forbiddenPasswords?: string[];
}

export class PasswordUtils {
  private static readonly DEFAULT_SALT_ROUNDS = 12;
  private static readonly DEFAULT_REQUIREMENTS: PasswordRequirements = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    maxLength: 128,
    forbiddenPasswords: [
      'password',
      '123456',
      '123456789',
      'qwerty',
      'abc123',
      'password123',
      'admin',
      'letmein',
      'welcome',
      'monkey'
    ]
  };

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string, saltRounds: number = this.DEFAULT_SALT_ROUNDS): Promise<string> {
    try {
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      console.error('Password hashing error:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify a password against its hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Validate password strength and requirements
   */
  static validatePassword(
    password: string, 
    requirements: Partial<PasswordRequirements> = {}
  ): PasswordValidationResult {
    const reqs = { ...this.DEFAULT_REQUIREMENTS, ...requirements };
    const errors: string[] = [];
    let score = 0;

    // Check length
    if (password.length < reqs.minLength) {
      errors.push(`Password must be at least ${reqs.minLength} characters long`);
    } else {
      score += 1;
    }

    if (reqs.maxLength && password.length > reqs.maxLength) {
      errors.push(`Password must not exceed ${reqs.maxLength} characters`);
    }

    // Check uppercase requirement
    if (reqs.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else if (/[A-Z]/.test(password)) {
      score += 1;
    }

    // Check lowercase requirement
    if (reqs.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else if (/[a-z]/.test(password)) {
      score += 1;
    }

    // Check numbers requirement
    if (reqs.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else if (/\d/.test(password)) {
      score += 1;
    }

    // Check special characters requirement
    if (reqs.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 1;
    }

    // Check for forbidden passwords
    if (reqs.forbiddenPasswords?.some(forbidden => 
      password.toLowerCase().includes(forbidden.toLowerCase())
    )) {
      errors.push('Password contains common words that are not allowed');
      score = Math.max(0, score - 2);
    }

    // Additional strength checks
    if (password.length >= 12) score += 1;
    if (/[A-Z].*[A-Z]/.test(password)) score += 0.5; // Multiple uppercase
    if (/[a-z].*[a-z]/.test(password)) score += 0.5; // Multiple lowercase
    if (/\d.*\d/.test(password)) score += 0.5; // Multiple numbers
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?].*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 0.5; // Multiple special chars
    }

    // Check for patterns that reduce strength
    if (/(.)\1{2,}/.test(password)) { // Repeated characters
      score -= 1;
      errors.push('Password should not contain repeated characters');
    }

    if (/123|abc|qwe|asd|zxc/i.test(password)) { // Sequential patterns
      score -= 1;
    }

    // Determine strength
    let strength: 'weak' | 'medium' | 'strong';
    if (score < 3) {
      strength = 'weak';
    } else if (score < 5) {
      strength = 'medium';
    } else {
      strength = 'strong';
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength,
      score: Math.max(0, Math.min(10, score))
    };
  }

  /**
   * Generate a secure random password
   */
  static generateSecurePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = uppercase + lowercase + numbers + specialChars;
    let password = '';

    // Ensure at least one character from each category
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specialChars[Math.floor(Math.random() * specialChars.length)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check if password needs to be rehashed (e.g., due to updated salt rounds)
   */
  static needsRehash(hash: string, saltRounds: number = this.DEFAULT_SALT_ROUNDS): boolean {
    try {
      // Extract salt rounds from hash
      const rounds = parseInt(hash.split('$')[2]);
      return rounds < saltRounds;
    } catch (error) {
      // If we can't parse the hash, assume it needs rehashing
      return true;
    }
  }

  /**
   * Estimate password cracking time
   */
  static estimateCrackingTime(password: string): string {
    const charset = this.getCharsetSize(password);
    const entropy = Math.log2(Math.pow(charset, password.length));
    
    // Assume 1 billion guesses per second
    const guessesPerSecond = 1e9;
    const averageGuesses = Math.pow(2, entropy - 1);
    const seconds = averageGuesses / guessesPerSecond;

    if (seconds < 60) return 'Less than a minute';
    if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
    if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
    if (seconds < 31536000000) return `${Math.round(seconds / 31536000)} years`;
    return 'Centuries';
  }

  private static getCharsetSize(password: string): number {
    let size = 0;
    if (/[a-z]/.test(password)) size += 26;
    if (/[A-Z]/.test(password)) size += 26;
    if (/\d/.test(password)) size += 10;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) size += 32;
    return size;
  }
}

// Export convenience functions
export const hashPassword = PasswordUtils.hashPassword;
export const verifyPassword = PasswordUtils.verifyPassword;
export const validatePassword = PasswordUtils.validatePassword;
export const generateSecurePassword = PasswordUtils.generateSecurePassword;