const express = require('express');
const {
    createReservation,
    getUserReservations,
    getReservationById,
    cancelReservation,
    getAvailableTimeSlots,
    getAllRestaurantBookings,
    getRestaurantBookings,
    updateReservationStatus
} = require('../controllers/reservationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/availability/:restaurantId', getAvailableTimeSlots);

// Protected routes (require authentication)
router.use(protect);

// User reservation routes
router.post('/', createReservation);
router.get('/user', getUserReservations);

// Restaurant booking management routes (must come before generic :id routes)
router.get('/restaurant', getAllRestaurantBookings);
router.get('/restaurant/:restaurantId', getRestaurantBookings);
router.put('/:bookingId/status', updateReservationStatus);

// Generic routes (must come last to avoid conflicts)
router.get('/:id', getReservationById);
router.put('/:id/cancel', cancelReservation);

module.exports = router;

