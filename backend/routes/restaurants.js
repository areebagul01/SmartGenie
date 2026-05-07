const express = require('express');
const fs = require('fs');
const path = require('path');
const {
    registerRestaurant,
    loginRestaurant,
    getRestaurantStatus,
    getRestaurantStatusByEmail,
    getRestaurantDetails,
    updateRestaurantProfile,
    getAllRestaurants,
    getRestaurantCardProfile,
    updateRestaurantCardProfile,
    uploadRestaurantCardImage
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
    updateTotalCapacity,
    getSpecialOffers,
    createSpecialOffer,
    updateSpecialOffer,
    deleteSpecialOffer,
    toggleSpecialOfferStatus
} = require('../controllers/menuController');
const {
    getRestaurantReviews,
    createReview
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

const multer = require('multer');
const router = express.Router();

// ============================================
// Image Upload (Restaurant Card)
// ============================================

const cardImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'uploads', 'restaurant-cards');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, `${req.params.restaurantId}-${Date.now()}${ext}`);
    }
});

const cardImageFileFilter = (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
};

const uploadCardImage = multer({
    storage: cardImageStorage,
    fileFilter: cardImageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

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

// Get all approved restaurants (PUBLIC)
router.get('/', getAllRestaurants);

// Public routes - More specific routes must come before generic :restaurantId route
// Get restaurant card profile (public)
router.get('/:restaurantId/card-profile', getRestaurantCardProfile);

// Get restaurant menu (public)
router.get('/:restaurantId/menu', getMenuItems);

// Get restaurant seat slots (public)
router.get('/:restaurantId/seat-slots', getSeatSlots);

// Get restaurant reviews (public)
router.get('/:restaurantId/reviews', getRestaurantReviews);

// Get restaurant details (public) - Must be last to avoid route conflicts
router.get('/:restaurantId', getRestaurantDetails);

// Protected routes
router.use(protect);

// Create review for restaurant (user only)
// Wrapper to pass restaurantId from params to body
router.post('/:restaurantId/reviews', (req, res, next) => {
    // Set restaurantId from params to body
    req.body.restaurantId = req.params.restaurantId;
    next();
}, createReview);

// Upload restaurant card image (owner only)
// Support both routes for compatibility
const handleImageUpload = (req, res, next) => {
    uploadCardImage.single('image')(req, res, (err) => {
        if (err) {
            console.error('Multer Error:', err);
            return res.status(400).json({
                success: false,
                message: err.message || 'File upload failed',
                error: err.message
            });
        }
        next();
    });
};

router.post(
    '/:restaurantId/card-image',
    handleImageUpload,
    uploadRestaurantCardImage
);
router.post(
    '/:restaurantId/card-profile/image',
    handleImageUpload,
    uploadRestaurantCardImage
);

// Get restaurant status by owner ID
router.get('/status/:ownerId', getRestaurantStatus);

// Menu management routes (protected - owner only)
router.post('/:restaurantId/menu', createMenuItem);
router.put('/:restaurantId/menu/:menuItemId', updateMenuItem);
router.patch('/:restaurantId/menu/:menuItemId/status', toggleMenuItemStatus);
router.delete('/:restaurantId/menu/:menuItemId', deleteMenuItem);

// Seat availability routes (protected - owner only)
router.post('/:restaurantId/seat-slots', upsertSeatSlot);
router.put('/:restaurantId/seat-slots/:slotId', updateSeatSlot);
router.delete('/:restaurantId/seat-slots/:slotId', deleteSeatSlot);
router.patch('/:restaurantId/seat-slots/capacity', updateTotalCapacity);

// Special offers routes
router.get('/:restaurantId/menu/special-offers', getSpecialOffers);
router.post('/:restaurantId/menu/special-offers', createSpecialOffer);
router.put('/:restaurantId/menu/special-offers/:offerId', updateSpecialOffer);
router.delete('/:restaurantId/menu/special-offers/:offerId', deleteSpecialOffer);
router.put('/:restaurantId/menu/special-offers/:offerId/status', toggleSpecialOfferStatus);

// Update restaurant profile (owner only)
router.put('/:restaurantId', updateRestaurantProfile);

// Update restaurant card profile (owner only)
router.put('/:restaurantId/card-profile', updateRestaurantCardProfile);

module.exports = router;

