const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const SeatSlot = require('../models/SeatSlot');

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
exports.getMenuItems = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        await ensureRestaurantOwnership(restaurantId, req.user);

        const items = await MenuItem.find({ restaurantId })
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
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : 'Failed to fetch menu items',
            error: error.statusCode ? undefined : error.message
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

exports.getSeatSlots = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const restaurant = await ensureRestaurantOwnership(restaurantId, req.user);

        const slots = await SeatSlot.find({ restaurantId })
            .sort({ type: 1, time: 1 })
            .lean();

        res.json({
            success: true,
            data: {
                totalSeats: restaurant.totalSeatCapacity,
                slots
            }
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : 'Failed to fetch seat slots',
            error: error.statusCode ? undefined : error.message
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


