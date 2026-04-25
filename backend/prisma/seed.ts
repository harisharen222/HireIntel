/**
 * Dev seed — creates three demo accounts mentioned in README.
 * Run with: npm run seed
 */
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const demo = [
  { email: 'candidate@demo.io', role: 'CANDIDATE', fullName: 'Demo Candidate' },
  { email: 'recruiter@demo.io', role: 'RECRUITER', fullName: 'Demo Recruiter' },
  { email: 'admin@demo.io', role: 'ADMIN', fullName: 'Demo Admin' },
] as const;

const main = async () => {
  const passwordHash = await bcrypt.hash('Demo1234!', 12);

  for (const d of demo) {
    await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        email: d.email,
        passwordHash,
        fullName: d.fullName,
        role: d.role,
      },
    });
    // eslint-disable-next-line no-console
    console.log(`✓ ensured ${d.role.padEnd(10)} ${d.email}`);
  }
};

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
