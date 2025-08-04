#!/usr/bin/env tsx

// Simple script to test if encryption is working correctly
import { getTokenEncryption } from '../lib/encryption/token-encryption'

async function testEncryption() {
  try {
    console.log('Testing encryption configuration...')
    
    const encryption = getTokenEncryption()
    const testToken = 'test-token-12345'
    
    console.log('Original token:', testToken)
    
    // Test encryption
    const encrypted = encryption.encrypt(testToken)
    console.log('Encrypted successfully:', {
      encryptedData: encrypted.encrypted.substring(0, 20) + '...',
      iv: encrypted.iv.substring(0, 20) + '...'
    })
    
    // Test decryption
    const decrypted = encryption.decrypt(encrypted.encrypted, encrypted.iv)
    console.log('Decrypted token:', decrypted)
    
    if (decrypted === testToken) {
      console.log('✅ Encryption test passed!')
    } else {
      console.log('❌ Encryption test failed - tokens do not match')
    }
    
  } catch (error) {
    console.error('❌ Encryption test failed:', error)
    process.exit(1)
  }
}

testEncryption()