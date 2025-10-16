const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [3, 'Name must be at least 3 characters long']
    },
    address: {
        type: String,
        required: [true, 'Address is required'],
        trim: true
    },
    contact: {
        type: String,
        required: [true, 'Contact information is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    operatingHours: {
        type: String,
        required: [true, 'Operating hours are required'],
        trim: true
    },
    rating: {
        type: Number,
        min: [0, 'Rating cannot be less than 0'],
        max: [5, 'Rating cannot exceed 5'],
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'closed', 'temporarily_closed'],
        default: 'active'
    },
    location: {
        latitude: {
            type: Number,
            required: [true, 'Latitude is required']
        },
        longitude: {
            type: Number,
            required: [true, 'Longitude is required']
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Restaurant', restaurantSchema);