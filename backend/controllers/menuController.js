const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const SeatSlot = require('../models/SeatSlot');
const SpecialOffer = require('../models/SpecialOffer');

const ensureRestaurantOwnership = async (restaurantId, user) => {
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
        const error = new Error('Restaurant not found');
        error.statusCode = 404;
        throw error;
    }

    if (restaurant.ownerId.toString() !== user.id.toString()) {
        const error = new Error('Access denied. Only the restaurant owner can perform this action.');
        error.statusCode = 403;
        throw error;
    }

    return restaurant;
};

const sanitizeMenuPayload = (payload = {}) => {
    const sanitized = {};

    if (payload.name !== undefined) sanitized.name = payload.name.trim();
    if (payload.description !== undefined) sanitized.description = payload.description.trim();
    if (payload.price !== undefined) sanitized.price = Number(payload.price);
    if (payload.category !== undefined) sanitized.category = payload.category.trim();
    if (payload.subCategory !== undefined) sanitized.subCategory = payload.subCategory.trim();
    if (payload.isActive !== undefined) sanitized.isActive = !!payload.isActive;
    if (payload.imageUrl !== undefined) sanitized.imageUrl = payload.imageUrl.trim();

    return sanitized;
};

// Menu CRUD
// @desc    Get menu items (PUBLIC)
// @route   GET /api/restaurants/:restaurantId/menu
// @access  Public
exports.getMenuItems = async (req, res) => {
    try {
        const { restaurantId } = req.params;

        // Validate restaurant exists
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        // Only show menu items for approved restaurants
        if (restaurant.status !== 'APPROVED') {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        const items = await MenuItem.find({ restaurantId, isActive: true })
            .sort({ category: 1, subCategory: 1, name: 1 })
            .lean();

        res.json({
            success: true,
            data: { 
                items,
                menuItems: items  // Also include menuItems for frontend compatibility
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch menu items',
            error: error.message
        });
    }
};

exports.createMenuItem = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        await ensureRestaurantOwnership(restaurantId, req.user);

        const menuData = sanitizeMenuPayload(req.body);
        menuData.restaurantId = restaurantId;

        const menuItem = await MenuItem.create(menuData);

        res.status(201).json({
            success: true,
            message: 'Menu item created successfully',
            data: { item: menuItem }
        });
    } catch (error) {
        const status = error.name === 'ValidationError' ? 400 : (error.statusCode || 500);
        res.status(status).json({
            success: false,
            message: error.statusCode ? error.message : 'Failed to create menu item',
            errors: error.name === 'ValidationError' ? Object.values(error.errors).map(err => err.message) : undefined,
            error: !error.statusCode && error.name !== 'ValidationError' ? error.message : undefined
        });
    }
};

exports.updateMenuItem = async (req, res) => {
    try {
        const { restaurantId, menuItemId } = req.params;
        await ensureRestaurantOwnership(restaurantId, req.user);

        // Validate menuItemId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid menu item ID format. Please use the ID returned when the menu item was created.',
                error: `Received ID: "${menuItemId}" is not a valid MongoDB ObjectId`
            });
        }

        const updateData = sanitizeMenuPayload(req.body);
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields provided for update'
            });
        }

        const updatedItem = await MenuItem.findOneAndUpdate(
            { _id: menuItemId, restaurantId },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedItem) {
            return res.status(404).json({
                success: false,
                message: 'Menu item not found. Please ensure you are using the correct menu item ID from the database.'
            });
        }

        res.json({
            success: true,
            message: 'Menu item updated successfully',
            data: { item: updatedItem }
        });
    } catch (error) {
        // Handle CastError specifically for invalid ObjectId
        if (error.name === 'CastError' && error.path === '_id') {
            return res.status(400).json({
                success: false,
                message: 'Invalid menu item ID format. Please use the ID returned when the menu item was created.',
                error: `The ID "${menuItemId}" is not a valid MongoDB ObjectId`
            });
        }

        const status = error.name === 'ValidationError' ? 400 : (error.statusCode || 500);
        res.status(status).json({
            success: false,
            message: error.statusCode ? error.message : 'Failed to update menu item',
            errors: error.name === 'ValidationError' ? Object.values(error.errors).map(err => err.message) : undefined,
            error: !error.statusCode && error.name !== 'ValidationError' ? error.message : undefined
        });
    }
};

