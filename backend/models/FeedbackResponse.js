const mongoose = require('mongoose');

const feedbackResponseSchema = new mongoose.Schema({
    review: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review',
        required: [true, 'Review ID is required']
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Admin ID is required'],
        validate: {
            validator: async function(adminId) {
                // Verify that the user has admin role
                const User = mongoose.model('User');
                const user = await User.findById(adminId);
                return user && user.role === 'admin';
            },
            message: 'Only admin users can create feedback responses'
        }
    },
    responseText: {
        type: String,
        required: [true, 'Response text is required'],
        trim: true,
        minlength: [5, 'Response must be at least 5 characters long'],
        maxlength: [1000, 'Response cannot exceed 1000 characters']
    },
    responseDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('FeedbackResponse', feedbackResponseSchema);