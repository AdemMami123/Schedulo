import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Group } from '@/types/group';

// Create a new group
export async function createGroup(name: string, memberUIDs: string[], createdBy: string): Promise<string> {
  const groupData: Omit<Group, 'id'> = {
    name,
    members: memberUIDs,
    createdAt: Date.now(),
    createdBy,
  };

  const docRef = await addDoc(collection(db, 'groups'), {
    ...groupData,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

// Update an existing group
export async function updateGroup(
  groupId: string,
  updates: { name?: string; members?: string[] },
  updatedBy: string
): Promise<void> {
  try {
    if (!groupId) {
      throw new Error('Group ID is required');
    }

    // Verify the group exists
    const groupRef = doc(db, 'groups', groupId);
    const groupSnapshot = await getDoc(groupRef);

    if (!groupSnapshot.exists()) {
      throw new Error('Group not found');
    }

    const currentGroup = groupSnapshot.data() as Group;

    // Check if the user has permission to edit (creator or admin)
    if (currentGroup.createdBy !== updatedBy) {
      throw new Error('You do not have permission to edit this group');
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: serverTimestamp(),
      updatedBy
    };

    if (updates.name !== undefined) {
      if (!updates.name.trim()) {
        throw new Error('Group name cannot be empty');
      }
      updateData.name = updates.name.trim();
    }

    if (updates.members !== undefined) {
      if (!Array.isArray(updates.members)) {
        throw new Error('Members must be an array');
      }
      updateData.members = updates.members;
    }

    // Update the group
    await updateDoc(groupRef, updateData);
  } catch (error) {
    console.error('Error updating group:', error);
    throw error;
  }
}

// Delete a group
export async function deleteGroup(groupId: string, deletedBy: string): Promise<void> {
  try {
    if (!groupId) {
      throw new Error('Group ID is required');
    }

    // Verify the group exists
    const groupRef = doc(db, 'groups', groupId);
    const groupSnapshot = await getDoc(groupRef);

    if (!groupSnapshot.exists()) {
      throw new Error('Group not found');
    }

    const currentGroup = groupSnapshot.data() as Group;

    // Check if the user has permission to delete (creator only)
    if (currentGroup.createdBy !== deletedBy) {
      throw new Error('You do not have permission to delete this group');
    }

    // Check if there are any active bookings for this group
    const bookingsQuery = query(
      collection(db, 'groupBookings'),
      where('groupId', '==', groupId),
      where('status', 'in', ['pending', 'confirmed'])
    );

    const bookingsSnapshot = await getDocs(bookingsQuery);

    if (!bookingsSnapshot.empty) {
      throw new Error('Cannot delete group with active bookings. Please cancel or complete all meetings first.');
    }

    // Delete the group
    await deleteDoc(groupRef);
  } catch (error) {
    console.error('Error deleting group:', error);
    throw error;
  }
}

// Get a single group by ID
export async function getGroup(groupId: string): Promise<Group | null> {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const groupSnapshot = await getDoc(groupRef);

    if (!groupSnapshot.exists()) {
      return null;
    }

    return {
      id: groupSnapshot.id,
      ...groupSnapshot.data()
    } as Group;
  } catch (error) {
    console.error('Error getting group:', error);
    throw error;
  }
}

// Get all groups for a user
export async function getUserGroups(userId: string): Promise<Group[]> {
  try {
    const groupsQuery = query(
      collection(db, 'groups'),
      where('members', 'array-contains', userId)
    );

    const snapshot = await getDocs(groupsQuery);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Group[];
  } catch (error) {
    console.error('Error getting user groups:', error);
    throw error;
  }
}