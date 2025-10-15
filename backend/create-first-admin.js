const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Admin Model
const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    role: {
        type: String,
        default: 'admin',
        enum: ['admin']
    }
}, {
    timestamps: true
});

const Admin = mongoose.model('Admin', adminSchema);

async function createFirstAdmin() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartgenie');
        console.log('✅ MongoDB Connected');

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email: 'admin@smartgenie.com' });
        
        if (existingAdmin) {
            console.log('⚠️  Admin already exists with email: admin@smartgenie.com');
            process.exit(0);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // Create admin
        const admin = await Admin.create({
            name: 'Super Admin',
            email: 'admin@smartgenie.com',
            password: hashedPassword,
            role: 'admin'
        });

        console.log('✅ First Admin Created Successfully!');
        console.log('📧 Email: admin@smartgenie.com');
        console.log('🔑 Password: admin123');
        console.log('👤 Name:', admin.name);
        console.log('🆔 ID:', admin._id);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

createFirstAdmin();

