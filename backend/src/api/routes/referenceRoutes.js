const express = require('express');
const router = express.Router();
const referenceController = require('../controllers/referenceController');

const authMiddleware = require('../../middleware/auth'); 

router.get('/', authMiddleware, referenceController.getAll);
router.post('/:type', authMiddleware, referenceController.createItem);
router.put('/:type/:id', authMiddleware, referenceController.updateItem);
router.delete('/:type/:id', authMiddleware, referenceController.deleteItem);

module.exports = router;