const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartgenie')
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => console.log('❌ MongoDB Connection Error:', err));

async function createFirstAdmin() {
    try {
        // Check if any admin already exists
        const existingAdmin = await User.findOne({ role: 'admin' });
        
        if (existingAdmin) {
            console.log('🔍 Admin already exists:');
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Name: ${existingAdmin.name}`);
            console.log(`   Role: ${existingAdmin.role}`);
            console.log('\n✅ You can use these credentials to login!');
            process.exit(0);
        }

        // Create first admin
        const adminData = {
            name: 'Super Admin',
            email: 'admin@smartgenie.com',
            password: await bcrypt.hash('admin123', 10),
            role: 'admin'
        };

        const admin = await User.create(adminData);
        
        console.log('🎉 First Admin Created Successfully!');
        console.log('📧 Login Credentials:');
        console.log(`   Email: ${admin.email}`);
        console.log(`   Password: admin123`);
        console.log('\n⚠️  IMPORTANT: Change the password after first login!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
        process.exit(1);
    }
}

createFirstAdmin();
