// Quick test to verify route exists
const express = require('express');
const app = express();

// Test the route loading
try {
    const restaurantRoutes = require('./routes/restaurants');
    console.log('✅ Restaurant routes loaded successfully');
    console.log('Routes:', restaurantRoutes);
    
    app.use('/api/restaurants', restaurantRoutes);
    
    app.listen(5001, () => {
        console.log('✅ Test server running on port 5001');
        console.log('Test: POST http://localhost:5001/api/restaurants/register');
    });
} catch (error) {
    console.error('❌ Error loading routes:', error);
}

