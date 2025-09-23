const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// MongoDB Connection (Fixed)
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => console.log('❌ MongoDB Connection Error:', err));

// Basic route
app.get('/', (req, res) => {
    res.json({ message: '🚀 SmartGenie Backend is Running!' });
});

// Test route for auth
app.get('/api/test', (req, res) => {
    res.json({ message: 'Auth API is working!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🎯 Server running on port ${PORT}`);
});