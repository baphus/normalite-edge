import { ApplicableCategory, DeckSessionMode, DeckSessionStatus, Role, Visibility } from '@prisma/client';
import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';
import { notificationService } from './notification.service';

export class DeckService {
    private categoryLabel(category?: ApplicableCategory | null) {
        switch (category) {
            case 'GENERAL_EDUCATION':
                return 'General Education';
            case 'PROFESSIONAL_EDUCATION':
                return 'Professional Education';
            case 'SPECIALIZATION':
                return 'Specialization';
            default:
                return 'No Category';
        }
    }

    private normalizeDeck(deck: any) {
        return {
            ...deck,
            categoryCode: deck.category,
            category: this.categoryLabel(deck.category),
            tracks: (deck.trackLinks || []).map((link: any) => ({
                id: link.track.id,
                name: link.track.name,
                code: link.track.code,
            })),
            trackIds: (deck.trackLinks || []).map((link: any) => link.track.id),
            creator: deck.creator
                ? {
                    ...deck.creator,
                    name: `${deck.creator.firstName} ${deck.creator.lastName}`.trim(),
                }
                : undefined,
            totalItems: deck._count?.questions ?? deck.questions?.length ?? 0,
        };
    }

    private normalizeSession(session: any) {
        return {
            ...session,
            summary: {
                score: session.score,
                totalItems: session.totalItems,
                viewedItems: (session.items || []).filter((item: any) => item.wasViewed).length,
                correctItems: (session.items || []).filter((item: any) => item.isCorrect === true).length,
            },
        };
    }

