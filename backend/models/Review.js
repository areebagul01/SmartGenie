const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: [true, 'Restaurant ID is required'],
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5']
    },
    title: {
        type: String,
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    review: {
        type: String,
        required: [true, 'Review comment is required'],
        trim: true,
        minlength: [10, 'Review must be at least 10 characters'],
        maxlength: [1000, 'Review cannot exceed 1000 characters']
    },
    helpfulCount: {
        type: Number,
        default: 0,
        min: [0, 'Helpful count cannot be negative']
    }
}, {
    timestamps: true
});

// Prevent duplicate reviews from same user for same restaurant
reviewSchema.index({ restaurantId: 1, userId: 1 }, { unique: true });

// Index for efficient queries
reviewSchema.index({ restaurantId: 1, createdAt: -1 });
reviewSchema.index({ rating: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);

