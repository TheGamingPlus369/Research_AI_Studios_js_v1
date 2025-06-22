// --- Configuration FIRST ---
// This MUST be the first line to ensure all environment variables are loaded
// before any other module (like controllers) that might need them.
require('dotenv').config();

// --- Imports ---
const express = require('express');
const path = require('path');
const pageRoutes = require('./routes/pageRoutes');
const apiRoutes = require('./routes/apiRoutes');

// --- Express App Setup ---
const app = express();
const port = process.env.PORT || 3000;

// --- EJS Setup & Middleware ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Routes ---
app.use('/', pageRoutes);
app.use('/api', apiRoutes);

// --- Server Startup ---
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});