const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartgenie')
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => console.log('❌ MongoDB Connection Error:', err));

async function checkAndCreateAdmin() {
    try {
        // Check existing users
        const users = await User.find();
        console.log('📋 Current users in database:');
        users.forEach(user => {
            console.log(`   - ${user.name} (${user.email}) - Role: ${user.role}`);
        });

        // Check if admin exists
        const admin = await User.findOne({ email: 'admin@smartgenie.com' });
        
        if (admin) {
            console.log('\n🔍 Existing admin found:');
            console.log(`   Email: ${admin.email}`);
            console.log(`   Name: ${admin.name}`);
            console.log(`   Role: ${admin.role}`);
            
            // Test password
            const testPassword = await bcrypt.compare('admin123', admin.password);
            console.log(`   Password 'admin123' works: ${testPassword ? '✅ YES' : '❌ NO'}`);
            
            if (!testPassword) {
                console.log('\n🔧 Updating admin password...');
                admin.password = await bcrypt.hash('admin123', 10);
                await admin.save();
                console.log('✅ Admin password updated successfully!');
            }
        } else {
            console.log('\n❌ No admin found. Creating new admin...');
            
            // Create new admin
            const adminData = {
                name: 'Super Admin',
                email: 'admin@smartgenie.com',
                password: await bcrypt.hash('admin123', 10),
                role: 'admin'
            };

            const newAdmin = await User.create(adminData);
            console.log('✅ New admin created:');
            console.log(`   Email: ${newAdmin.email}`);
            console.log(`   Name: ${newAdmin.name}`);
            console.log(`   Role: ${newAdmin.role}`);
        }
        
        console.log('\n🎯 Login Credentials:');
        console.log('   Email: admin@smartgenie.com');
        console.log('   Password: admin123');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkAndCreateAdmin();
