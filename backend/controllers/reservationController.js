const Reservation = require('../models/Reservation');
const Restaurant = require('../models/Restaurant');
const SeatSlot = require('../models/SeatSlot');

// @desc    Create a new reservation
// @route   POST /api/reservations
// @access  Private (User)
exports.createReservation = async (req, res) => {
    try {
        const { restaurantId, date, time, guests, specialRequests } = req.body;
        const userId = req.user.id;

        // Validation
        if (!restaurantId || !date || !time || !guests) {
            return res.status(400).json({
                success: false,
                message: 'Restaurant ID, date, time, and number of guests are required'
            });
        }

        // Validate restaurant exists and is approved
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        if (restaurant.status !== 'APPROVED') {
            return res.status(400).json({
                success: false,
                message: 'Reservations can only be made at approved restaurants'
            });
        }

        // Validate date is in the future
        const reservationDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (reservationDate < today) {
            return res.status(400).json({
                success: false,
                message: 'Reservation date must be in the future'
            });
        }

        // Validate guests count
        if (guests < 1 || guests > 20) {
            return res.status(400).json({
                success: false,
                message: 'Number of guests must be between 1 and 20'
            });
        }

        // Check seat availability (optional - can be enhanced)
        // For now, we'll just create the reservation

        // Create reservation
        const reservation = await Reservation.create({
            restaurantId,
            userId,
            date: reservationDate,
            time: time.trim(),
            guests,
            specialRequests: specialRequests ? specialRequests.trim() : undefined,
            status: 'pending'
        });

        // Populate restaurant details
        await reservation.populate('restaurantId', 'restaurantName restaurantAddress');

        res.status(201).json({
            success: true,
            message: 'Reservation created successfully',
            data: {
                booking: {
                    _id: reservation._id,
                    restaurantId: reservation.restaurantId._id || reservation.restaurantId,
                    restaurantName: reservation.restaurantId.restaurantName || restaurant.restaurantName,
                    userId: reservation.userId,
                    date: reservation.date,
                    time: reservation.time,
                    guests: reservation.guests,
                    status: reservation.status,
                    specialRequests: reservation.specialRequests,
                    createdAt: reservation.createdAt,
                    updatedAt: reservation.updatedAt
                }
            }
        });

    } catch (error) {
        console.error('Create Reservation Error:', error);
        
        // Handle duplicate reservation error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'You already have a reservation for this restaurant at this date and time'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create reservation',
            error: error.message
        });
    }
};

// @desc    Get user's reservations
// @route   GET /api/reservations/user
// @access  Private (User)
exports.getUserReservations = async (req, res) => {
    try {
        const userId = req.user.id;

        const reservations = await Reservation.find({ userId })
            .populate('restaurantId', 'restaurantName restaurantAddress cuisineType')
            .sort({ date: -1, createdAt: -1 })
            .lean();

        const bookings = reservations.map(reservation => ({
            _id: reservation._id,
            restaurantId: reservation.restaurantId._id || reservation.restaurantId,
            restaurantName: reservation.restaurantId.restaurantName || 'Unknown Restaurant',
            userId: reservation.userId,
            date: reservation.date,
            time: reservation.time,
            guests: reservation.guests,
            status: reservation.status,
            specialRequests: reservation.specialRequests,
            createdAt: reservation.createdAt,
            updatedAt: reservation.updatedAt
        }));

        res.json({
            success: true,
            data: { bookings }
        });

    } catch (error) {
        console.error('Get User Reservations Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reservations',
            error: error.message
        });
    }
};

// @desc    Get a specific reservation by ID
// @route   GET /api/reservations/:id
// @access  Private (User - own reservation or Admin)
exports.getReservationById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        const reservation = await Reservation.findById(id)
            .populate('restaurantId', 'restaurantName restaurantAddress cuisineType')
            .populate('userId', 'name email')
            .lean();

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            });
        }

        // Check if user has access (own reservation or admin)
        if (userRole !== 'admin' && reservation.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only view your own reservations.'
            });
        }

        res.json({
            success: true,
            data: {
                booking: {
                    _id: reservation._id,
                    restaurantId: reservation.restaurantId._id || reservation.restaurantId,
                    restaurantName: reservation.restaurantId.restaurantName || 'Unknown Restaurant',
                    userId: reservation.userId._id || reservation.userId,
                    userName: reservation.userId.name || 'Unknown User',
                    date: reservation.date,
                    time: reservation.time,
                    guests: reservation.guests,
                    status: reservation.status,
                    specialRequests: reservation.specialRequests,
                    createdAt: reservation.createdAt,
                    updatedAt: reservation.updatedAt
                }
            }
        });

    } catch (error) {
        console.error('Get Reservation By ID Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reservation',
            error: error.message
        });
    }
};