    async listDecks(params: {
        page?: number;
        limit?: number;
        subject?: string;
        category?: ApplicableCategory;
        trackId?: string;
        search?: string;
        visibility?: Visibility;
        createdBy?: string;
        revieweeOnlyPublished?: boolean;
        revieweeProgramTrack?: string;
    }) {
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (params.subject) where.subject = params.subject;
        if (params.category) where.category = params.category;
        if (params.trackId) {
            where.trackLinks = { some: { trackId: params.trackId } };
        }
        if (params.createdBy) where.createdBy = params.createdBy;

        if (params.visibility) {
            where.visibility = params.visibility;
        } else if (params.revieweeOnlyPublished) {
            where.visibility = 'PUBLISHED';
        }

        if (params.search) {
            where.OR = [
                { title: { contains: params.search, mode: 'insensitive' } },
                { description: { contains: params.search, mode: 'insensitive' } },
            ];
        }

        if (params.revieweeOnlyPublished && params.revieweeProgramTrack) {
            where.AND = [
                ...(where.AND || []),
                {
                    OR: [
                        { trackLinks: { none: {} } },
                        {
                            trackLinks: {
                                some: {
                                    track: {
                                        OR: [
                                            { name: { equals: params.revieweeProgramTrack, mode: 'insensitive' } },
                                            { code: { equals: params.revieweeProgramTrack, mode: 'insensitive' } },
                                        ],
                                    },
                                },
                            },
                        },
                    ],
                },
            ];
        }

        const [decks, total] = await Promise.all([
            prisma.studyDeck.findMany({
                where,
                include: {
                    creator: { select: { id: true, firstName: true, lastName: true } },
                    trackLinks: { include: { track: true } },
                    _count: { select: { questions: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.studyDeck.count({ where }),
        ]);

        return {
            decks: decks.map((deck) => this.normalizeDeck(deck)),
            total,
            page,
            limit,
        };
    }

    async getDeck(id: string, includeQuestions = true) {
        const deck = await prisma.studyDeck.findUnique({
            where: { id },
            include: {
                creator: { select: { id: true, firstName: true, lastName: true } },
                trackLinks: { include: { track: true } },
                questions: includeQuestions ? { orderBy: { orderNo: 'asc' } } : false,
                _count: { select: { questions: true } },
            },
        });

        if (!deck) throw ApiError.notFound('Study deck not found');
        return this.normalizeDeck(deck);
    }

    async createDeck(data: {
        title: string;
        description?: string;
        subject?: string;
        category?: ApplicableCategory | null;
        visibility?: Visibility;
        trackIds?: string[];
        questions?: {
            orderNo?: number;
            questionText: string;
            imageUrl?: string;
            choiceA?: string;
            choiceB?: string;
            choiceC?: string;
            choiceD?: string;
            correctChoice?: string;
            answerText?: string;
            rationalization?: string;
            points?: number;
        }[];
        createdBy: string;
    }) {
        const deck = await prisma.$transaction(async (tx) => {
            const uniqueTrackIds = Array.from(new Set(data.trackIds || []));
            if (uniqueTrackIds.length > 0) {
                const trackCount = await tx.track.count({ where: { id: { in: uniqueTrackIds }, isActive: true } });
                if (trackCount !== uniqueTrackIds.length) {
                    throw ApiError.badRequest('One or more selected tracks are invalid or inactive');
                }
            }

            const createdDeck = await tx.studyDeck.create({
                data: {
                    title: data.title,
                    description: data.description,
                    subject: data.subject,
                    category: data.category,
                    visibility: data.visibility || 'DRAFT',
                    createdBy: data.createdBy,
                },
            });

            if (uniqueTrackIds.length > 0) {
                await tx.studyDeckTrack.createMany({
                    data: uniqueTrackIds.map((trackId) => ({
                        deckId: createdDeck.id,
                        trackId,
                    })),
                });
            }

            if (data.questions && data.questions.length > 0) {
                await tx.studyDeckQuestion.createMany({
                    data: data.questions.map((question, index) => ({
                        deckId: createdDeck.id,
                        orderNo: question.orderNo ?? index + 1,
                        questionText: question.questionText,
                        imageUrl: question.imageUrl,
                        choiceA: question.choiceA,
                        choiceB: question.choiceB,
                        choiceC: question.choiceC,
                        choiceD: question.choiceD,
                        correctChoice: question.correctChoice,
                        answerText: question.answerText,
                        rationalization: question.rationalization,
                        points: question.points ?? 1,
                    })),
                });
            }

            return tx.studyDeck.findUnique({
                where: { id: createdDeck.id },
                include: {
                    creator: { select: { id: true, firstName: true, lastName: true } },
                    trackLinks: { include: { track: true } },
                    questions: { orderBy: { orderNo: 'asc' } },
                    _count: { select: { questions: true } },
                },
            });
        });

        if (deck?.visibility === 'PUBLISHED') {
            const recipientUserIds = await notificationService.getActiveRevieweeIdsByTrackLabels(
                (deck.trackLinks || []).flatMap((link: any) => [link.track.name, link.track.code].filter(Boolean) as string[])
            );
            await notificationService.createNotifications({
                recipientUserIds,
                type: 'DECK_PUBLISHED',
                title: 'New Study Deck Published',
                message: `A new study deck is available: ${deck.title}`,
                link: '/study',
                entityType: 'study_deck',
                entityId: deck.id,
                severity: 'INFO',
            });
        }

        return this.normalizeDeck(deck);
    }

    async updateDeck(
        deckId: string,
        userId: string,
        userRole: Role,
        data: {
            title?: string;
            description?: string;
            subject?: string;
            category?: ApplicableCategory | null;
            visibility?: Visibility;
            trackIds?: string[];
            questions?: {
                orderNo?: number;
                questionText: string;
                imageUrl?: string;
                choiceA?: string;
                choiceB?: string;
                choiceC?: string;
                choiceD?: string;
                correctChoice?: string;
                answerText?: string;
                rationalization?: string;
                points?: number;
            }[];
        }
    ) {
        const existingDeck = await prisma.studyDeck.findUnique({ where: { id: deckId } });
        if (!existingDeck) throw ApiError.notFound('Study deck not found');
        if (userRole !== 'ADMIN' && existingDeck.createdBy !== userId) {
            throw ApiError.forbidden('You can only edit study decks you created');
        }

        const wasPublished = existingDeck.visibility === 'PUBLISHED';

        const updatedDeck = await prisma.$transaction(async (tx) => {
            const uniqueTrackIds = data.trackIds ? Array.from(new Set(data.trackIds)) : undefined;
            if (uniqueTrackIds && uniqueTrackIds.length > 0) {
                const trackCount = await tx.track.count({ where: { id: { in: uniqueTrackIds }, isActive: true } });
                if (trackCount !== uniqueTrackIds.length) {
                    throw ApiError.badRequest('One or more selected tracks are invalid or inactive');
                }
            }

            await tx.studyDeck.update({
                where: { id: deckId },
                data: {
                    title: data.title,
                    description: data.description,
                    subject: data.subject,
                    category: data.category,
                    visibility: data.visibility,
                },
            });

            if (uniqueTrackIds) {
                await tx.studyDeckTrack.deleteMany({ where: { deckId } });
                if (uniqueTrackIds.length > 0) {
                    await tx.studyDeckTrack.createMany({
                        data: uniqueTrackIds.map((trackId) => ({ deckId, trackId })),
                    });
                }
            }

            if (data.questions) {
                await tx.studyDeckQuestion.deleteMany({ where: { deckId } });

                if (data.questions.length > 0) {
                    await tx.studyDeckQuestion.createMany({
                        data: data.questions.map((question, index) => ({
                            deckId,
                            orderNo: question.orderNo ?? index + 1,
                            questionText: question.questionText,
                            imageUrl: question.imageUrl,
                            choiceA: question.choiceA,
                            choiceB: question.choiceB,
                            choiceC: question.choiceC,
                            choiceD: question.choiceD,
                            correctChoice: question.correctChoice,
                            answerText: question.answerText,
                            rationalization: question.rationalization,
                            points: question.points ?? 1,
                        })),
                    });
                }
            }

            return tx.studyDeck.findUnique({
                where: { id: deckId },
                include: {
                    creator: { select: { id: true, firstName: true, lastName: true } },
                    trackLinks: { include: { track: true } },
                    questions: { orderBy: { orderNo: 'asc' } },
                    _count: { select: { questions: true } },
                },
            });
        });

        if (updatedDeck?.visibility === 'PUBLISHED' && !wasPublished) {
            const recipientUserIds = await notificationService.getActiveRevieweeIdsByTrackLabels(
                (updatedDeck.trackLinks || []).flatMap((link: any) => [link.track.name, link.track.code].filter(Boolean) as string[])
            );
            await notificationService.createNotifications({
                recipientUserIds,
                type: 'DECK_PUBLISHED',
                title: 'New Study Deck Published',
                message: `A new study deck is available: ${updatedDeck.title}`,
                link: '/study',
                entityType: 'study_deck',
                entityId: updatedDeck.id,
                severity: 'INFO',
            });
        }

        return this.normalizeDeck(updatedDeck);
    }

    async deleteDeck(deckId: string, userId: string, userRole: Role) {
        const deck = await prisma.studyDeck.findUnique({ where: { id: deckId } });
        if (!deck) throw ApiError.notFound('Study deck not found');
        if (userRole !== 'ADMIN' && deck.createdBy !== userId) {
            throw ApiError.forbidden('You can only delete study decks you created');
        }

        await prisma.studyDeck.delete({ where: { id: deckId } });
        return { id: deckId };
    }

    async startDeckSession(userId: string, deckId: string, mode: DeckSessionMode) {
        const deck = await prisma.studyDeck.findUnique({
            where: { id: deckId },
            include: { _count: { select: { questions: true } } },
        });

        if (!deck) throw ApiError.notFound('Study deck not found');
        if (deck.visibility !== 'PUBLISHED') {
            throw ApiError.forbidden('Study deck is not published');
        }

        const existing = await prisma.deckSession.findFirst({
            where: { userId, deckId, mode, status: 'IN_PROGRESS' },
            include: {
                deck: true,
                items: {
                    include: {
                        deckQuestion: true,
                    },
                },
            },
            orderBy: { startedAt: 'desc' },
        });

        if (existing) {
            return {
                ...this.normalizeSession(existing),
                resumed: true,
            };
        }

        const session = await prisma.deckSession.create({
            data: {
                userId,
                deckId,
                mode,
                status: 'IN_PROGRESS',
                totalItems: deck._count.questions,
                lastSavedAt: new Date(),
            },
            include: {
                deck: true,
                items: {
                    include: {
                        deckQuestion: true,
                    },
                },
            },
        });

        return {
            ...this.normalizeSession(session),
            resumed: false,
        };
    }

    async getDeckSession(sessionId: string, userId: string, userRole: Role) {
        const session = await prisma.deckSession.findUnique({
            where: { id: sessionId },
            include: {
                deck: true,
                items: {
                    include: {
                        deckQuestion: true,
                    },
                },
            },
        });

        if (!session) throw ApiError.notFound('Deck session not found');
        if (userRole !== 'ADMIN' && session.userId !== userId) {
            throw ApiError.forbidden('Not your deck session');
        }

        return this.normalizeSession(session);
    }

    async saveDeckSession(
        sessionId: string,
        userId: string,
        data: {
            currentIndex?: number;
            score?: number;
            totalItems?: number;
            items?: {
                questionId: string;
                wasViewed?: boolean;
                selectedChoice?: 'A' | 'B' | 'C' | 'D' | null;
                isCorrect?: boolean | null;
            }[];
        }
    ) {
        const session = await prisma.deckSession.findUnique({ where: { id: sessionId } });
        if (!session) throw ApiError.notFound('Deck session not found');
        if (session.userId !== userId) throw ApiError.forbidden('Not your deck session');
        if (session.status !== 'IN_PROGRESS') throw ApiError.badRequest('Cannot save a completed/ended session');

        await prisma.$transaction(async (tx) => {
            if (data.items && data.items.length > 0) {
                for (const item of data.items) {
                    await tx.deckSessionItem.upsert({
                        where: {
                            sessionId_deckQuestionId: {
                                sessionId,
                                deckQuestionId: item.questionId,
                            },
                        },
                        update: {
                            wasViewed: item.wasViewed ?? true,
                            selectedChoice: item.selectedChoice ?? null,
                            isCorrect: item.isCorrect ?? null,
                            interactedAt: new Date(),
                        },
                        create: {
                            sessionId,
                            deckQuestionId: item.questionId,
                            wasViewed: item.wasViewed ?? true,
                            selectedChoice: item.selectedChoice ?? null,
                            isCorrect: item.isCorrect ?? null,
                            interactedAt: new Date(),
                        },
                    });
                }
            }

            await tx.deckSession.update({
                where: { id: sessionId },
                data: {
                    currentIndex: data.currentIndex,
                    score: data.score,
                    totalItems: data.totalItems,
                    lastSavedAt: new Date(),
                },
            });
        });

        return this.getDeckSession(sessionId, userId, 'REVIEWEE');
    }

    async endDeckSession(
        sessionId: string,
        userId: string,
        data: {
            status?: DeckSessionStatus;
            currentIndex?: number;
            score?: number;
            totalItems?: number;
            items?: {
                questionId: string;
                wasViewed?: boolean;
                selectedChoice?: 'A' | 'B' | 'C' | 'D' | null;
                isCorrect?: boolean | null;
            }[];
        }
    ) {
        const session = await prisma.deckSession.findUnique({ where: { id: sessionId } });
        if (!session) throw ApiError.notFound('Deck session not found');
        if (session.userId !== userId) throw ApiError.forbidden('Not your deck session');
        if (session.status !== 'IN_PROGRESS') throw ApiError.badRequest('Session is already finalized');

        await prisma.$transaction(async (tx) => {
            if (data.items && data.items.length > 0) {
                for (const item of data.items) {
                    await tx.deckSessionItem.upsert({
                        where: {
                            sessionId_deckQuestionId: {
                                sessionId,
                                deckQuestionId: item.questionId,
                            },
                        },
                        update: {
                            wasViewed: item.wasViewed ?? true,
                            selectedChoice: item.selectedChoice ?? null,
                            isCorrect: item.isCorrect ?? null,
                            interactedAt: new Date(),
                        },
                        create: {
                            sessionId,
                            deckQuestionId: item.questionId,
                            wasViewed: item.wasViewed ?? true,
                            selectedChoice: item.selectedChoice ?? null,
                            isCorrect: item.isCorrect ?? null,
                            interactedAt: new Date(),
                        },
                    });
                }
            }

            await tx.deckSession.update({
                where: { id: sessionId },
                data: {
                    status: data.status || 'ENDED',
                    endedAt: new Date(),
                    currentIndex: data.currentIndex,
                    score: data.score,
                    totalItems: data.totalItems,
                    lastSavedAt: new Date(),
                },
            });
        });

        return this.getDeckSession(sessionId, userId, 'REVIEWEE');
    }
}

export const deckService = new DeckService();
