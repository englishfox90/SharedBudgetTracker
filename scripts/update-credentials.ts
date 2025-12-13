/**
 * Update user credentials (email and/or password)
 * 
 * Usage:
 *   npx tsx scripts/update-credentials.ts user@example.com newpassword
 *   npx tsx scripts/update-credentials.ts newemail@example.com newpassword
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.log('Usage: npx tsx scripts/update-credentials.ts <email> <password>');
    console.log('Example: npx tsx scripts/update-credentials.ts myemail@example.com mypassword123');
    process.exit(1);
  }

  const [newEmail, newPassword] = args;

  // Get the first (and only) user
  const user = await prisma.user.findFirst();

  if (!user) {
    console.error('❌ No user found in database');
    process.exit(1);
  }

  console.log(`Updating credentials for user ID ${user.id}...`);
  
  // Hash the new password
  const hashedPassword = await hash(newPassword, 10);
  
  // Update user
  await prisma.user.update({
    where: { id: user.id },
    data: {
      email: newEmail,
      password: hashedPassword
    }
  });
  
  console.log('✅ Credentials updated successfully!');
  console.log(`   Email: ${newEmail}`);
  console.log(`   Password: ${newPassword}`);
  console.log('\nYou can now log in with these credentials.');
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
