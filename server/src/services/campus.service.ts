import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';

export class CampusService {
    private normalizeCampus(campus: {
        id: string;
        name: string;
        code: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }) {
        return {
            id: campus.id,
            name: campus.name,
            code: campus.code,
            isActive: campus.isActive,
            createdAt: campus.createdAt,
            updatedAt: campus.updatedAt,
        };
    }

    private normalizePayload(data: { name: string; code?: string | null }) {
        return {
            name: data.name.trim(),
            code: data.code?.trim() ? data.code.trim() : null,
        };
    }

    private async ensureUniqueCampus(
        tx: Pick<typeof prisma, 'campus'>,
        data: { name: string; code: string | null },
        excludeId?: string
    ) {
        const conflict = await tx.campus.findFirst({
            where: {
                ...(excludeId ? { id: { not: excludeId } } : {}),
                OR: [
                    { name: { equals: data.name, mode: 'insensitive' } },
                    ...(data.code ? [{ code: { equals: data.code, mode: 'insensitive' as const } }] : []),
                ],
            },
            select: { id: true, name: true, code: true },
        });

        if (!conflict) return;

        if (conflict.name.localeCompare(data.name, undefined, { sensitivity: 'accent' }) === 0) {
            throw ApiError.conflict('A campus with this name already exists');
        }

        throw ApiError.conflict('A campus with this code already exists');
    }

    async listCampuses() {
        const campuses = await prisma.campus.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                code: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return campuses.map((campus) => this.normalizeCampus(campus));
    }

    async createCampus(data: { name: string; code?: string | null }) {
        const normalized = this.normalizePayload(data);
        if (!normalized.name) {
            throw ApiError.badRequest('Campus name is required');
        }

        const campus = await prisma.$transaction(async (tx) => {
            await this.ensureUniqueCampus(tx, normalized);

            return tx.campus.create({
                data: {
                    name: normalized.name,
                    code: normalized.code,
                },
                select: {
                    id: true,
                    name: true,
                    code: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        });

        return this.normalizeCampus(campus);
    }

    async updateCampus(campusId: string, data: { name: string; code?: string | null }) {
        const normalized = this.normalizePayload(data);
        if (!normalized.name) {
            throw ApiError.badRequest('Campus name is required');
        }

        const updatedCampus = await prisma.$transaction(async (tx) => {
            const existing = await tx.campus.findUnique({
                where: { id: campusId },
                select: {
                    id: true,
                    name: true,
                    code: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });

            if (!existing) {
                throw ApiError.notFound('Campus not found');
            }

            await this.ensureUniqueCampus(tx, normalized, campusId);

            return tx.campus.update({
                where: { id: campusId },
                data: {
                    name: normalized.name,
                    code: normalized.code,
                },
                select: {
                    id: true,
                    name: true,
                    code: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        });

        return this.normalizeCampus(updatedCampus);
    }

    async deleteCampus(campusId: string) {
        const deletedCampus = await prisma.$transaction(async (tx) => {
            const existing = await tx.campus.findUnique({
                where: { id: campusId },
                select: {
                    id: true,
                    name: true,
                    code: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });

            if (!existing) {
                throw ApiError.notFound('Campus not found');
            }

            await tx.user.updateMany({
                where: { campusId },
                data: { campusId: null },
            });

            await tx.campus.delete({ where: { id: campusId } });
            return existing;
        });

        return this.normalizeCampus(deletedCampus);
    }
}

export const campusService = new CampusService();
