const User = require('../models/User');
const Admin = require('../models/Admin');
const Restaurant = require('../models/Restaurant');
const Notification = require('../models/Notification');
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
        const totalRestaurants = await Restaurant.countDocuments();
        
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
                totalRestaurants,
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

// @desc    Get all pending restaurant registration requests
// @route   GET /api/admin/restaurant-requests
exports.getRestaurantRequests = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin role required.'
            });
        }

        const { status } = req.query; // Optional filter by status

        // Build query
        const query = {};
        if (status) {
            query.status = status.toUpperCase();
        } else {
            // Default to PENDING if no status specified
            query.status = 'PENDING';
        }

        const restaurants = await Restaurant.find(query)
            .select('-__v')
            .populate('ownerId', 'name email')
            .sort({ createdAt: -1 }); // Newest first

        res.json({
            success: true,
            count: restaurants.length,
            data: {
                restaurants
            }
        });

    } catch (error) {
        console.error('Get Restaurant Requests Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// @desc    Approve restaurant registration
// @route   PATCH /api/admin/restaurant/approve/:id
exports.approveRestaurant = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin role required.'
            });
        }

        const { id } = req.params;

        // Find restaurant
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant registration not found'
            });
        }

        // Check if already processed
        if (restaurant.status === 'APPROVED') {
            return res.status(400).json({
                success: false,
                message: 'Restaurant is already approved'
            });
        }

        if (restaurant.status === 'REJECTED') {
            return res.status(400).json({
                success: false,
                message: 'Restaurant was already rejected. Cannot approve a rejected registration.'
            });
        }

        // Update restaurant status
        restaurant.status = 'APPROVED';
        restaurant.approvedBy = req.user.id;
        restaurant.approvedAt = new Date();
        restaurant.rejectionReason = undefined; // Clear any previous rejection reason
        await restaurant.save();

        // Create notification for restaurant owner
        await Notification.create({
            userId: restaurant.ownerId,
            restaurantId: restaurant._id,
            type: 'APPROVAL',
            title: 'Restaurant Registration Approved',
            message: `Congratulations! Your restaurant "${restaurant.restaurantName}" has been approved. You can now start using the platform.`
        });

        // Populate admin info for response
        await restaurant.populate('approvedBy', 'name email');

        res.json({
            success: true,
            message: 'Restaurant approved successfully',
            data: {
                restaurant: {
                    id: restaurant._id,
                    restaurantName: restaurant.restaurantName,
                    status: restaurant.status,
                    approvedBy: restaurant.approvedBy,
                    approvedAt: restaurant.approvedAt
                }
            }
        });

    } catch (error) {
        console.error('Approve Restaurant Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// @desc    Reject restaurant registration
// @route   PATCH /api/admin/restaurant/reject/:id
exports.rejectRestaurant = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin role required.'
            });
        }

        const { id } = req.params;
        const { rejectionReason } = req.body;

        // Validation
        if (!rejectionReason || rejectionReason.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        if (rejectionReason.length > 500) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason cannot exceed 500 characters'
            });
        }

        // Find restaurant
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant registration not found'
            });
        }

        // Check if already processed
        if (restaurant.status === 'REJECTED') {
            return res.status(400).json({
                success: false,
                message: 'Restaurant is already rejected'
            });
        }

        if (restaurant.status === 'APPROVED') {
            return res.status(400).json({
                success: false,
                message: 'Restaurant was already approved. Cannot reject an approved registration.'
            });
        }

        // Update restaurant status
        restaurant.status = 'REJECTED';
        restaurant.rejectionReason = rejectionReason.trim();
        restaurant.rejectedBy = req.user.id;
        restaurant.rejectedAt = new Date();
        await restaurant.save();

        // Create notification for restaurant owner
        await Notification.create({
            userId: restaurant.ownerId,
            restaurantId: restaurant._id,
            type: 'REJECTION',
            title: 'Restaurant Registration Rejected',
            message: `Your restaurant registration for "${restaurant.restaurantName}" has been rejected. Please review the reason and resubmit if needed.`,
            rejectionReason: rejectionReason.trim()
        });

        // Populate admin info for response
        await restaurant.populate('rejectedBy', 'name email');

        res.json({
            success: true,
            message: 'Restaurant rejected successfully',
            data: {
                restaurant: {
                    id: restaurant._id,
                    restaurantName: restaurant.restaurantName,
                    status: restaurant.status,
                    rejectionReason: restaurant.rejectionReason,
                    rejectedBy: restaurant.rejectedBy,
                    rejectedAt: restaurant.rejectedAt
                }
            }
        });

    } catch (error) {
        console.error('Reject Restaurant Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// @desc    Get restaurant details by ID (admin only)
// @route   GET /api/admin/restaurant/:id
exports.getRestaurantById = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin role required.'
            });
        }

        const { id } = req.params;

        // Find restaurant and populate owner details
        const restaurant = await Restaurant.findById(id)
            .populate('ownerId', 'name email profile')
            .populate('approvedBy', 'name email')
            .populate('rejectedBy', 'name email');

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        // Format response according to the required structure
        const formattedRestaurant = {
            _id: restaurant._id,
            name: restaurant.restaurantName,
            email: restaurant.ownerEmail,
            ownerName: restaurant.ownerName,
            phone: restaurant.ownerPhone,
            address: restaurant.restaurantAddress?.street || '',
            city: restaurant.restaurantAddress?.city || '',
            state: restaurant.restaurantAddress?.state || '',
            zipCode: restaurant.restaurantAddress?.zipCode || '',
            cuisine: restaurant.cuisineType || '',
            description: restaurant.description || '',
            openingHours: restaurant.openingHours || '',
            capacity: restaurant.seatingCapacity || null,
            status: restaurant.status.toLowerCase(), // Convert to lowercase: pending, approved, rejected
            rejectionReason: restaurant.rejectionReason || null,
            images: [], // Placeholder for future image support
            createdAt: restaurant.createdAt,
            updatedAt: restaurant.updatedAt,
            // Additional fields for admin view
            ownerId: restaurant.ownerId?._id || restaurant.ownerId,
            country: restaurant.restaurantAddress?.country || '',
            menu: restaurant.menu || '',
            approvedBy: restaurant.approvedBy ? {
                name: restaurant.approvedBy.name,
                email: restaurant.approvedBy.email
            } : null,
            approvedAt: restaurant.approvedAt || null,
            rejectedBy: restaurant.rejectedBy ? {
                name: restaurant.rejectedBy.name,
                email: restaurant.rejectedBy.email
            } : null,
            rejectedAt: restaurant.rejectedAt || null
        };

        res.json({
            success: true,
            message: 'Restaurant details fetched successfully',
            data: {
                restaurant: formattedRestaurant
            }
        });

    } catch (error) {
        console.error('Get Restaurant By ID Error:', error);
        
        // Handle invalid ObjectId format
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid restaurant ID format'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// @desc    Delete restaurant
// @route   DELETE /api/admin/restaurant/delete/:id
exports.deleteRestaurant = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin role required.'
            });
        }

        const { id } = req.params;

        // Find restaurant
        const restaurant = await Restaurant.findById(id);
        
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        // Store restaurant name for response
        const restaurantName = restaurant.restaurantName;

        // Delete the restaurant
        await Restaurant.findByIdAndDelete(id);

        // Optional: Create notification for restaurant owner
        try {
            await Notification.create({
                userId: restaurant.ownerId,
                restaurantId: restaurant._id,
                type: 'DELETION',
                title: 'Restaurant Deleted',
                message: `Your restaurant "${restaurantName}" has been deleted by the administrator.`
            });
        } catch (notifError) {
            // Log notification error but don't fail the delete operation
            console.error('Notification creation failed:', notifError);
        }

        res.json({
            success: true,
            message: 'Restaurant deleted successfully',
            data: {
                deletedRestaurant: {
                    id: restaurant._id,
                    name: restaurantName
                }
            }
        });

    } catch (error) {
        console.error('Delete Restaurant Error:', error);
        
        // Handle invalid ObjectId format
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid restaurant ID format'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};