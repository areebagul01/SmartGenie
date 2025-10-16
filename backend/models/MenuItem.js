const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: [true, 'Restaurant ID is required']
    },
    itemName: {
        type: String,
        required: [true, 'Item name is required'],
        trim: true,
        minlength: [2, 'Item name must be at least 2 characters long'],
        maxlength: [100, 'Item name cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative'],
        validate: {
            validator: function(value) {
                // Allow up to 2 decimal places
                return /^\d+(\.\d{1,2})?$/.test(value.toString());
            },
            message: 'Price must have up to 2 decimal places'
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('MenuItem', menuItemSchema);