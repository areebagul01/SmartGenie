const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: [true, 'Restaurant ID is required']
    },
    date: {
        type: Date,
        required: [true, 'Date is required'],
        validate: {
            validator: function(value) {
                return value >= new Date().setHours(0, 0, 0, 0); // Date must be today or in the future
            },
            message: 'Date cannot be in the past'
        }
    },
    timeSlot: {
        type: String,
        required: [true, 'Time slot is required'],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time slot must be in HH:MM format (24-hour)']
    },
    availableTables: {
        type: Number,
        required: [true, 'Available tables count is required'],
        min: [0, 'Available tables cannot be negative'],
        max: [100, 'Available tables cannot exceed 100'] // Adjust max as needed
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Availability', availabilitySchema);