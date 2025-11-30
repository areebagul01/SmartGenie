const express = require('express');
const {
    registerRestaurant,
    loginRestaurant,
    getRestaurantStatus,
    getRestaurantStatusByEmail,
    getRestaurantDetails,
    updateRestaurantProfile
} = require('../controllers/restaurantController');
const {
    getMenuItems,
    createMenuItem,
    updateMenuItem,
    toggleMenuItemStatus,
    deleteMenuItem,
    getSeatSlots,
    upsertSeatSlot,
    updateSeatSlot,
    deleteSeatSlot,
    updateTotalCapacity
} = require('../controllers/menuController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Debug: Log all routes
console.log('🍽️ Restaurant routes loaded:');
console.log('  POST /api/restaurants/register');
console.log('  POST /api/restaurants/login');
console.log('  GET /api/restaurants/status/email/:email');
console.log('  GET /api/restaurants/:restaurantId');
console.log('  PUT /api/restaurants/:restaurantId');
console.log('  GET /api/restaurants/:restaurantId/menu');
console.log('  POST /api/restaurants/:restaurantId/menu');
console.log('  PUT /api/restaurants/:restaurantId/menu/:menuItemId');
console.log('  PATCH /api/restaurants/:restaurantId/menu/:menuItemId/status');
console.log('  DELETE /api/restaurants/:restaurantId/menu/:menuItemId');
console.log('  GET /api/restaurants/:restaurantId/seat-slots');
console.log('  POST /api/restaurants/:restaurantId/seat-slots');
console.log('  PUT /api/restaurants/:restaurantId/seat-slots/:slotId');
console.log('  DELETE /api/restaurants/:restaurantId/seat-slots/:slotId');
console.log('  PATCH /api/restaurants/:restaurantId/seat-slots/capacity');

// Public routes
// Restaurant registration (public - creates user account if needed)
router.post('/register', (req, res, next) => {
    console.log('📝 Register route hit!', req.method, req.path);
    next();
}, registerRestaurant);

// Restaurant login (public)
router.post('/login', loginRestaurant);

// Get restaurant status by email (public for checking status)
router.get('/status/email/:email', getRestaurantStatusByEmail);

// Get restaurant details (public)
router.get('/:restaurantId', getRestaurantDetails);

// Protected routes
router.use(protect);

// Get restaurant status by owner ID
router.get('/status/:ownerId', getRestaurantStatus);

// Menu management routes
router.get('/:restaurantId/menu', getMenuItems);
router.post('/:restaurantId/menu', createMenuItem);
router.put('/:restaurantId/menu/:menuItemId', updateMenuItem);
router.patch('/:restaurantId/menu/:menuItemId/status', toggleMenuItemStatus);
router.delete('/:restaurantId/menu/:menuItemId', deleteMenuItem);

// Seat availability routes
router.get('/:restaurantId/seat-slots', getSeatSlots);
router.post('/:restaurantId/seat-slots', upsertSeatSlot);
router.put('/:restaurantId/seat-slots/:slotId', updateSeatSlot);
router.delete('/:restaurantId/seat-slots/:slotId', deleteSeatSlot);
router.patch('/:restaurantId/seat-slots/capacity', updateTotalCapacity);

// Update restaurant profile (owner only)
router.put('/:restaurantId', updateRestaurantProfile);

module.exports = router;

