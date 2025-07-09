import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface UserData {
  id: string;
  username?: string;
  displayName?: string;
  email?: string;
  [key: string]: any;
}

/**
 * Migration script to fix duplicate usernames
 * This should be run once to clean up existing duplicate usernames
 */
export async function fixDuplicateUsernames() {
  console.log('Starting username deduplication process...');
  
  try {
    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users: UserData[] = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${users.length} users`);
    
    // Group users by username
    const usernameGroups: { [username: string]: UserData[] } = {};
    
    users.forEach(user => {
      if (user.username) {
        if (!usernameGroups[user.username]) {
          usernameGroups[user.username] = [];
        }
        usernameGroups[user.username].push(user);
      }
    });
    
    // Find duplicate usernames
    const duplicates = Object.entries(usernameGroups).filter(([username, users]) => users.length > 1);
    
    console.log(`Found ${duplicates.length} duplicate usernames`);
    
    // Fix duplicates
    for (const [username, duplicateUsers] of duplicates) {
      console.log(`Fixing duplicate username: ${username} (${duplicateUsers.length} users)`);
      
      // Keep the first user with the original username
      // Update the rest with numbered suffixes
      for (let i = 1; i < duplicateUsers.length; i++) {
        const user = duplicateUsers[i];
        let newUsername = `${username}${i}`;
        
        // Make sure the new username doesn't already exist
        let counter = i;
        while (usernameGroups[newUsername] && usernameGroups[newUsername].length > 0) {
          counter++;
          newUsername = `${username}${counter}`;
        }
        
        // Update the user's username
        try {
          await updateDoc(doc(db, 'users', user.id), {
            username: newUsername,
            updatedAt: new Date()
          });
          
          console.log(`Updated user ${user.displayName} (${user.email}): ${username} -> ${newUsername}`);
          
          // Add to username groups to prevent future conflicts
          usernameGroups[newUsername] = [user];
        } catch (error) {
          console.error(`Failed to update user ${user.id}:`, error);
        }
      }
    }
    
    console.log('Username deduplication completed!');
    return true;
  } catch (error) {
    console.error('Error during username deduplication:', error);
    return false;
  }
}

/**
 * Check for duplicate usernames (read-only operation)
 */
export async function checkForDuplicateUsernames() {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users: UserData[] = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const usernameGroups: { [username: string]: UserData[] } = {};
    
    users.forEach(user => {
      if (user.username) {
        if (!usernameGroups[user.username]) {
          usernameGroups[user.username] = [];
        }
        usernameGroups[user.username].push(user);
      }
    });
    
    const duplicates = Object.entries(usernameGroups).filter(([username, users]) => users.length > 1);
    
    console.log('Duplicate username report:');
    duplicates.forEach(([username, duplicateUsers]) => {
      console.log(`Username "${username}" is used by ${duplicateUsers.length} users:`);
      duplicateUsers.forEach(user => {
        console.log(`  - ${user.displayName} (${user.email}) - ID: ${user.id}`);
      });
    });
    
    return duplicates;
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    return [];
  }
}