// @desc    Cancel a reservation
// @route   PUT /api/reservations/:id/cancel
// @access  Private (User - own reservation)
exports.cancelReservation = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const reservation = await Reservation.findById(id);

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            });
        }

        // Check if user owns this reservation
        if (reservation.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only cancel your own reservations.'
            });
        }

        // Check if reservation can be cancelled
        if (reservation.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Reservation is already cancelled'
            });
        }

        if (reservation.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel a completed reservation'
            });
        }

        // Update status to cancelled
        reservation.status = 'cancelled';
        await reservation.save();

        res.json({
            success: true,
            message: 'Reservation cancelled successfully',
            data: {
                booking: {
                    _id: reservation._id,
                    restaurantId: reservation.restaurantId,
                    userId: reservation.userId,
                    date: reservation.date,
                    time: reservation.time,
                    guests: reservation.guests,
                    status: reservation.status,
                    specialRequests: reservation.specialRequests,
                    createdAt: reservation.createdAt,
                    updatedAt: reservation.updatedAt
                }
            }
        });

    } catch (error) {
        console.error('Cancel Reservation Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel reservation',
            error: error.message
        });
    }
};

// @desc    Get available time slots for a restaurant on a specific date
// @route   GET /api/reservations/availability/:restaurantId
// @access  Public
exports.getAvailableTimeSlots = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Date parameter is required'
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

        // Get seat slots for the restaurant
        const seatSlots = await SeatSlot.find({ restaurantId }).lean();

        // Get existing reservations for the date
        const reservationDate = new Date(date);
        const startOfDay = new Date(reservationDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(reservationDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        const existingReservations = await Reservation.find({
            restaurantId,
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            status: { $in: ['pending', 'confirmed'] }
        }).lean();

        // Calculate available seats for each time slot
        const timeSlots = seatSlots.map(slot => {
            const reservationsForSlot = existingReservations.filter(
                res => res.time === slot.time
            );
            const bookedSeats = reservationsForSlot.reduce(
                (sum, res) => sum + res.guests, 0
            );
            const availableSeats = Math.max(0, slot.seats - bookedSeats);

            let status = 'available';
            if (availableSeats === 0) {
                status = 'unavailable';
            } else if (availableSeats < 5) {
                status = 'limited';
            }

            return {
                time: slot.time,
                available: availableSeats > 0,
                seats: availableSeats,
                status
            };
        });

        res.json({
            success: true,
            data: { timeSlots }
        });

    } catch (error) {
        console.error('Get Available Time Slots Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch available time slots',
            error: error.message
        });
    }
};

// @desc    Get all restaurant bookings (for admin or restaurant owners)
// @route   GET /api/reservations/restaurant
// @access  Private (Admin or Restaurant Owner)
exports.getAllRestaurantBookings = async (req, res) => {
    try {
        const userRole = req.user.role;
        const userId = req.user.id;

        let query = {};

        // If user is restaurant owner, only show bookings for their restaurants
        if (userRole !== 'admin') {
            // Find all restaurants owned by this user
            const restaurants = await Restaurant.find({ ownerId: userId }).select('_id').lean();
            const restaurantIds = restaurants.map(r => r._id);

            if (restaurantIds.length === 0) {
                return res.json({
                    success: true,
                    data: { bookings: [] }
                });
            }

            query.restaurantId = { $in: restaurantIds };
        }

        const { 
            page = 1, 
            limit = 20, 
            status,
            date,
            sort = 'newest' 
        } = req.query;

        // Filter by status
        if (status) {
            query.status = status;
        }

        // Filter by date
        if (date) {
            const filterDate = new Date(date);
            const startOfDay = new Date(filterDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(filterDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            query.date = {
                $gte: startOfDay,
                $lte: endOfDay
            };
        }

        // Build sort object
        let sortObject = { createdAt: -1 }; // Default: newest first
        if (sort === 'oldest') {
            sortObject = { createdAt: 1 };
        } else if (sort === 'date') {
            sortObject = { date: 1, time: 1 };
        } else if (sort === 'dateDesc') {
            sortObject = { date: -1, time: -1 };
        }

        // Calculate pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Get reservations with pagination
        const reservations = await Reservation.find(query)
            .populate('restaurantId', 'restaurantName restaurantAddress cuisineType')
            .populate('userId', 'name email profile.phone')
            .sort(sortObject)
            .skip(skip)
            .limit(limitNum)
            .lean();

        // Get total count for pagination
        const totalBookings = await Reservation.countDocuments(query);

        // Format response
        const bookings = reservations.map(reservation => ({
            _id: reservation._id,
            restaurantId: reservation.restaurantId._id || reservation.restaurantId,
            restaurantName: reservation.restaurantId.restaurantName || 'Unknown Restaurant',
            userId: reservation.userId._id || reservation.userId,
            userName: reservation.userId.name || 'Unknown User',
            userEmail: reservation.userId.email || '',
            userPhone: reservation.userId.profile?.phone || '',
            date: reservation.date,
            time: reservation.time,
            guests: reservation.guests,
            status: reservation.status,
            specialRequests: reservation.specialRequests,
            createdAt: reservation.createdAt,
            updatedAt: reservation.updatedAt
        }));

        res.json({
            success: true,
            data: {
                bookings,
                pagination: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(totalBookings / limitNum),
                    totalBookings,
                    limit: limitNum
                }
            }
        });

    } catch (error) {
        console.error('Get All Restaurant Bookings Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch restaurant bookings',
            error: error.message
        });
    }
};

