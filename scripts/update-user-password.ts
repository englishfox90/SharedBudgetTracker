import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Hash the password 'changeme123'
  const hashedPassword = await hash('changeme123', 10);
  
  console.log('Updating user password...');
  
  // Update the user
  await prisma.user.update({
    where: { email: 'user@example.com' },
    data: { password: hashedPassword }
  });
  
  console.log('✓ Password updated successfully');
  console.log('  Email: user@example.com');
  console.log('  Password: changeme123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
