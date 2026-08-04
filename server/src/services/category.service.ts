import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';

/**
 * Normalize category name: trim whitespace and title-case.
 * " physics " → "Physics", " GENERAL EDUCATION " → "General Education"
 */
function normalizeCategoryName(name: string): string {
    return name
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

export const categoryService = {
    async listCategories() {
        return prisma.category.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { exams: true, decks: true },
                },
            },
        });
    },

    async createCategory(name: string) {
        const normalized = normalizeCategoryName(name);

        // Check for case-insensitive duplicate
        const existing = await prisma.category.findFirst({
            where: { name: { equals: normalized, mode: 'insensitive' } },
        });

        if (existing) {
            return existing;
        }

        try {
            return await prisma.category.create({
                data: { name: normalized },
            });
        } catch (error: any) {
            if (error.code === 'P2002') {
                // Race condition - another request created it first
                const raceWinner = await prisma.category.findFirst({
                    where: { name: { equals: normalized, mode: 'insensitive' } },
                });
                if (raceWinner) {
                    return raceWinner;
                }
            }
            throw error;
        }
    },

    async updateCategory(id: string, name: string) {
        const normalized = normalizeCategoryName(name);

        const category = await prisma.category.findUnique({ where: { id } });
        if (!category) {
            throw new ApiError(404, 'Category not found');
        }

        // Check for case-insensitive duplicate (excluding current)
        const duplicate = await prisma.category.findFirst({
            where: {
                name: { equals: normalized, mode: 'insensitive' },
                id: { not: id },
            },
        });

        if (duplicate) {
            throw new ApiError(409, 'A category with this name already exists');
        }

        return prisma.category.update({
            where: { id },
            data: { name: normalized },
        });
    },

    async deleteCategory(id: string) {
        const category = await prisma.category.findUnique({ where: { id } });
        if (!category) {
            throw new ApiError(404, 'Category not found');
        }

        // Nullify foreign keys on linked exams and decks
        await prisma.$transaction([
            prisma.exam.updateMany({ where: { categoryId: id }, data: { categoryId: null } }),
            prisma.studyDeck.updateMany({ where: { categoryId: id }, data: { categoryId: null } }),
            prisma.category.delete({ where: { id } }),
        ]);

        return category;
    },

    async getCategoryExams(id: string, page: number, limit: number) {
        const category = await prisma.category.findUnique({ where: { id } });
        if (!category) {
            throw new ApiError(404, 'Category not found');
        }

        const [exams, total] = await Promise.all([
            prisma.exam.findMany({
                where: { categoryId: id },
                include: {
                    creator: { select: { firstName: true, lastName: true } },
                    category: true,
                    trackLinks: { include: { track: true } },
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.exam.count({ where: { categoryId: id } }),
        ]);

        return { exams, total, page, limit };
    },
};
