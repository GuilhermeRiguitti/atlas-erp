import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { sign } from 'jsonwebtoken';

const prisma = new PrismaClient();

async function main() {
  const email = getArg('email') ?? process.argv[2];
  const secret = process.env.ONBOARDING_JWT_SECRET;

  if (!email) {
    throw new Error('Use --email=user@example.com');
  }

  if (!secret) {
    throw new Error('ONBOARDING_JWT_SECRET is not configured');
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    throw new Error(`User not found for email ${email}`);
  }

  const token = sign({ purpose: 'tenant_onboarding' }, secret, {
    expiresIn: '7d',
    subject: user.id,
  });

  const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  console.log(`${webOrigin}/onboarding?token=${encodeURIComponent(token)}`);
}

function getArg(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
