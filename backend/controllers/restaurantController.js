const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Register restaurant (restaurant owner submits registration)
// @route   POST /api/restaurants/register
// @access  Public (creates user account if needed)
exports.registerRestaurant = async (req, res) => {
    try {
        console.log('📝 Register Restaurant - Request received');
        console.log('Method:', req.method);
        console.log('Path:', req.path);
        console.log('Content-Type:', req.headers['content-type']);
        console.log('Body keys:', Object.keys(req.body));
        console.log('Body:', JSON.stringify(req.body, null, 2));
        
        // Extract data from body (JSON format)
        const {
            ownerName,
            email,
            phone,
            password,
            restaurantName,
            address,
            city,
            country,
            cuisineType,
            description,
            openingHours,
            seatingCapacity,
            menu
        } = req.body;

        // Validation - check required fields
        const missingFields = [];
        if (!ownerName || ownerName.trim() === '') missingFields.push('ownerName');
        if (!email || email.trim() === '') missingFields.push('email');
        if (!phone || phone.trim() === '') missingFields.push('phone');
        if (!password || password.trim() === '') missingFields.push('password');
        if (!restaurantName || restaurantName.trim() === '') missingFields.push('restaurantName');
        if (!address || address.trim() === '') missingFields.push('address');
        if (!city || city.trim() === '') missingFields.push('city');
        if (!cuisineType || cuisineType.trim() === '') missingFields.push('cuisineType');

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`,
                missingFields: missingFields,
                received: Object.keys(req.body)
            });
        }

        console.log('✅ All required fields present');
        console.log('Owner:', ownerName);
        console.log('Email:', email);
        console.log('Restaurant:', restaurantName);
        console.log('Cuisine:', cuisineType);

        // Check if user already exists
        let owner = await User.findOne({ email: email.toLowerCase() });
        
        if (owner) {
            // User exists, check if they already have a restaurant
            const existingRestaurant = await Restaurant.findOne({ ownerId: owner._id });
            if (existingRestaurant) {
                return res.status(400).json({
                    success: false,
                    message: 'You already have a restaurant registration. Please check your registration status.',
                    data: {
                        restaurantId: existingRestaurant._id,
                        status: existingRestaurant.status
                    }
                });
            }
        } else {
            // Create new user account
            const hashedPassword = await bcrypt.hash(password, 10);
            owner = await User.create({
                name: ownerName,
                email: email.toLowerCase(),
                password: hashedPassword,
                role: 'user',
                profile: {
                    phone: phone
                }
            });
        }

        // Build restaurant address object
        const restaurantAddress = {
            street: (address || '').trim(),
            city: (city || '').trim(),
            state: (city || '').trim(), // Using city as state if not provided
            zipCode: '00000', // Default zipCode if not provided
            country: (country || 'Pakistan').trim()
        };

        // Parse seatingCapacity
        let parsedSeatingCapacity = undefined;
        if (seatingCapacity) {
            parsedSeatingCapacity = typeof seatingCapacity === 'string' 
                ? parseInt(seatingCapacity.trim()) 
                : parseInt(seatingCapacity);
            if (isNaN(parsedSeatingCapacity) || parsedSeatingCapacity < 1) {
                parsedSeatingCapacity = undefined;
            }
        }

        // Prepare restaurant data
        const restaurantData = {
            ownerId: owner._id,
            ownerName: (ownerName || '').trim(),
            ownerEmail: (email || '').toLowerCase().trim(),
            ownerPhone: (phone || '').trim(),
            restaurantName: (restaurantName || '').trim(),
            restaurantAddress,
            cuisineType: (cuisineType || '').trim(),
            description: (description || '').trim(),
            openingHours: (openingHours || '').trim(),
            menu: (menu || '').trim(),
            status: 'PENDING'
        };

        // Add seatingCapacity only if valid
        if (parsedSeatingCapacity && parsedSeatingCapacity > 0) {
            restaurantData.seatingCapacity = parsedSeatingCapacity;
        }

        console.log('📋 Creating restaurant with data:', JSON.stringify(restaurantData, null, 2));

        // Create restaurant registration with PENDING status
        const restaurant = await Restaurant.create(restaurantData);

        res.status(201).json({
            success: true,
            message: 'Restaurant registration submitted successfully. Waiting for admin approval.',
            data: {
                restaurantId: restaurant._id
            }
        });

    } catch (error) {
        console.error('Register Restaurant Error:', error);
        
        // Handle duplicate email error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists. Please use a different email or check your registration status.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// @desc    Get restaurant registration status by owner ID
// @route   GET /api/restaurants/status/:ownerId
exports.getRestaurantStatus = async (req, res) => {
    try {
        const { ownerId } = req.params;

        // Check if the requesting user is the owner or an admin
        if (req.user.role !== 'admin' && req.user.id !== ownerId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only check your own restaurant status.'
            });
        }

        const restaurant = await Restaurant.findOne({ ownerId })
            .select('-__v')
            .populate('approvedBy', 'name email')
            .populate('rejectedBy', 'name email');

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'No restaurant registration found for this owner'
            });
        }

        res.json({
            success: true,
            data: {
                restaurant: {
                    id: restaurant._id,
                    restaurantName: restaurant.restaurantName,
                    status: restaurant.status,
                    rejectionReason: restaurant.rejectionReason || null,
                    approvedBy: restaurant.approvedBy || null,
                    approvedAt: restaurant.approvedAt || null,
                    rejectedBy: restaurant.rejectedBy || null,
                    rejectedAt: restaurant.rejectedAt || null,
                    submittedAt: restaurant.createdAt,
                    updatedAt: restaurant.updatedAt
                }
            }
        });

    } catch (error) {
        console.error('Get Restaurant Status Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// @desc    Get restaurant registration status by email
// @route   GET /api/restaurants/status/email/:email
// @access  Public
exports.getRestaurantStatusByEmail = async (req, res) => {
    try {
        const { email } = req.params;

        // Find user by email
        const owner = await User.findOne({ email: email.toLowerCase() });
        if (!owner) {
            return res.status(404).json({
                success: false,
                message: 'No restaurant registration found for this email'
            });
        }

        // Find restaurant by owner ID
        const restaurant = await Restaurant.findOne({ ownerId: owner._id })
            .select('-__v')
            .populate('approvedBy', 'name email')
            .populate('rejectedBy', 'name email');

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'No restaurant registration found for this email'
            });
        }

        res.json({
            success: true,
            data: {
                status: {
                    status: restaurant.status,
                    reason: restaurant.rejectionReason || null,
                    restaurantId: restaurant._id.toString(),
                    submittedAt: restaurant.createdAt,
                    reviewedAt: restaurant.approvedAt || restaurant.rejectedAt || null
                }
            }
        });

    } catch (error) {
        console.error('Get Restaurant Status By Email Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// @desc    Get restaurant details
// @route   GET /api/restaurants/:restaurantId
// @access  Public
exports.getRestaurantDetails = async (req, res) => {
    try {
        const { restaurantId } = req.params;

        const restaurant = await Restaurant.findById(restaurantId)
            .select('-__v')
            .populate('ownerId', 'name email')
            .populate('approvedBy', 'name email')
            .populate('rejectedBy', 'name email');

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
        console.error('Get Restaurant Details Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// @desc    Update restaurant profile
// @route   PUT /api/restaurants/:restaurantId
// @access  Private (Owner only)
exports.updateRestaurantProfile = async (req, res) => {
    try {
        const { restaurantId } = req.params;

        // Find restaurant
        const restaurant = await Restaurant.findById(restaurantId);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        // Check if logged-in user is the owner
        if (restaurant.ownerId.toString() !== req.user.id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only the restaurant owner can update the profile.'
            });
        }

        // Extract and validate update data
        const {
            ownerName,
            ownerPhone,
            restaurantName,
            address,
            city,
            state,
            zipCode,
            country,
            cuisineType,
            description,
            openingHours,
            seatingCapacity,
            menu
        } = req.body;

        // Build update object
        const updateData = {};

        // Update owner information
        if (ownerName !== undefined) {
            if (!ownerName || ownerName.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Owner name cannot be empty'
                });
            }
            updateData.ownerName = ownerName.trim();
        }

        if (ownerPhone !== undefined) {
            if (!ownerPhone || ownerPhone.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Owner phone cannot be empty'
                });
            }
            updateData.ownerPhone = ownerPhone.trim();
        }

        // Update restaurant information
        if (restaurantName !== undefined) {
            if (!restaurantName || restaurantName.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Restaurant name cannot be empty'
                });
            }
            updateData.restaurantName = restaurantName.trim();
        }

        // Update address
        if (address || city || state || zipCode || country) {
            updateData.restaurantAddress = {
                ...restaurant.restaurantAddress,
                street: address !== undefined ? address.trim() : restaurant.restaurantAddress.street,
                city: city !== undefined ? city.trim() : restaurant.restaurantAddress.city,
                state: state !== undefined ? state.trim() : restaurant.restaurantAddress.state,
                zipCode: zipCode !== undefined ? zipCode.trim() : restaurant.restaurantAddress.zipCode,
                country: country !== undefined ? country.trim() : restaurant.restaurantAddress.country
            };

            // Validate required address fields
            if (!updateData.restaurantAddress.street || updateData.restaurantAddress.street.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Street address is required'
                });
            }
            if (!updateData.restaurantAddress.city || updateData.restaurantAddress.city.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'City is required'
                });
            }
            if (!updateData.restaurantAddress.state || updateData.restaurantAddress.state.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'State is required'
                });
            }
            if (!updateData.restaurantAddress.zipCode || updateData.restaurantAddress.zipCode.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Zip code is required'
                });
            }
            if (!updateData.restaurantAddress.country || updateData.restaurantAddress.country.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Country is required'
                });
            }
        }

        // Update cuisine type
        if (cuisineType !== undefined) {
            if (!cuisineType || cuisineType.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Cuisine type cannot be empty'
                });
            }
            updateData.cuisineType = cuisineType.trim();
        }

        // Update description (optional field)
        if (description !== undefined) {
            if (description && description.length > 1000) {
                return res.status(400).json({
                    success: false,
                    message: 'Description cannot exceed 1000 characters'
                });
            }
            updateData.description = description ? description.trim() : '';
        }

        // Update opening hours (optional field)
        if (openingHours !== undefined) {
            updateData.openingHours = openingHours ? openingHours.trim() : '';
        }

        // Update seating capacity (optional field)
        if (seatingCapacity !== undefined) {
            const parsedCapacity = typeof seatingCapacity === 'string' 
                ? parseInt(seatingCapacity.trim()) 
                : parseInt(seatingCapacity);
            
            if (isNaN(parsedCapacity) || parsedCapacity < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Seating capacity must be a number greater than 0'
                });
            }
            if (parsedCapacity > 1000) {
                return res.status(400).json({
                    success: false,
                    message: 'Seating capacity cannot exceed 1000'
                });
            }
            updateData.seatingCapacity = parsedCapacity;
        }

        // Update menu (optional field)
        if (menu !== undefined) {
            updateData.menu = menu ? menu.trim() : '';
        }

        // Check if there's any data to update
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields provided for update'
            });
        }

        // Update restaurant
        const updatedRestaurant = await Restaurant.findByIdAndUpdate(
            restaurantId,
            { $set: updateData },
            { new: true, runValidators: true }
        )
            .select('-__v')
            .populate('ownerId', 'name email')
            .populate('approvedBy', 'name email')
            .populate('rejectedBy', 'name email');

        res.json({
            success: true,
            message: 'Restaurant profile updated successfully',
            data: { restaurant: updatedRestaurant }
        });

    } catch (error) {
        console.error('Update Restaurant Profile Error:', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: errors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// @desc    Login restaurant owner
// @route   POST /api/restaurants/login
// @access  Public
exports.loginRestaurant = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Normalize email
        const normalizedEmail = email.trim().toLowerCase();

        console.log('🍽️ Restaurant Login Attempt:', { email: normalizedEmail });

        // Find user by email
        const user = await User.findOne({ email: normalizedEmail }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if user has a restaurant registration
        const restaurant = await Restaurant.findOne({ ownerId: user._id })
            .populate('ownerId', 'name email')
            .populate('approvedBy', 'name email')
            .populate('rejectedBy', 'name email');

        if (!restaurant) {
            return res.status(403).json({
                success: false,
                message: 'No restaurant registration found for this account. Please register your restaurant first.'
            });
        }

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

        // Format restaurant data for response
        const restaurantData = {
            id: restaurant._id,
            restaurantName: restaurant.restaurantName,
            status: restaurant.status,
            ownerName: restaurant.ownerName,
            ownerEmail: restaurant.ownerEmail,
            ownerPhone: restaurant.ownerPhone,
            address: restaurant.restaurantAddress,
            cuisineType: restaurant.cuisineType,
            description: restaurant.description,
            openingHours: restaurant.openingHours,
            seatingCapacity: restaurant.seatingCapacity,
            menu: restaurant.menu,
            rejectionReason: restaurant.rejectionReason || null,
            approvedBy: restaurant.approvedBy || null,
            approvedAt: restaurant.approvedAt || null,
            rejectedBy: restaurant.rejectedBy || null,
            rejectedAt: restaurant.rejectedAt || null,
            createdAt: restaurant.createdAt,
            updatedAt: restaurant.updatedAt
        };

        res.json({
            success: true,
            message: 'Restaurant login successful',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                restaurant: restaurantData,
                token
            }
        });

    } catch (error) {
        console.error('Restaurant Login Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

