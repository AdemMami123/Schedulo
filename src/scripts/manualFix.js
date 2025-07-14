// Manual Database Fix - Run this in browser console on your app

// Go to your app dashboard page and run this in browser console:
// This will force update your profile settings

async function fixAutoConfirmSetting() {
  try {
    console.log('🔧 Fixing auto-confirm setting...');
    
    // Get current user
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.log('❌ No user logged in');
      return;
    }
    
    console.log('✅ User found:', user.uid);
    
    // Update the profile
    const db = getFirestore();
    const profileRef = doc(db, 'userProfiles', user.uid);
    
    await updateDoc(profileRef, {
      autoConfirmBookings: false,
      updatedAt: new Date()
    });
    
    console.log('✅ Successfully updated autoConfirmBookings to false');
    console.log('📧 New bookings will now be PENDING');
    
    // Refresh the page
    window.location.reload();
    
  } catch (error) {
    console.error('❌ Error fixing setting:', error);
  }
}

// Run the fix
fixAutoConfirmSetting();
