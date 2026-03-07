import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';

export class TrackService {
    private normalizeTrack(track: {
        id: string;
        name: string;
        code: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }) {
        return {
            id: track.id,
            name: track.name,
            code: track.code,
            isActive: track.isActive,
            createdAt: track.createdAt,
            updatedAt: track.updatedAt,
        };
    }

    private normalizePayload(data: { name: string; code?: string | null }) {
        return {
            name: data.name.trim(),
            code: data.code?.trim() ? data.code.trim() : null,
        };
    }

    private async ensureUniqueTrack(
        tx: Pick<typeof prisma, 'track'>,
        data: { name: string; code: string | null },
        excludeId?: string
    ) {
        const conflict = await tx.track.findFirst({
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
            throw ApiError.conflict('A program with this name already exists');
        }

        throw ApiError.conflict('A program with this code already exists');
    }

    async listTracks() {
        const tracks = await prisma.track.findMany({
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

        return tracks.map((track) => this.normalizeTrack(track));
    }

    async createTrack(data: { name: string; code?: string | null }) {
        const normalized = this.normalizePayload(data);
        if (!normalized.name) {
            throw ApiError.badRequest('Program name is required');
        }

        const track = await prisma.$transaction(async (tx) => {
            await this.ensureUniqueTrack(tx, normalized);

            return tx.track.create({
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

        return this.normalizeTrack(track);
    }

    async updateTrack(trackId: string, data: { name: string; code?: string | null }) {
        const normalized = this.normalizePayload(data);
        if (!normalized.name) {
            throw ApiError.badRequest('Program name is required');
        }

        const updatedTrack = await prisma.$transaction(async (tx) => {
            const existing = await tx.track.findUnique({
                where: { id: trackId },
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
                throw ApiError.notFound('Program not found');
            }

            await this.ensureUniqueTrack(tx, normalized, trackId);

            const updated = await tx.track.update({
                where: { id: trackId },
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

            const aliases = Array.from(new Set([existing.name, existing.code].filter(Boolean) as string[]));
            const hasLabelChange = existing.name !== normalized.name || (existing.code || null) !== normalized.code;

            if (hasLabelChange) {
                await tx.user.updateMany({
                    where: {
                        OR: [
                            { trackId },
                            ...(aliases.length > 0 ? [{ programTrack: { in: aliases } }] : []),
                        ],
                    },
                    data: {
                        programTrack: updated.name,
                    },
                });

                if (aliases.length > 0) {
                    await tx.exam.updateMany({
                        where: { programTrack: { in: aliases } },
                        data: { programTrack: updated.name },
                    });

                    await tx.conference.updateMany({
                        where: { programTrack: { in: aliases } },
                        data: { programTrack: updated.name },
                    });
                }
            }

            return updated;
        });

        return this.normalizeTrack(updatedTrack);
    }

    async deleteTrack(trackId: string) {
        const deletedTrack = await prisma.$transaction(async (tx) => {
            const existing = await tx.track.findUnique({
                where: { id: trackId },
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
                throw ApiError.notFound('Program not found');
            }

            const aliases = Array.from(new Set([existing.name, existing.code].filter(Boolean) as string[]));

            await tx.user.updateMany({
                where: {
                    OR: [
                        { trackId },
                        ...(aliases.length > 0 ? [{ programTrack: { in: aliases } }] : []),
                    ],
                },
                data: {
                    trackId: null,
                    programTrack: null,
                },
            });

            if (aliases.length > 0) {
                await tx.exam.updateMany({
                    where: { programTrack: { in: aliases } },
                    data: { programTrack: null },
                });

                await tx.conference.updateMany({
                    where: { programTrack: { in: aliases } },
                    data: { programTrack: null },
                });
            }

            await tx.track.delete({ where: { id: trackId } });
            return existing;
        });

        return this.normalizeTrack(deletedTrack);
    }
}

export const trackService = new TrackService();
