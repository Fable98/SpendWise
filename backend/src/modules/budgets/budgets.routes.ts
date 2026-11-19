import { Router } from 'express';
import { list, getOne, create, update, remove } from './budgets.controller';
import { validate } from '../../middleware/validate.middleware';
import { createBudgetSchema, updateBudgetSchema } from './budgets.schema';

const router = Router();

router.get('/', list);
router.get('/:id', getOne);
router.post('/', validate(createBudgetSchema), create);
router.patch('/:id', validate(updateBudgetSchema), update);
router.delete('/:id', remove);

export default router;
