import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

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

async function checkAndFixUserProfile() {
  try {
    // You'll need to replace 'YOUR_USER_ID' with your actual user ID
    // You can find this in your Firebase Authentication console
    const userId = 'YOUR_USER_ID'; // Replace with your actual user ID
    
    console.log('Checking user profile settings...');
    
    // Get user profile document
    const userProfileRef = doc(db, 'userProfiles', userId);
    const userProfileDoc = await getDoc(userProfileRef);
    
    if (userProfileDoc.exists()) {
      const data = userProfileDoc.data();
      
      console.log('Current user profile settings:');
      console.log('- autoConfirmBookings:', data.autoConfirmBookings);
      console.log('- publicBookingEnabled:', data.publicBookingEnabled);
      console.log('- enableReminders:', data.enableReminders);
      
      // Check if autoConfirmBookings is true and needs to be fixed
      if (data.autoConfirmBookings === true || data.autoConfirmBookings === undefined) {
        console.log('\n🔧 Fixing autoConfirmBookings setting...');
        
        await updateDoc(userProfileRef, {
          autoConfirmBookings: false,
          updatedAt: new Date()
        });
        
        console.log('✅ autoConfirmBookings has been set to false');
        console.log('📧 New bookings will now be PENDING and require manual approval');
      } else {
        console.log('✅ autoConfirmBookings is already set to false');
      }
    } else {
      console.log('❌ User profile document not found');
    }
    
  } catch (error) {
    console.error('❌ Error checking user profile:', error);
  }
}

checkAndFixUserProfile();