// @desc    Get bookings for a specific restaurant
// @route   GET /api/reservations/restaurant/:restaurantId
// @access  Private (Restaurant Owner or Admin)
exports.getRestaurantBookings = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const userRole = req.user.role;
        const userId = req.user.id;

        // Validate restaurant exists
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        // Check if user has access (admin or restaurant owner)
        if (userRole !== 'admin' && restaurant.ownerId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only view bookings for your own restaurants.'
            });
        }

        const { 
            page = 1, 
            limit = 20, 
            status,
            date,
            sort = 'newest' 
        } = req.query;

        // Build query
        const query = { restaurantId };

        // Filter by status
        if (status) {
            query.status = status;
        }

        // Filter by date
        if (date) {
            const filterDate = new Date(date);
            const startOfDay = new Date(filterDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(filterDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            query.date = {
                $gte: startOfDay,
                $lte: endOfDay
            };
        }

        // Build sort object
        let sortObject = { createdAt: -1 }; // Default: newest first
        if (sort === 'oldest') {
            sortObject = { createdAt: 1 };
        } else if (sort === 'date') {
            sortObject = { date: 1, time: 1 };
        } else if (sort === 'dateDesc') {
            sortObject = { date: -1, time: -1 };
        }

        // Calculate pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Get reservations with pagination
        const reservations = await Reservation.find(query)
            .populate('userId', 'name email profile.phone')
            .sort(sortObject)
            .skip(skip)
            .limit(limitNum)
            .lean();

        // Get total count for pagination
        const totalBookings = await Reservation.countDocuments(query);

        // Format response
        const bookings = reservations.map(reservation => ({
            _id: reservation._id,
            restaurantId: reservation.restaurantId,
            restaurantName: restaurant.restaurantName,
            userId: reservation.userId._id || reservation.userId,
            userName: reservation.userId.name || 'Unknown User',
            userEmail: reservation.userId.email || '',
            userPhone: reservation.userId.profile?.phone || '',
            date: reservation.date,
            time: reservation.time,
            guests: reservation.guests,
            status: reservation.status,
            specialRequests: reservation.specialRequests,
            createdAt: reservation.createdAt,
            updatedAt: reservation.updatedAt
        }));

        res.json({
            success: true,
            data: {
                bookings,
                restaurant: {
                    _id: restaurant._id,
                    restaurantName: restaurant.restaurantName
                },
                pagination: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(totalBookings / limitNum),
                    totalBookings,
                    limit: limitNum
                }
            }
        });

    } catch (error) {
        console.error('Get Restaurant Bookings Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch restaurant bookings',
            error: error.message
        });
    }
};

// @desc    Update reservation status
// @route   PUT /api/reservations/:bookingId/status
// @access  Private (Restaurant Owner or Admin)
exports.updateReservationStatus = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { status } = req.body;
        const userRole = req.user.role;
        const userId = req.user.id;

        // Validate status
        const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'declined'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Status must be one of: ${validStatuses.join(', ')}`
            });
        }

        // Find reservation
        const reservation = await Reservation.findById(bookingId)
            .populate('restaurantId', 'ownerId restaurantName');

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            });
        }

        // Check if user has access (admin or restaurant owner)
        if (userRole !== 'admin' && reservation.restaurantId.ownerId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only update bookings for your own restaurants.'
            });
        }

        // Validate status transitions
        if (reservation.status === 'completed' && status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot change status of a completed reservation'
            });
        }

        if (reservation.status === 'cancelled' && status !== 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Cannot change status of a cancelled reservation'
            });
        }

        // Update status
        reservation.status = status;
        await reservation.save();

        // Populate for response
        await reservation.populate('userId', 'name email');
        await reservation.populate('restaurantId', 'restaurantName restaurantAddress');

        res.json({
            success: true,
            message: `Reservation status updated to ${status} successfully`,
            data: {
                booking: {
                    _id: reservation._id,
                    restaurantId: reservation.restaurantId._id || reservation.restaurantId,
                    restaurantName: reservation.restaurantId.restaurantName || 'Unknown Restaurant',
                    userId: reservation.userId._id || reservation.userId,
                    userName: reservation.userId.name || 'Unknown User',
                    date: reservation.date,
                    time: reservation.time,
                    guests: reservation.guests,
                    status: reservation.status,
                    specialRequests: reservation.specialRequests,
                    createdAt: reservation.createdAt,
                    updatedAt: reservation.updatedAt
                }
            }
        });

    } catch (error) {
        console.error('Update Reservation Status Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update reservation status',
            error: error.message
        });
    }
};
