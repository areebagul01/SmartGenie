const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Owner ID is required'],
        index: true
    },
    ownerName: {
        type: String,
        required: [true, 'Owner name is required'],
        trim: true
    },
    ownerEmail: {
        type: String,
        required: [true, 'Owner email is required'],
        lowercase: true,
        trim: true
    },
    ownerPhone: {
        type: String,
        required: [true, 'Owner phone is required'],
        trim: true
    },
    restaurantName: {
        type: String,
        required: [true, 'Restaurant name is required'],
        trim: true
    },
    restaurantAddress: {
        street: {
            type: String,
            required: [true, 'Street address is required'],
            trim: true
        },
        city: {
            type: String,
            required: [true, 'City is required'],
            trim: true
        },
        state: {
            type: String,
            required: [true, 'State is required'],
            trim: true
        },
        zipCode: {
            type: String,
            required: [true, 'Zip code is required'],
            trim: true
        },
        country: {
            type: String,
            required: [true, 'Country is required'],
            trim: true,
            default: 'USA'
        }
    },
    cuisineType: {
        type: String,
        required: [true, 'Cuisine type is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    openingHours: {
        type: String,
        trim: true
    },
    seatingCapacity: {
        type: Number,
        min: [1, 'Seating capacity must be at least 1'],
        max: [1000, 'Seating capacity cannot exceed 1000']
    },
    menu: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING',
        index: true
    },
    rejectionReason: {
        type: String,
        trim: true,
        maxlength: [500, 'Rejection reason cannot exceed 500 characters']
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    approvedAt: {
        type: Date
    },
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    rejectedAt: {
        type: Date
    },
    totalSeatCapacity: {
        type: Number,
        min: [1, 'Total seat capacity must be at least 1'],
        max: [1000, 'Total seat capacity cannot exceed 1000'],
        default: 50
    },
    // Restaurant Card Profile
    cardProfile: {
        coverImage: {
            type: String,
            trim: true
        },
        logo: {
            type: String,
            trim: true
        },
        featuredImages: [{
            type: String,
            trim: true
        }],
        highlights: [{
            type: String,
            trim: true,
            maxlength: [100, 'Highlight cannot exceed 100 characters']
        }],
        tags: [{
            type: String,
            trim: true,
            maxlength: [50, 'Tag cannot exceed 50 characters']
        }],
        socialLinks: {
            website: {
                type: String,
                trim: true
            },
            facebook: {
                type: String,
                trim: true
            },
            instagram: {
                type: String,
                trim: true
            },
            twitter: {
                type: String,
                trim: true
            }
        }
    }
}, {
    timestamps: true
});

// Index for efficient queries
restaurantSchema.index({ ownerId: 1, status: 1 });
restaurantSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Restaurant', restaurantSchema);

