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

