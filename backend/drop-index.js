// Script to drop the old token_1 index from sessions collection
const mongoose = require('mongoose');
require('dotenv/config');

async function dropIndex() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // List all indexes first
    const indexes = await mongoose.connection.db.collection('sessions').indexes();
    console.log('Current indexes on sessions collection:');
    indexes.forEach(idx => console.log(' -', idx.name, ':', JSON.stringify(idx.key)));
    
    // Drop the problematic token_1 index
    try {
      await mongoose.connection.db.collection('sessions').dropIndex('token_1');
      console.log('\n✓ Successfully dropped token_1 index');
    } catch (e) {
      if (e.code === 27) {
        console.log('\n✓ token_1 index does not exist (already dropped)');
      } else {
        console.log('\n✗ Error dropping token_1:', e.message);
      }
    }

    // Also try to drop qrCodes.token_1 if it exists
    try {
      await mongoose.connection.db.collection('sessions').dropIndex('qrCodes.token_1');
      console.log('✓ Successfully dropped qrCodes.token_1 index');
    } catch (e) {
      // Ignore - may not exist
    }

    console.log('\nDone! You can now restart your backend server.');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

dropIndex();

