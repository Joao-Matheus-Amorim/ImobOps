import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

type PrismaGlobal = typeof globalThis & {
  __imobopsPrisma?: PrismaClient;
};

const globalForPrisma = globalThis as PrismaGlobal;

function createPrismaClient(): PrismaClient | null {
  if (!process.env.DATABASE_URL) return null;

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    adapter,
  });
}

export const prisma = globalForPrisma.__imobopsPrisma ?? createPrismaClient();

if (prisma && process.env.NODE_ENV !== "production") {
  globalForPrisma.__imobopsPrisma = prisma;
}

export default prisma;