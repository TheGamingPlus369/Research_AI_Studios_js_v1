// --- Imports ---
const express = require('express');
const dotenv = 'dotenv';
const path = require('path');
const pageRoutes = require('./routes/pageRoutes'); // Import our new routes

// --- Configuration ---
require('dotenv').config(); // Corrected dotenv usage
const app = express();
const port = process.env.PORT || 3000;

// --- EJS Setup (Our View Engine) ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Middleware ---
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Routes ---
// This line tells our app to use the routes defined in pageRoutes.js
app.use('/', pageRoutes); 

// --- Server Startup ---
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});