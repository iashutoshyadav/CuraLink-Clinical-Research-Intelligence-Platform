import { Router } from 'express';
import { getSession } from '../controllers/session.controller.js';

const router = Router();

router.get('/:id', getSession);

export default router;
