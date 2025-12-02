const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
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
    date: {
        type: Date,
        required: [true, 'Reservation date is required']
    },
    time: {
        type: String,
        required: [true, 'Reservation time is required'],
        trim: true
    },
    guests: {
        type: Number,
        required: [true, 'Number of guests is required'],
        min: [1, 'At least 1 guest is required'],
        max: [20, 'Maximum 20 guests allowed']
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending',
        index: true
    },
    specialRequests: {
        type: String,
        trim: true,
        maxlength: [500, 'Special requests cannot exceed 500 characters']
    }
}, {
    timestamps: true
});

// Index for efficient queries
reservationSchema.index({ restaurantId: 1, date: 1, time: 1 });
reservationSchema.index({ userId: 1, createdAt: -1 });
reservationSchema.index({ status: 1, date: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);

