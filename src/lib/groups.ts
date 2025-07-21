import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';
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

  // Log activity (don't await to avoid blocking)
  logGroupActivity(docRef.id, 'group_created', createdBy, { name, memberCount: memberUIDs.length });

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
export async function deleteGroup(groupId: string, deletedBy: string, forceDelete: boolean = false): Promise<void> {
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
    // Only consider bookings that are confirmed or have future dates
    const bookingsQuery = query(
      collection(db, 'groupBookings'),
      where('groupId', '==', groupId)
    );

    const bookingsSnapshot = await getDocs(bookingsQuery);

    // Filter for truly active bookings (confirmed or future pending bookings)
    const activeBookings = bookingsSnapshot.docs.filter(doc => {
      const booking = doc.data();
      const startTime = booking.startTime?.toDate ? booking.startTime.toDate() : new Date(booking.startTime);
      const now = new Date();

      // Consider a booking active if:
      // 1. It's confirmed, OR
      // 2. It's pending AND the meeting is in the future (more than 1 hour from now)
      return (
        booking.status === 'confirmed' ||
        (booking.status === 'pending' && startTime > new Date(now.getTime() + 60 * 60 * 1000))
      );
    });

    if (activeBookings.length > 0 && !forceDelete) {
      const bookingTitles = activeBookings.map(doc => doc.data().title).join(', ');
      throw new Error(`Cannot delete group with active bookings: ${bookingTitles}. Please cancel or complete these meetings first.`);
    }

    // Clean up any orphaned/incomplete bookings before deleting the group
    await cleanupGroupBookings(groupId);

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

// Log group activity
export async function logGroupActivity(
  groupId: string,
  action: string,
  userId: string,
  details?: any
): Promise<void> {
  try {
    await addDoc(collection(db, 'groupActivities'), {
      groupId,
      action,
      userId,
      details: details || {},
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging group activity:', error);
    // Don't throw - activity logging shouldn't break main functionality
  }
}

// Get group activities
export async function getGroupActivities(groupId: string, limit: number = 10): Promise<any[]> {
  try {
    const activitiesQuery = query(
      collection(db, 'groupActivities'),
      where('groupId', '==', groupId)
    );

    const snapshot = await getDocs(activitiesQuery);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting group activities:', error);
    return [];
  }
}

// Clean up orphaned or incomplete bookings for a group
async function cleanupGroupBookings(groupId: string): Promise<void> {
  try {
    // Get all bookings for this group
    const bookingsQuery = query(
      collection(db, 'groupBookings'),
      where('groupId', '==', groupId)
    );

    const bookingsSnapshot = await getDocs(bookingsQuery);

    if (bookingsSnapshot.empty) {
      return; // No bookings to clean up
    }

    const batch = writeBatch(db);
    const now = new Date();

    bookingsSnapshot.docs.forEach(bookingDoc => {
      const booking = bookingDoc.data();
      const startTime = booking.startTime?.toDate ? booking.startTime.toDate() : new Date(booking.startTime);

      // Delete bookings that are:
      // 1. Pending and in the past (more than 1 hour ago), OR
      // 2. Cancelled, OR
      // 3. Completed
      const shouldDelete = (
        (booking.status === 'pending' && startTime < new Date(now.getTime() - 60 * 60 * 1000)) ||
        booking.status === 'cancelled' ||
        booking.status === 'completed'
      );

      if (shouldDelete) {
        batch.delete(doc(db, 'groupBookings', bookingDoc.id));
      }
    });

    // Also clean up related meeting invitations
    const invitationsQuery = query(
      collection(db, 'meetingInvitations'),
      where('bookingId', 'in', bookingsSnapshot.docs.map(doc => doc.id))
    );

    const invitationsSnapshot = await getDocs(invitationsQuery);
    invitationsSnapshot.docs.forEach(invitationDoc => {
      batch.delete(doc(db, 'meetingInvitations', invitationDoc.id));
    });

    // Also clean up related calendar reservations
    const reservationsQuery = query(
      collection(db, 'calendarReservations'),
      where('bookingId', 'in', bookingsSnapshot.docs.map(doc => doc.id))
    );

    const reservationsSnapshot = await getDocs(reservationsQuery);
    reservationsSnapshot.docs.forEach(reservationDoc => {
      batch.delete(doc(db, 'calendarReservations', reservationDoc.id));
    });

    // Commit all deletions
    await batch.commit();

    console.log(`Cleaned up ${bookingsSnapshot.docs.length} bookings and related data for group ${groupId}`);

  } catch (error) {
    console.error('Error cleaning up group bookings:', error);
    // Don't throw - group deletion should still proceed
  }
}