import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { deckService } from '../services/deck.service';
import { auditService } from '../services/audit.service';

export const deckController = {
    listDecks: catchAsync(async (req: Request, res: Response) => {
        const { page, limit, subject, category, search, visibility, trackId } = req.query;
        const isReviewee = req.user!.role === 'REVIEWEE';

        const result = await deckService.listDecks({
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
            subject: subject as string,
            category: category as any,
            search: search as string,
            trackId: trackId as string,
            visibility: visibility as any,
            revieweeOnlyPublished: isReviewee,
            revieweeProgramTrack: (req.user as any)?.programTrack || (req.user as any)?.program || (req.user as any)?.program_track,
        });

        ApiResponse.paginated(res, result.decks, {
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    }),

    listManagedDecks: catchAsync(async (req: Request, res: Response) => {
        const { page, limit } = req.query;
        const isAdmin = req.user!.role === 'ADMIN';

        const result = await deckService.listDecks({
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
            createdBy: isAdmin ? undefined : req.user!.userId,
        });

        ApiResponse.paginated(res, result.decks, {
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    }),

    getDeck: catchAsync(async (req: Request, res: Response) => {
        const includeQuestions = req.query.questions !== 'false';
        const deck = await deckService.getDeck(req.params.id as string, includeQuestions);
        ApiResponse.success(res, deck);
    }),

    createDeck: catchAsync(async (req: Request, res: Response) => {
        const deck = await deckService.createDeck({
            ...req.body,
            createdBy: req.user!.userId,
        });

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: 'CREATE',
            entityType: 'study_deck',
            entityId: deck.id,
            summary: `Created study deck: ${deck.title}`,
            metadata: {
                title: deck.title,
            },
        });

        ApiResponse.created(res, deck, 'Study deck created');
    }),

    updateDeck: catchAsync(async (req: Request, res: Response) => {
        const deck = await deckService.updateDeck(
            req.params.id as string,
            req.user!.userId,
            req.user!.role as any,
            {
                ...req.body,
            }
        );

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: 'UPDATE',
            entityType: 'study_deck',
            entityId: deck.id,
            summary: `Updated study deck: ${deck.title}`,
            metadata: {
                title: deck.title,
            },
        });

        ApiResponse.success(res, deck, 'Study deck updated');
    }),

    deleteDeck: catchAsync(async (req: Request, res: Response) => {
        await deckService.deleteDeck(req.params.id as string, req.user!.userId, req.user!.role as any);

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: 'DELETE',
            entityType: 'study_deck',
            entityId: req.params.id as string,
            summary: `Deleted study deck with id: ${req.params.id as string}`,
        });

        ApiResponse.success(res, null, 'Study deck deleted');
    }),

    startDeckSession: catchAsync(async (req: Request, res: Response) => {
        const session = await deckService.startDeckSession(
            req.user!.userId,
            req.params.id as string,
            req.body.mode
        );

        ApiResponse.created(res, session, session.resumed ? 'Resumed in-progress deck session' : 'Deck session started');
    }),

    getDeckSession: catchAsync(async (req: Request, res: Response) => {
        const session = await deckService.getDeckSession(
            req.params.sessionId as string,
            req.user!.userId,
            req.user!.role as any
        );

        ApiResponse.success(res, session);
    }),

    saveDeckSession: catchAsync(async (req: Request, res: Response) => {
        const session = await deckService.saveDeckSession(
            req.params.sessionId as string,
            req.user!.userId,
            req.body
        );

        ApiResponse.success(res, session, 'Deck session saved');
    }),

    endDeckSession: catchAsync(async (req: Request, res: Response) => {
        const session = await deckService.endDeckSession(
            req.params.sessionId as string,
            req.user!.userId,
            req.body
        );

        ApiResponse.success(res, session, 'Deck session ended');
    }),
};
