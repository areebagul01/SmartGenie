const express = require('express');
const {
    registerRestaurantOwner,
    getMyRestaurant,
    updateRestaurant,
    getAllRestaurants,
    getRestaurantById
} = require('../controllers/restaurantController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', registerRestaurantOwner);
router.get('/', getAllRestaurants);
router.get('/:id', getRestaurantById);

// Protected routes (require authentication)
router.use(protect);
router.get('/my/restaurant', getMyRestaurant);
router.put('/my/restaurant', updateRestaurant);

module.exports = router;