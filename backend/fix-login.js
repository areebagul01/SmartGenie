const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartgenie')
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => console.log('❌ MongoDB Connection Error:', err));

async function testUserQuery() {
    try {
        // Test the exact query used in login
        const user = await User.findOne({ email: 'admin@smartgenie.com' });
        
        console.log('🔍 User found:');
        console.log('Raw user object:', JSON.stringify(user, null, 2));
        
        // Test what happens when we manually create the response object
        const responseUser = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };
        
        console.log('\n📤 Response user object:');
        console.log(JSON.stringify(responseUser, null, 2));
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

testUserQuery();
