const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartgenie')
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => console.log('❌ MongoDB Connection Error:', err));

async function createNewAdmin() {
    try {
        // Delete existing admin first
        await User.deleteOne({ email: 'admin@smartgenie.com' });
        console.log('🗑️  Deleted existing admin');

        // Create new admin with known password
        const adminData = {
            name: 'Super Admin',
            email: 'admin@smartgenie.com',
            password: await bcrypt.hash('admin123', 10),
            role: 'admin'
        };

        const admin = await User.create(adminData);
        
        console.log('🎉 Admin Created Successfully!');
        console.log('📧 Login Credentials:');
        console.log(`   Email: ${admin.email}`);
        console.log(`   Password: admin123`);
        console.log(`   Role: ${admin.role}`);
        console.log('\n✅ You can now login with these credentials!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
        process.exit(1);
    }
}

createNewAdmin();
