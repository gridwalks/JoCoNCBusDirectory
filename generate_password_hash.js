// Generate bcrypt hash for admin123
// Run: node generate_password_hash.js

import bcrypt from 'bcryptjs';

async function generateHash() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  console.log('Password:', password);
  console.log('Bcrypt Hash:', hash);
  console.log('\nSQL to update admin user:');
  console.log(`UPDATE "User" SET "password" = '${hash}' WHERE "username" = 'admin';`);
  console.log('\nOr use this in INSERT:');
  console.log(`'${hash}'`);
}

generateHash().catch(console.error);

