const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Create new admin
// @route   POST /api/admin/create
exports.createAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name, email and password are required' 
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

        // Check admin count to see if this is first admin
        const adminCount = await User.countDocuments({ role: 'admin' });
        
        // If there are existing admins, check if the requester is admin
        if (adminCount > 0) {
            // req.user should be available from protect middleware
            if (!req.user || req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Admin role required.'
                });
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create admin user
        const adminUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'admin'
        });

        res.status(201).json({
            success: true,
            message: 'Admin created successfully',
            data: {
                admin: {
                    id: adminUser._id,
                    name: adminUser.name,
                    email: adminUser.email,
                    role: adminUser.role
                }
            }
        });

    } catch (error) {
        console.error('Create Admin Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// @desc    Get all admins
// @route   GET /api/admin/admins
exports.getAllAdmins = async (req, res) => {
    try {
        // Check if user is admin (for routes other than create)
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin role required.'
            });
        }

        const admins = await User.find({ role: 'admin' }).select('-password');
        
        res.json({
            success: true,
            data: { admins }
        });
    } catch (error) {
        console.error('Get Admins Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// @desc    Get dashboard stats
// @route   GET /api/admin/dashboard/stats
exports.getDashboardStats = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin role required.'
            });
        }

        const totalUsers = await User.countDocuments({ role: 'user' });
        const totalAdmins = await User.countDocuments({ role: 'admin' });
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const newUsers = await User.countDocuments({
            role: 'user',
            createdAt: { $gte: thirtyDaysAgo }
        });

        res.json({
            success: true,
            data: {
                totalUsers,
                totalAdmins,
                newUsers
            }
        });
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};