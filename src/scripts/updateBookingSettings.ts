import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBq5aYvDB8DmSNZCUoAP8hhayBRJ4G1d4g",
  authDomain: "smart-scheduling-app-a94b1.firebaseapp.com",
  projectId: "smart-scheduling-app-a94b1",
  storageBucket: "smart-scheduling-app-a94b1.firebasestorage.app",
  messagingSenderId: "292962557323",
  appId: "1:292962557323:web:075fdebc3d1ee781b3638e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateExistingUserBookingSettings() {
  try {
    console.log('Starting to update existing user booking settings...');
    
    // Get all user profiles
    const userProfilesRef = collection(db, 'userProfiles');
    const querySnapshot = await getDocs(userProfilesRef);
    
    let updatedCount = 0;
    let totalCount = 0;
    
    for (const docSnapshot of querySnapshot.docs) {
      totalCount++;
      const data = docSnapshot.data();
      
      // Only update if autoConfirmBookings is not explicitly set to false
      if (data.autoConfirmBookings !== false) {
        await updateDoc(doc(db, 'userProfiles', docSnapshot.id), {
          autoConfirmBookings: false, // Change to manual approval
          updatedAt: new Date()
        });
        
        updatedCount++;
        console.log(`Updated user profile: ${docSnapshot.id}`);
      }
    }
    
    console.log(`✅ Update complete!`);
    console.log(`📊 Total profiles: ${totalCount}`);
    console.log(`🔄 Updated profiles: ${updatedCount}`);
    console.log(`⏭️  Already set to manual approval: ${totalCount - updatedCount}`);
    
    console.log('\n🎉 All existing users now have manual booking approval enabled!');
    console.log('📧 This means:');
    console.log('  - New bookings will be PENDING and require host approval');
    console.log('  - Guests will receive "pending" confirmation emails');
    console.log('  - Hosts will receive notification emails about new booking requests');
    console.log('  - When hosts approve/decline, guests will receive status update emails');
    
  } catch (error) {
    console.error('❌ Error updating user booking settings:', error);
  }
}

// Run the update
updateExistingUserBookingSettings();
