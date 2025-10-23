const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

// @desc    Register restaurant owner and create restaurant
// @route   POST /api/restaurants/register
exports.registerRestaurantOwner = async (req, res) => {
    try {
        const { 
            // Personal Data
            name, 
            email, 
            password,
            // Restaurant Data
            restaurantName, 
            address, 
            city, 
            country 
        } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Personal details (name, email, password) are required' 
            });
        }

        if (!restaurantName || !address || !city || !country) {
            return res.status(400).json({ 
                success: false, 
                message: 'Restaurant details (name, address, city, country) are required' 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User already exists with this email' 
            });
        }

        // Check if restaurant name already exists
        const existingRestaurant = await Restaurant.findOne({ name: restaurantName });
        if (existingRestaurant) {
            return res.status(400).json({ 
                success: false, 
                message: 'Restaurant with this name already exists' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create restaurant first
        const restaurant = await Restaurant.create({
            name: restaurantName,
            address,
            city,
            country,
            contact: email, // Using owner's email as initial contact
            operatingHours: 'To be updated', // Default value
            description: 'Restaurant description to be added',
            owner: null // Will update after user creation
        });

        // Create restaurant owner user
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'restaurant_owner',
            restaurant: restaurant._id
        });

        // Update restaurant with owner reference
        restaurant.owner = user._id;
        await restaurant.save();

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user._id, 
                email: user.email, 
                role: user.role,
                restaurantId: restaurant._id 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            message: 'Restaurant owner registered successfully',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                restaurant: {
                    id: restaurant._id,
                    name: restaurant.name,
                    address: restaurant.address,
                    city: restaurant.city,
                    country: restaurant.country
                },
                token
            }
        });

    } catch (error) {
        console.error('Restaurant Owner Registration Error:', error);
        
        // Clean up: if user was created but restaurant failed, delete user
        if (req.body.email) {
            await User.findOneAndDelete({ email: req.body.email });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// @desc    Get restaurant by owner
// @route   GET /api/restaurants/my-restaurant
exports.getMyRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user.userId })
            .populate('owner', 'name email');
        
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        res.json({
            success: true,
            data: { restaurant }
        });
    } catch (error) {
        console.error('Get Restaurant Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// @desc    Update restaurant
// @route   PUT /api/restaurants/my-restaurant
exports.updateRestaurant = async (req, res) => {
    try {
        const { name, address, city, country, contact, description, operatingHours, status } = req.body;

        const restaurant = await Restaurant.findOne({ owner: req.user.userId });
        
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        // Update restaurant fields
        if (name) restaurant.name = name;
        if (address) restaurant.address = address;
        if (city) restaurant.city = city;
        if (country) restaurant.country = country;
        if (contact) restaurant.contact = contact;
        if (description) restaurant.description = description;
        if (operatingHours) restaurant.operatingHours = operatingHours;
        if (status) restaurant.status = status;

        await restaurant.save();

        res.json({
            success: true,
            message: 'Restaurant updated successfully',
            data: { restaurant }
        });
    } catch (error) {
        console.error('Update Restaurant Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// @desc    Get all restaurants (public)
// @route   GET /api/restaurants
exports.getAllRestaurants = async (req, res) => {
    try {
        const { page = 1, limit = 10, city, country } = req.query;
        
        const query = { status: 'active' };
        if (city) query.city = new RegExp(city, 'i');
        if (country) query.country = new RegExp(country, 'i');

        const restaurants = await Restaurant.find(query)
            .populate('owner', 'name email')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await Restaurant.countDocuments(query);

        res.json({
            success: true,
            data: {
                restaurants,
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                total
            }
        });
    } catch (error) {
        console.error('Get Restaurants Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// @desc    Get restaurant by ID (public)
// @route   GET /api/restaurants/:id
exports.getRestaurantById = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id)
            .populate('owner', 'name email');
        
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        res.json({
            success: true,
            data: { restaurant }
        });
    } catch (error) {
        console.error('Get Restaurant By ID Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};