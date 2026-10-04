import { PrismaClient } from "@prisma/client";
import { DEFAULT_CATEGORY_NAMES } from "@betu/shared";

const prisma = new PrismaClient();

const DEFAULT_ICONS: Record<string, string> = {
  Study: "book",
  Work: "briefcase",
  Coding: "code",
  Exercise: "dumbbell",
  Reading: "book-open",
  Cleaning: "spray",
  Personal: "user",
  Other: "circle",
};

async function main(): Promise<void> {
  // Postgres unique constraints treat NULL as distinct from NULL, so the
  // (userId, name) composite index can't dedupe global (userId=null)
  // categories via upsert. Check-then-create instead.
  for (const name of DEFAULT_CATEGORY_NAMES) {
    const existing = await prisma.category.findFirst({ where: { userId: null, name } });
    if (!existing) {
      await prisma.category.create({
        data: { name, isDefault: true, icon: DEFAULT_ICONS[name] ?? null, userId: null },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