exports.toggleMenuItemStatus = async (req, res) => {
    try {
        const { restaurantId, menuItemId } = req.params;
        
        // Validate menuItemId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid menu item ID format'
            });
        }

        await ensureRestaurantOwnership(restaurantId, req.user);

        const menuItem = await MenuItem.findOne({ _id: menuItemId, restaurantId });
        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }

        menuItem.isActive = !menuItem.isActive;
        await menuItem.save();

        res.json({
            success: true,
            message: `Menu item ${menuItem.isActive ? 'activated' : 'deactivated'} successfully`,
            data: { item: menuItem }
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : 'Failed to toggle status',
            error: error.statusCode ? undefined : error.message
        });
    }
};

exports.deleteMenuItem = async (req, res) => {
    try {
        const { restaurantId, menuItemId } = req.params;
        
        // Validate menuItemId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid menu item ID format'
            });
        }

        await ensureRestaurantOwnership(restaurantId, req.user);

        const menuItem = await MenuItem.findOneAndDelete({ _id: menuItemId, restaurantId });
        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }

        res.json({
            success: true,
            message: 'Menu item deleted successfully'
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : 'Failed to delete menu item',
            error: error.statusCode ? undefined : error.message
        });
    }
};

// Seat Slot Management
const validateSeatPayload = (payload = {}) => {
    const seatData = {};

    if (payload.time !== undefined) seatData.time = payload.time.trim();
    if (payload.type !== undefined) seatData.type = payload.type;
    if (payload.seats !== undefined) seatData.seats = Number(payload.seats);
    if (payload.totalCapacity !== undefined) seatData.totalCapacity = Number(payload.totalCapacity);

    return seatData;
};

// @desc    Get seat slots (PUBLIC)
// @route   GET /api/restaurants/:restaurantId/seat-slots
// @access  Public
exports.getSeatSlots = async (req, res) => {
    try {
        const { restaurantId } = req.params;

        // Validate restaurant exists
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        // Only show seat slots for approved restaurants
        if (restaurant.status !== 'APPROVED') {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        const slots = await SeatSlot.find({ restaurantId })
            .sort({ type: 1, time: 1 })
            .lean();

        res.json({
            success: true,
            data: {
                totalSeats: restaurant.totalSeatCapacity,
                slots,
                seatSlots: slots  // Also include seatSlots for frontend compatibility
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch seat slots',
            error: error.message
        });
    }
};

exports.upsertSeatSlot = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const restaurant = await ensureRestaurantOwnership(restaurantId, req.user);

        const seatData = validateSeatPayload(req.body);
        if (!seatData.time || !seatData.type || seatData.seats === undefined || seatData.totalCapacity === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Time, type, seats, and totalCapacity are required'
            });
        }

        if (seatData.seats < 0) {
            return res.status(400).json({
                success: false,
                message: 'Available seats cannot be negative'
            });
        }

        if (seatData.totalCapacity < 1 || seatData.totalCapacity > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Total capacity must be between 1 and 1000'
            });
        }

        if (seatData.seats > seatData.totalCapacity) {
            return res.status(400).json({
                success: false,
                message: 'Available seats cannot exceed total capacity'
            });
        }

        restaurant.totalSeatCapacity = seatData.totalCapacity;
        await restaurant.save();

        const slot = await SeatSlot.findOneAndUpdate(
            { restaurantId, time: seatData.time },
            {
                $set: {
                    seats: seatData.seats,
                    type: seatData.type,
                    totalCapacity: seatData.totalCapacity
                }
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );

        res.json({
            success: true,
            message: 'Seat slot saved successfully',
            data: {
                slot,
                totalSeats: restaurant.totalSeatCapacity
            }
        });
    } catch (error) {
        const status = error.name === 'ValidationError' ? 400 : (error.statusCode || 500);
        res.status(status).json({
            success: false,
            message: error.statusCode ? error.message : 'Failed to save seat slot',
            errors: error.name === 'ValidationError' ? Object.values(error.errors).map(err => err.message) : undefined,
            error: !error.statusCode && error.name !== 'ValidationError' ? error.message : undefined
        });
    }
};

