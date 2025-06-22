#!/usr/bin/env node

// Generate a secure random string for NextAuth secret
const crypto = require('crypto');
const secret = crypto.randomBytes(32).toString('hex');
console.log('Generated NEXTAUTH_SECRET:');
console.log(secret);
console.log('\nAdd this to your environment variables or docker-compose.yml'); 