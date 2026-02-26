import prisma from '../config/db';

export class TrackService {
    async listTracks() {
        return prisma.track.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                code: true,
            },
        });
    }
}

export const trackService = new TrackService();
