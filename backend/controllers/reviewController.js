const Review = require('../models/Review');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');

// @desc    Create a new review
// @route   POST /api/reviews
// @access  Private (User)
exports.createReview = async (req, res) => {
    try {
        const { restaurantId, rating, title, review } = req.body;
        const userId = req.user.id;

        // Validation
        if (!restaurantId || !rating || !review) {
            return res.status(400).json({
                success: false,
                message: 'Restaurant ID, rating, and review comment are required'
            });
        }

        // Validate rating
        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        // Validate review length
        if (review.trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Review must be at least 10 characters long'
            });
        }

        // Validate restaurant exists
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        // Check if user already reviewed this restaurant
        const existingReview = await Review.findOne({ restaurantId, userId });
        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: 'You have already reviewed this restaurant. You can update your existing review.'
            });
        }

        // Create review
        const newReview = await Review.create({
            restaurantId,
            userId,
            rating: parseInt(rating),
            title: title ? title.trim() : undefined,
            review: review.trim(),
            helpfulCount: 0
        });

        // Populate user details
        await newReview.populate('userId', 'name email');
        await newReview.populate('restaurantId', 'restaurantName');

        res.status(201).json({
            success: true,
            message: 'Review created successfully',
            data: {
                review: {
                    _id: newReview._id,
                    userId: newReview.userId._id || newReview.userId,
                    userName: newReview.userId.name || 'Unknown User',
                    restaurantId: newReview.restaurantId._id || newReview.restaurantId,
                    rating: newReview.rating,
                    title: newReview.title,
                    review: newReview.review,
                    helpfulCount: newReview.helpfulCount,
                    date: newReview.createdAt
                }
            }
        });

    } catch (error) {
        console.error('Create Review Error:', error);
        
        // Handle duplicate review error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'You have already reviewed this restaurant'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create review',
            error: error.message
        });
    }
};

// @desc    Get reviews for a restaurant
// @route   GET /api/reviews/restaurant/:restaurantId
// @access  Public
exports.getRestaurantReviews = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { page = 1, limit = 10, sort = 'newest' } = req.query;

        // Validate restaurant exists
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        // Build sort object
        let sortObject = { createdAt: -1 }; // Default: newest first
        if (sort === 'oldest') {
            sortObject = { createdAt: 1 };
        } else if (sort === 'highest') {
            sortObject = { rating: -1, createdAt: -1 };
        } else if (sort === 'lowest') {
            sortObject = { rating: 1, createdAt: -1 };
        }

        // Calculate pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Get reviews with pagination
        const reviews = await Review.find({ restaurantId })
            .populate('userId', 'name email')
            .sort(sortObject)
            .skip(skip)
            .limit(limitNum)
            .lean();

        // Get total count for pagination
        const totalReviews = await Review.countDocuments({ restaurantId });

        // Calculate average rating
        const ratingStats = await Review.aggregate([
            { $match: { restaurantId: restaurant._id } },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating' },
                    totalReviews: { $sum: 1 },
                    ratingDistribution: {
                        $push: '$rating'
                    }
                }
            }
        ]);

        let averageRating = 0;
        let ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

        if (ratingStats.length > 0) {
            averageRating = Math.round(ratingStats[0].averageRating * 10) / 10;
            ratingStats[0].ratingDistribution.forEach(rating => {
                ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
            });
        }

        // Format reviews
        const formattedReviews = reviews.map(review => ({
            _id: review._id,
            userId: review.userId._id || review.userId,
            userName: review.userId.name || 'Unknown User',
            restaurantId: review.restaurantId._id || review.restaurantId,
            rating: review.rating,
            title: review.title,
            review: review.review,
            helpfulCount: review.helpfulCount,
            date: review.createdAt
        }));

        res.json({
            success: true,
            data: {
                reviews: formattedReviews,
                pagination: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(totalReviews / limitNum),
                    totalReviews,
                    limit: limitNum
                },
                stats: {
                    averageRating,
                    totalReviews,
                    ratingDistribution
                }
            }
        });

    } catch (error) {
        console.error('Get Restaurant Reviews Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews',
            error: error.message
        });
    }
};

// @desc    Get user's reviews
// @route   GET /api/reviews/user
// @access  Private (User)
exports.getUserReviews = async (req, res) => {
    try {
        const userId = req.user.id;

        const reviews = await Review.find({ userId })
            .populate('restaurantId', 'restaurantName restaurantAddress cuisineType')
            .sort({ createdAt: -1 })
            .lean();

        const formattedReviews = reviews.map(review => ({
            _id: review._id,
            userId: review.userId,
            userName: req.user.name,
            restaurantId: review.restaurantId._id || review.restaurantId,
            restaurantName: review.restaurantId.restaurantName || 'Unknown Restaurant',
            rating: review.rating,
            title: review.title,
            review: review.review,
            helpfulCount: review.helpfulCount,
            date: review.createdAt
        }));

        res.json({
            success: true,
            data: { reviews: formattedReviews }
        });

    } catch (error) {
        console.error('Get User Reviews Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews',
            error: error.message
        });
    }
};

// @desc    Update a review (mark as helpful)
// @route   PUT /api/reviews/:id/helpful
// @access  Private (User)
exports.markReviewHelpful = async (req, res) => {
    try {
        const { id } = req.params;

        const review = await Review.findById(id);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Increment helpful count
        review.helpfulCount += 1;
        await review.save();

        res.json({
            success: true,
            message: 'Review marked as helpful',
            data: {
                review: {
                    _id: review._id,
                    helpfulCount: review.helpfulCount
                }
            }
        });

    } catch (error) {
        console.error('Mark Review Helpful Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update review',
            error: error.message
        });
    }
};

