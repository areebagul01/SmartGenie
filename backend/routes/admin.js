const express = require('express');
const {
    createAdmin,
    getAllAdmins,
    getDashboardStats
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply protect middleware to ALL admin routes
router.use(protect);

// All admin routes now have req.user available
router.post('/create', createAdmin);
router.get('/admins', getAllAdmins);
router.get('/dashboard/stats', getDashboardStats);

module.exports = router;