const express = require('express');
const router = express.Router();
const multer = require('multer');

// Import the new, separated controllers
const ideaLabController = require('../controllers/ideaLabController');
const literatureHubController = require('../controllers/literatureHubController');

// Configure multer for in-memory file storage
const upload = multer({ storage: multer.memoryStorage() });

// --- Idea Lab Routes ---
router.post('/generate-ideas', ideaLabController.generateIdeas);
router.post('/deep-dive', ideaLabController.deepDive);

// --- Literature Hub Routes ---
router.post('/literature/upload-file', upload.single('sourceFile'), literatureHubController.handleFileUpload);
router.post('/literature/upload-from-url', literatureHubController.handleUrlUpload);
router.post('/literature/find-sources', literatureHubController.findSources);

module.exports = router;