exports.updateSeatSlot = async (req, res) => {
    try {
        const { restaurantId, slotId } = req.params;
        const restaurant = await ensureRestaurantOwnership(restaurantId, req.user);

        const seatData = validateSeatPayload(req.body);
        if (seatData.seats !== undefined && seatData.seats < 0) {
            return res.status(400).json({
                success: false,
                message: 'Available seats cannot be negative'
            });
        }

        if (seatData.totalCapacity !== undefined) {
            if (seatData.totalCapacity < 1 || seatData.totalCapacity > 1000) {
                return res.status(400).json({
                    success: false,
                    message: 'Total capacity must be between 1 and 1000'
                });
            }
            if (seatData.seats !== undefined && seatData.seats > seatData.totalCapacity) {
                return res.status(400).json({
                    success: false,
                    message: 'Available seats cannot exceed total capacity'
                });
            }
            restaurant.totalSeatCapacity = seatData.totalCapacity;
            await restaurant.save();
        }

        const updatedSlot = await SeatSlot.findOneAndUpdate(
            { _id: slotId, restaurantId },
            { $set: seatData },
            { new: true, runValidators: true }
        );

        if (!updatedSlot) {
            return res.status(404).json({
                success: false,
                message: 'Seat slot not found'
            });
        }

        res.json({
            success: true,
            message: 'Seat slot updated successfully',
            data: {
                slot: updatedSlot,
                totalSeats: restaurant.totalSeatCapacity
            }
        });
    } catch (error) {
        const status = error.name === 'ValidationError' ? 400 : (error.statusCode || 500);
        res.status(status).json({
            success: false,
            message: error.statusCode ? error.message : 'Failed to update seat slot',
            errors: error.name === 'ValidationError' ? Object.values(error.errors).map(err => err.message) : undefined,
            error: !error.statusCode && error.name !== 'ValidationError' ? error.message : undefined
        });
    }
};

exports.deleteSeatSlot = async (req, res) => {
    try {
        const { restaurantId, slotId } = req.params;
        await ensureRestaurantOwnership(restaurantId, req.user);

        const deletedSlot = await SeatSlot.findOneAndDelete({ _id: slotId, restaurantId });
        if (!deletedSlot) {
            return res.status(404).json({
                success: false,
                message: 'Seat slot not found'
            });
        }

        res.json({
            success: true,
            message: 'Seat slot deleted successfully'
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : 'Failed to delete seat slot',
            error: error.statusCode ? undefined : error.message
        });
    }
};

exports.updateTotalCapacity = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { totalSeats } = req.body;

        if (totalSeats === undefined) {
            return res.status(400).json({
                success: false,
                message: 'totalSeats is required'
            });
        }

        if (totalSeats < 1 || totalSeats > 1000) {
            return res.status(400).json({
                success: false,
                message: 'totalSeats must be between 1 and 1000'
            });
        }

        const restaurant = await ensureRestaurantOwnership(restaurantId, req.user);
        restaurant.totalSeatCapacity = totalSeats;
        await restaurant.save();

        await SeatSlot.updateMany(
            { restaurantId },
            { $set: { totalCapacity: totalSeats } }
        );

        res.json({
            success: true,
            message: 'Total seat capacity updated successfully',
            data: { totalSeats }
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : 'Failed to update total capacity',
            error: error.statusCode ? undefined : error.message
        });
    }
};

// ============================================
// SPECIAL OFFERS MANAGEMENT
// ============================================

const sanitizeOfferPayload = (payload = {}) => {
    const sanitized = {};

    if (payload.title !== undefined) sanitized.title = payload.title.trim();
    if (payload.description !== undefined) sanitized.description = payload.description.trim();
    if (payload.discountType !== undefined) sanitized.discountType = payload.discountType;
    if (payload.discountValue !== undefined) sanitized.discountValue = Number(payload.discountValue);
    if (payload.startDate !== undefined) sanitized.startDate = new Date(payload.startDate);
    if (payload.endDate !== undefined) sanitized.endDate = new Date(payload.endDate);
    if (payload.applicableMenuItems !== undefined) {
        sanitized.applicableMenuItems = Array.isArray(payload.applicableMenuItems) 
            ? payload.applicableMenuItems 
            : [];
    }
    if (payload.isActive !== undefined) sanitized.isActive = !!payload.isActive;
    if (payload.imageUrl !== undefined) sanitized.imageUrl = payload.imageUrl.trim();

    return sanitized;
};

exports.getSpecialOffers = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        await ensureRestaurantOwnership(restaurantId, req.user);

        const offers = await SpecialOffer.find({ restaurantId })
            .populate('applicableMenuItems', 'name price')
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            data: { offers }
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : 'Failed to fetch special offers',
            error: error.statusCode ? undefined : error.message
        });
    }
};

