const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Get user profile
// @route   GET /api/users/profile
exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        console.error('Get Profile Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
exports.updateUserProfile = async (req, res) => {
    try {
        const { name, phone, address, avatar } = req.body;
        
        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
            {
                name,
                'profile.phone': phone,
                'profile.address': address,
                'profile.avatar': avatar
            },
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: { user: updatedUser }
        });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// @desc    Update password
// @route   PUT /api/users/password
exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        const user = await User.findById(req.user.userId).select('+password');
        
        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        
        user.password = hashedNewPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        console.error('Update Password Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// @desc    Add to favorites
// @route   POST /api/users/favorites
exports.addToFavorites = async (req, res) => {
    try {
        const { itemId } = req.body;

        const user = await User.findById(req.user.userId);
        
        // Check if already in favorites
        if (user.favorites.includes(itemId)) {
            return res.status(400).json({
                success: false,
                message: 'Item already in favorites'
            });
        }

        user.favorites.push(itemId);
        await user.save();

        res.json({
            success: true,
            message: 'Added to favorites',
            data: { favorites: user.favorites }
        });
    } catch (error) {
        console.error('Add Favorite Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// @desc    Remove from favorites
// @route   DELETE /api/users/favorites/:itemId
exports.removeFromFavorites = async (req, res) => {
    try {
        const { itemId } = req.params;

        const user = await User.findById(req.user.userId);
        
        user.favorites = user.favorites.filter(fav => fav.toString() !== itemId);
        await user.save();

        res.json({
            success: true,
            message: 'Removed from favorites',
            data: { favorites: user.favorites }
        });
    } catch (error) {
        console.error('Remove Favorite Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// @desc    Get favorites
// @route   GET /api/users/favorites
exports.getFavorites = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).populate('favorites');
        
        res.json({
            success: true,
            data: { favorites: user.favorites }
        });
    } catch (error) {
        console.error('Get Favorites Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// @desc    Add to history
// @route   POST /api/users/history
exports.addToHistory = async (req, res) => {
    try {
        const { action, item } = req.body;

        const user = await User.findById(req.user.userId);
        
        user.history.unshift({
            action,
            item,
            timestamp: new Date()
        });

        // Keep only last 50 history items
        if (user.history.length > 50) {
            user.history = user.history.slice(0, 50);
        }

        await user.save();

        res.json({
            success: true,
            message: 'History updated'
        });
    } catch (error) {
        console.error('Add History Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// @desc    Get history
// @route   GET /api/users/history
exports.getHistory = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        res.json({
            success: true,
            data: { history: user.history }
        });
    } catch (error) {
        console.error('Get History Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};