const mongoose = require('mongoose');

const seatSlotSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        index: true
    },
    time: {
        type: String,
        required: [true, 'Time slot is required'],
        trim: true
    },
    seats: {
        type: Number,
        required: [true, 'Available seats are required'],
        min: [0, 'Available seats cannot be negative']
    },
    type: {
        type: String,
        enum: ['lunch', 'dinner'],
        required: [true, 'Slot type is required']
    },
    totalCapacity: {
        type: Number,
        required: [true, 'Total capacity is required'],
        min: [1, 'Total capacity must be at least 1']
    }
}, {
    timestamps: true
});

seatSlotSchema.index({ restaurantId: 1, time: 1 }, { unique: true });

module.exports = mongoose.model('SeatSlot', seatSlotSchema);


