const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');

// Route for the homepage
router.get('/', pageController.renderHome);

// Route for the pricing page
router.get('/pricing', pageController.renderPricing);

// Route for the login page
router.get('/login', pageController.renderLogin);

// Route for the signup page - THIS IS THE CORRECTED LINE
router.get('/signup', pageController.renderSignup); 

// Route for the dashboard page (behind login)
router.get('/app/dashboard', pageController.renderDashboard);

router.get('/app/project/:id', pageController.renderWorkspace);




module.exports = router;