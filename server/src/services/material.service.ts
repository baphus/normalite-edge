import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';

export class MaterialService {
    async listMaterials(params: {
        page?: number;
        limit?: number;
        subject?: string;
        program?: string;
        type?: string;
        search?: string;
        createdBy?: string;
    }) {
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (params.subject) where.subject = params.subject;
        if (params.program) where.program = params.program;
        if (params.type) where.type = params.type;
        if (params.createdBy) where.createdBy = params.createdBy;
        if (params.search) {
            where.OR = [
                { title: { contains: params.search, mode: 'insensitive' } },
                { description: { contains: params.search, mode: 'insensitive' } },
            ];
        }

        const [materials, total] = await Promise.all([
            prisma.material.findMany({
                where,
                include: {
                    creator: { select: { id: true, name: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.material.count({ where }),
        ]);

        return { materials, total, page, limit };
    }

    async getMaterial(id: string) {
        const material = await prisma.material.findUnique({
            where: { id },
            include: { creator: { select: { id: true, name: true } } },
        });
        if (!material) throw ApiError.notFound('Material not found');
        return material;
    }

    async createMaterial(data: {
        title: string;
        description?: string;
        type: string;
        subject: string;
        program?: string;
        linkUrl?: string;
        content?: string;
        createdBy: string;
    }) {
        return prisma.material.create({
            data,
            include: { creator: { select: { id: true, name: true } } },
        });
    }

    async updateMaterial(id: string, data: {
        title?: string;
        description?: string;
        type?: string;
        subject?: string;
        program?: string;
        linkUrl?: string;
        content?: string;
    }) {
        const material = await prisma.material.findUnique({ where: { id } });
        if (!material) throw ApiError.notFound('Material not found');

        return prisma.material.update({
            where: { id },
            data,
            include: { creator: { select: { id: true, name: true } } },
        });
    }

    async deleteMaterial(id: string) {
        const material = await prisma.material.findUnique({ where: { id } });
        if (!material) throw ApiError.notFound('Material not found');
        await prisma.material.delete({ where: { id } });
        return { id };
    }
}

export const materialService = new MaterialService();
