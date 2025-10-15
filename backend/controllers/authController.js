const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

// @desc    Register user
// @route   POST /api/auth/signup
exports.signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        // Check if user with role 'user' already exists
        const existingUser = await User.findOne({ email, role: 'user' });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User already exists with this email' 
            });
        }
        
        // Allow same email for admin and user (different accounts)

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'user'
        });

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                token
            }
        });

    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// @desc    Login user/admin (separate collections)
// @route   POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password, loginAs } = req.body; // loginAs can be 'admin' or 'user'

        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }

        let matchedUser = null;
        
        if (loginAs === 'admin') {
            // Admin panel login - check Admin collection
            const admin = await Admin.findOne({ email }).select('+password');
            
            if (!admin) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid email or password' 
                });
            }

            const isPasswordValid = await bcrypt.compare(password, admin.password);
            if (!isPasswordValid) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid password' 
                });
            }

            matchedUser = admin;
        } else {
            // User frontend login - check User collection
            const user = await User.findOne({ email, role: 'user' }).select('+password');
            
            if (!user) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid email or password' 
                });
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid password' 
                });
            }

            matchedUser = user;
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: matchedUser._id, email: matchedUser.email, role: matchedUser.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: matchedUser._id,
                    name: matchedUser.name,
                    email: matchedUser.email,
                    role: matchedUser.role
                },
                token
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
    try {
        let user;
        
        // Check if user is admin or regular user based on role
        if (req.user.role === 'admin') {
            user = await Admin.findById(req.user.userId);
        } else {
            user = await User.findById(req.user.userId);
        }
        
        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        console.error('Get Profile Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};