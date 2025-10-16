const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Customer ID is required']
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: [true, 'Restaurant ID is required']
    },
    reservationTime: {
        type: Date,
        required: [true, 'Reservation time is required'],
        validate: {
            validator: function(value) {
                return value > new Date(); // Reservation must be in the future
            },
            message: 'Reservation time must be in the future'
        }
    },
    numberOfGuests: {
        type: Number,
        required: [true, 'Number of guests is required'],
        min: [1, 'Must have at least 1 guest'],
        max: [50, 'Cannot exceed 50 guests'] // Adjust max as needed
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
        default: 'pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Reservation', reservationSchema);