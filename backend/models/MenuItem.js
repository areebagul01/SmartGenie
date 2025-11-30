const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Menu item name is required'],
        trim: true,
        minlength: [3, 'Menu item name must be at least 3 characters']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        minlength: [10, 'Description must be at least 10 characters'],
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true
    },
    subCategory: {
        type: String,
        required: [true, 'Sub category is required'],
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    imageUrl: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

menuItemSchema.index({ restaurantId: 1, category: 1, subCategory: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);


