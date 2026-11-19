import { prisma } from '../../config/prisma';
import { TransactionType } from '@prisma/client';

export async function getCategories(userId: string) {
  return prisma.category.findMany({
    where: { OR: [{ userId: null }, { userId }] },
    orderBy: [{ userId: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, type: true, userId: true, createdAt: true },
  });
}

export async function getCategoryById(id: string, userId: string) {
  const category = await prisma.category.findFirst({
    where: { id, OR: [{ userId: null }, { userId }] },
  });
  return category;
}

export async function createCategory(userId: string, data: { name: string; type: TransactionType }) {
  return prisma.category.create({
    data: { ...data, userId },
    select: { id: true, name: true, type: true, userId: true, createdAt: true },
  });
}

export async function updateCategory(id: string, userId: string, data: { name?: string }) {
  const category = await prisma.category.findFirst({
    where: { id, userId },
  });
  if (!category) return null;
  return prisma.category.update({
    where: { id },
    data,
    select: { id: true, name: true, type: true, userId: true, createdAt: true },
  });
}

export async function deleteCategory(id: string, userId: string): Promise<boolean> {
  const category = await prisma.category.findFirst({ where: { id, userId } });
  if (!category) return false;
  await prisma.category.delete({ where: { id } });
  return true;
}
