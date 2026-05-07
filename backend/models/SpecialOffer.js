const mongoose = require('mongoose');

const specialOfferSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: [true, 'Restaurant ID is required'],
        index: true
    },
    title: {
        type: String,
        required: [true, 'Offer title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Offer description is required'],
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed', 'buy_one_get_one'],
        required: [true, 'Discount type is required']
    },
    discountValue: {
        type: Number,
        required: [true, 'Discount value is required'],
        min: [0, 'Discount value cannot be negative']
    },
    price: {
        type: Number,
        min: [0, 'Price cannot be negative']
    },
    originalPrice: {
        type: Number,
        min: [0, 'Original price cannot be negative']
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required']
    },
    applicableMenuItems: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem'
    }],
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    imageUrl: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Index for efficient queries
specialOfferSchema.index({ restaurantId: 1, isActive: 1, endDate: 1 });
specialOfferSchema.index({ startDate: 1, endDate: 1 });

// Validate end date is after start date
specialOfferSchema.pre('save', function(next) {
    if (this.endDate <= this.startDate) {
        const error = new Error('End date must be after start date');
        error.name = 'ValidationError';
        return next(error);
    }
    next();
});

module.exports = mongoose.model('SpecialOffer', specialOfferSchema);