exports.createSpecialOffer = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        await ensureRestaurantOwnership(restaurantId, req.user);

        const offerData = sanitizeOfferPayload(req.body);
        offerData.restaurantId = restaurantId;

        // Validation
        if (!offerData.title || !offerData.description || !offerData.discountType || 
            offerData.discountValue === undefined || !offerData.startDate || !offerData.endDate) {
            return res.status(400).json({
                success: false,
                message: 'Title, description, discountType, discountValue, startDate, and endDate are required'
            });
        }

        // Validate discount value based on type
        if (offerData.discountType === 'percentage' && (offerData.discountValue < 0 || offerData.discountValue > 100)) {
            return res.status(400).json({
                success: false,
                message: 'Percentage discount must be between 0 and 100'
            });
        }

        // Validate dates
        if (offerData.endDate <= offerData.startDate) {
            return res.status(400).json({
                success: false,
                message: 'End date must be after start date'
            });
        }

        const offer = await SpecialOffer.create(offerData);

        await offer.populate('applicableMenuItems', 'name price');

        res.status(201).json({
            success: true,
            message: 'Special offer created successfully',
            data: { offer }
        });
    } catch (error) {
        const status = error.name === 'ValidationError' ? 400 : (error.statusCode || 500);
        res.status(status).json({
            success: false,
            message: error.statusCode ? error.message : 'Failed to create special offer',
            errors: error.name === 'ValidationError' ? Object.values(error.errors).map(err => err.message) : undefined,
            error: !error.statusCode && error.name !== 'ValidationError' ? error.message : undefined
        });
    }
};

exports.updateSpecialOffer = async (req, res) => {
    try {
        const { restaurantId, offerId } = req.params;
        
        // Validate offerId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(offerId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid offer ID format'
            });
        }

        await ensureRestaurantOwnership(restaurantId, req.user);

        const updateData = sanitizeOfferPayload(req.body);
        
        // Validate discount value if provided
        if (updateData.discountType === 'percentage' && updateData.discountValue !== undefined) {
            if (updateData.discountValue < 0 || updateData.discountValue > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Percentage discount must be between 0 and 100'
                });
            }
        }

        // Validate dates if both provided
        if (updateData.startDate && updateData.endDate && updateData.endDate <= updateData.startDate) {
            return res.status(400).json({
                success: false,
                message: 'End date must be after start date'
            });
        }

        const updatedOffer = await SpecialOffer.findOneAndUpdate(
            { _id: offerId, restaurantId },
            { $set: updateData },
            { new: true, runValidators: true }
        )
        .populate('applicableMenuItems', 'name price');

        if (!updatedOffer) {
            return res.status(404).json({
                success: false,
                message: 'Special offer not found'
            });
        }

        res.json({
            success: true,
            message: 'Special offer updated successfully',
            data: { offer: updatedOffer }
        });
    } catch (error) {
        const status = error.name === 'ValidationError' ? 400 : (error.statusCode || 500);
        res.status(status).json({
            success: false,
            message: error.statusCode ? error.message : 'Failed to update special offer',
            errors: error.name === 'ValidationError' ? Object.values(error.errors).map(err => err.message) : undefined,
            error: !error.statusCode && error.name !== 'ValidationError' ? error.message : undefined
        });
    }
};

exports.deleteSpecialOffer = async (req, res) => {
    try {
        const { restaurantId, offerId } = req.params;
        
        // Validate offerId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(offerId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid offer ID format'
            });
        }

        await ensureRestaurantOwnership(restaurantId, req.user);

        const deletedOffer = await SpecialOffer.findOneAndDelete({ _id: offerId, restaurantId });
        if (!deletedOffer) {
            return res.status(404).json({
                success: false,
                message: 'Special offer not found'
            });
        }

        res.json({
            success: true,
            message: 'Special offer deleted successfully'
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : 'Failed to delete special offer',
            error: error.statusCode ? undefined : error.message
        });
    }
};

exports.toggleSpecialOfferStatus = async (req, res) => {
    try {
        const { restaurantId, offerId } = req.params;
        
        // Validate offerId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(offerId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid offer ID format'
            });
        }

        await ensureRestaurantOwnership(restaurantId, req.user);

        const offer = await SpecialOffer.findOne({ _id: offerId, restaurantId });
        if (!offer) {
            return res.status(404).json({
                success: false,
                message: 'Special offer not found'
            });
        }

        offer.isActive = !offer.isActive;
        await offer.save();

        await offer.populate('applicableMenuItems', 'name price');

        res.json({
            success: true,
            message: `Special offer ${offer.isActive ? 'activated' : 'deactivated'} successfully`,
            data: { offer }
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : 'Failed to toggle offer status',
            error: error.statusCode ? undefined : error.message
        });
    }
};

