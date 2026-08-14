import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Prisma 7 requires a driver adapter — standard url in schema.prisma is no longer supported
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Global singleton pattern to avoid creating multiple PrismaClient instances in Next.js dev (hot reload)
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
