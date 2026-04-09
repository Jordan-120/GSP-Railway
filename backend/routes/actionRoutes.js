const express = require('express');

const { getAllActions, getActionById } = require('../controllers/actionController');
const router = express.Router();

// Get all actions
router.get('/', getAllActions);

// Get action by ID
router.get('/:id', getActionById);

module.exports = router;