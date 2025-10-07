const express = require('express');
const {
    getUserProfile,
    updateUserProfile,
    updatePassword,
    addToFavorites,
    removeFromFavorites,
    getFavorites,
    addToHistory,
    getHistory
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.put('/password', updatePassword);
router.get('/favorites', getFavorites);
router.post('/favorites', addToFavorites);
router.delete('/favorites/:itemId', removeFromFavorites);
router.get('/history', getHistory);
router.post('/history', addToHistory);

module.exports = router;