const express = require('express');
const {
    createReview,
    getRestaurantReviews,
    getUserReviews,
    markReviewHelpful
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/restaurant/:restaurantId', getRestaurantReviews);

// Protected routes (require authentication)
router.use(protect);

// User review routes
router.post('/', createReview);
router.get('/user', getUserReviews);
router.put('/:id/helpful', markReviewHelpful);

module.exports = router;

