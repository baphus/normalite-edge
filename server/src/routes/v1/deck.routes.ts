import { Router } from 'express';
import { deckController } from '../../controllers/deck.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
    createDeckSchema,
    endDeckSessionSchema,
    saveDeckSessionSchema,
    startDeckSessionSchema,
    updateDeckSchema,
} from '../../validators/deck.validator';

const router = Router();

router.use(authenticate);

router.get('/', deckController.listDecks);
router.get('/managed', authorize('ADMIN', 'REVIEWER'), deckController.listManagedDecks);
router.get('/sessions/:sessionId', deckController.getDeckSession);
router.post('/:id/sessions/start', authorize('REVIEWEE'), validate(startDeckSessionSchema), deckController.startDeckSession);
router.patch('/sessions/:sessionId/save', authorize('REVIEWEE'), validate(saveDeckSessionSchema), deckController.saveDeckSession);
router.patch('/sessions/:sessionId/end', authorize('REVIEWEE'), validate(endDeckSessionSchema), deckController.endDeckSession);
router.get('/:id', deckController.getDeck);
router.post('/', authorize('ADMIN', 'REVIEWER', 'REVIEWEE'), validate(createDeckSchema), deckController.createDeck);
router.put('/:id', authorize('ADMIN', 'REVIEWER'), validate(updateDeckSchema), deckController.updateDeck);
router.delete('/:id', authorize('ADMIN', 'REVIEWER'), deckController.deleteDeck);

export default router;
