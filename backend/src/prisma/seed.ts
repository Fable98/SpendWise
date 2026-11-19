import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

const defaultCategories = [
  { name: 'Salary', type: 'INCOME' as const },
  { name: 'Freelance', type: 'INCOME' as const },
  { name: 'Investments', type: 'INCOME' as const },
  { name: 'Other Income', type: 'INCOME' as const },
  { name: 'Food & Dining', type: 'EXPENSE' as const },
  { name: 'Transportation', type: 'EXPENSE' as const },
  { name: 'Shopping', type: 'EXPENSE' as const },
  { name: 'Entertainment', type: 'EXPENSE' as const },
  { name: 'Bills & Utilities', type: 'EXPENSE' as const },
  { name: 'Healthcare', type: 'EXPENSE' as const },
  { name: 'Education', type: 'EXPENSE' as const },
  { name: 'Travel', type: 'EXPENSE' as const },
  { name: 'Other Expenses', type: 'EXPENSE' as const },
];

async function main() {
  console.log('Seeding default categories...');
  for (const cat of defaultCategories) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name, type: cat.type, userId: null },
    });
    if (!existing) {
      await prisma.category.create({
        data: { name: cat.name, type: cat.type, userId: null },
      });
      console.log(`  ✓ Created: ${cat.name} (${cat.type})`);
    } else {
      console.log(`  — Exists:  ${cat.name}`);
    }
  }
  console.log('\nSeeding complete.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
