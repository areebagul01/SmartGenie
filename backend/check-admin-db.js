const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');
const User = require('./models/User');
require('dotenv').config();

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartgenie')
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => console.log('❌ MongoDB Connection Error:', err));

async function checkAdminInBothCollections() {
    try {
        const email = 'admin@smartgenie.com';
        
        console.log('\n🔍 Checking Admin Collection...');
        const adminInAdminCollection = await Admin.findOne({ email }).select('+password');
        
        if (adminInAdminCollection) {
            console.log('✅ Admin found in Admin collection:');
            console.log(`   ID: ${adminInAdminCollection._id}`);
            console.log(`   Name: ${adminInAdminCollection.name}`);
            console.log(`   Email: ${adminInAdminCollection.email}`);
            console.log(`   Role: ${adminInAdminCollection.role}`);
            console.log(`   Password Hash: ${adminInAdminCollection.password.substring(0, 20)}...`);
            
            // Test password
            const testPassword = await bcrypt.compare('admin123', adminInAdminCollection.password);
            console.log(`   Password 'admin123' works: ${testPassword ? '✅ YES' : '❌ NO'}`);
        } else {
            console.log('❌ Admin NOT found in Admin collection');
        }
        
        console.log('\n🔍 Checking User Collection...');
        const adminInUserCollection = await User.findOne({ email, role: 'admin' }).select('+password');
        
        if (adminInUserCollection) {
            console.log('✅ Admin found in User collection:');
            console.log(`   ID: ${adminInUserCollection._id}`);
            console.log(`   Name: ${adminInUserCollection.name}`);
            console.log(`   Email: ${adminInUserCollection.email}`);
            console.log(`   Role: ${adminInUserCollection.role}`);
            console.log(`   Password Hash: ${adminInUserCollection.password.substring(0, 20)}...`);
            
            // Test password
            const testPassword = await bcrypt.compare('admin123', adminInUserCollection.password);
            console.log(`   Password 'admin123' works: ${testPassword ? '✅ YES' : '❌ NO'}`);
        } else {
            console.log('❌ Admin NOT found in User collection');
        }
        
        console.log('\n📊 Summary:');
        if (adminInAdminCollection) {
            console.log('✅ Admin exists in Admin collection - Login should work');
        } else if (adminInUserCollection) {
            console.log('⚠️  Admin exists in User collection, NOT in Admin collection');
            console.log('   This is why login is failing!');
            console.log('   Solution: Run create-first-admin.js to create admin in Admin collection');
        } else {
            console.log('❌ Admin not found in either collection');
            console.log('   Solution: Run create-first-admin.js to create admin');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

checkAdminInBothCollections();

