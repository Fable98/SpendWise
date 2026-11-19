import { Router } from 'express';
import { list, getOne, create, update, remove } from './categories.controller';
import { validate } from '../../middleware/validate.middleware';
import { createCategorySchema, updateCategorySchema } from './categories.schema';

const router = Router();

router.get('/', list);
router.get('/:id', getOne);
router.post('/', validate(createCategorySchema), create);
router.patch('/:id', validate(updateCategorySchema), update);
router.delete('/:id', remove);

export default router;
