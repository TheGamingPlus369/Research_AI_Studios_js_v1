const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const multer = require('multer');

// Configure multer for in-memory file storage
const upload = multer({ storage: multer.memoryStorage() });

// --- Idea Lab Routes ---
router.post('/generate-ideas', apiController.generateIdeas);
router.post('/deep-dive', apiController.deepDive);

// --- NEW: Literature Hub Routes ---
router.post('/literature/upload-file', upload.single('sourceFile'), apiController.handleFileUpload);
router.post('/literature/upload-from-url', apiController.handleUrlUpload);

router.post('/literature/find-sources', apiController.findSources);


module.exports = router;