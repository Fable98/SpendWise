import { Router } from 'express';
import { list, getOne, create, update, remove } from './transactions.controller';
import { validate } from '../../middleware/validate.middleware';
import {
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionsSchema,
} from './transactions.schema';

const router = Router();

router.get('/', validate(listTransactionsSchema), list);
router.get('/:id', getOne);
router.post('/', validate(createTransactionSchema), create);
router.patch('/:id', validate(updateTransactionSchema), update);
router.delete('/:id', remove);

export default router;
