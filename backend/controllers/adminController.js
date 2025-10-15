const User = require('../models/User');
const Admin = require('../models/Admin');
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

        // Check if admin with this email already exists
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ 
                success: false, 
                message: 'Admin already exists with this email' 
            });
        }

        // Check admin count to see if this is first admin
        const adminCount = await Admin.countDocuments();
        
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

        // Create admin in Admin collection
        const adminUser = await Admin.create({
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

// @desc    Get current admin profile
// @route   GET /api/admin/profile
exports.getCurrentAdminProfile = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin role required.'
            });
        }

        // Find admin from Admin collection
        const admin = await Admin.findById(req.user.id).select('-password');

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: admin._id,
                    name: admin.name,
                    email: admin.email,
                    role: admin.role,
                    createdAt: admin.createdAt
                }
            }
        });
    } catch (error) {
        console.error('Get Admin Profile Error:', error);
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

        const admins = await Admin.find().select('-password');
        
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
        const totalAdmins = await Admin.countDocuments();
        
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

// @desc    Update admin profile
// @route   PUT /api/admin/profile
exports.updateProfile = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin role required.'
            });
        }

        const { name, email, currentPassword, newPassword } = req.body;

        // Find the current admin from Admin collection
        const admin = await Admin.findById(req.user.id).select('+password');

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        // Update name if provided
        if (name && name.trim() !== '') {
            admin.name = name;
        }

        // Note: Email updates are disabled for security reasons
        // If email is being changed (optional - currently disabled in frontend)
        if (email && email !== admin.email) {
            const existingAdmin = await Admin.findOne({ email });
            if (existingAdmin) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already in use'
                });
            }
            admin.email = email;
        }

        // If password is being changed, verify current password first
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is required to set new password'
                });
            }

            // Verify current password
            const isMatch = await bcrypt.compare(currentPassword, admin.password);
            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            // Validate new password length
            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'New password must be at least 6 characters'
                });
            }

            // Hash and update new password
            admin.password = await bcrypt.hash(newPassword, 10);
        }

        // Save the updated admin
        await admin.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                admin: {
                    id: admin._id,
                    name: admin.name,
                    email: admin.email,
                    role: admin.role
                }
            }
        });

    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// @desc    Delete admin
// @route   DELETE /api/admin/delete/:id
exports.deleteAdmin = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin role required.'
            });
        }

        // Check if user is super admin (admin@smartgenie.com)
        if (req.user.email !== 'admin@smartgenie.com') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only super admin can delete admins.'
            });
        }

        const adminId = req.params.id;

        // Find the admin to delete from Admin collection
        const adminToDelete = await Admin.findById(adminId);

        if (!adminToDelete) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        // Prevent super admin from deleting themselves
        if (adminToDelete.email === 'admin@smartgenie.com') {
            return res.status(400).json({
                success: false,
                message: 'Super admin cannot be deleted'
            });
        }

        // Delete the admin
        await Admin.findByIdAndDelete(adminId);

        res.json({
            success: true,
            message: 'Admin deleted successfully'
        });

    } catch (error) {
        console.error('Delete Admin Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};