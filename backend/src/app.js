const express = require('express');
const cors = require('cors');
const grievanceRoutes = require('./routes/grievances');
const budgetRoutes = require('./routes/budgeting');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const departmentRoutes = require('./routes/departments');
const wardRoutes = require('./routes/wards');
const citizenAuthRoutes = require('./routes/citizenAuth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));


// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Civic backend is running' });
});
app.use('/api/grievances', grievanceRoutes);
app.use('/api/budget/proposals', budgetRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/wards', wardRoutes);
app.use('/api/citizen', citizenAuthRoutes);

module.exports = app;