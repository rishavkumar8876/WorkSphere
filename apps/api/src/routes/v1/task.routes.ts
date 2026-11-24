import { Router } from 'express';
import { taskController } from '../../controllers/task.controller';
import { authenticate } from '../../middleware/authenticate';
import { tenantGuard } from '../../middleware/tenantGuard';
import { validateRequest } from '../../middleware/validateRequest';
import {
  createTaskSchema,
  updateTaskSchema,
  queryTasksSchema,
  addCommentSchema,
  addSubtaskSchema,
} from '../../validators/business.validator';

const router = Router();

router.use(authenticate, tenantGuard);

router.get('/', validateRequest(queryTasksSchema), taskController.listTasks);
router.post('/', validateRequest(createTaskSchema), taskController.createTask);
router.get('/:id', taskController.getTask);

// Optimistic Concurrency Control update endpoint
router.patch('/:id', validateRequest(updateTaskSchema), taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

// Subtasks
router.post('/:taskId/subtasks', validateRequest(addSubtaskSchema), taskController.addSubtask);
router.patch('/subtasks/:id', taskController.toggleSubtask);

// Comments
router.post('/:taskId/comments', validateRequest(addCommentSchema), taskController.addComment);
router.get('/:taskId/comments', taskController.listComments);

// Activity Timeline
router.get('/:taskId/timeline', taskController.getTimeline);

export default router;
