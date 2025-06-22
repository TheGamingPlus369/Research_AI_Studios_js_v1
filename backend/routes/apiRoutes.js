const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');

// Route for the Idea Lab generator
router.post('/generate-ideas', apiController.generateIdeas);

// Route for the Idea Lab Deep Dive feature
router.post('/deep-dive', apiController.deepDive);

module.exports = router;