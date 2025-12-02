const express = require('express');
const {
    createReservation,
    getUserReservations,
    getReservationById,
    cancelReservation,
    getAvailableTimeSlots
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
router.get('/:id', getReservationById);
router.put('/:id/cancel', cancelReservation);

module.exports = router;

