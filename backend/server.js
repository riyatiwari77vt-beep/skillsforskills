// server.js – express server serving APIs and frontend static files
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// Initialize Database connection and auto table setup
require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve CSS files from FRONTEND/css at /css
app.use('/css', express.static(path.join(__dirname, '..', 'FRONTEND', 'css')));
// Serve JS files from FRONTEND/js at /js
app.use('/js', express.static(path.join(__dirname, '..', 'FRONTEND', 'js')));

// API Routes
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);

// Serve HTML files from FRONTEND/html
app.use(express.static(path.join(__dirname, '..', 'FRONTEND', 'html')));

// Fallback to index.html for any unknown routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'FRONTEND', 'html', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`================================================`);
  console.log(`🚀 Skill-for-Skill Server is running!`);
  console.log(`🔗 Local Server: http://localhost:${PORT}`);
  console.log(`================================================`);
});
