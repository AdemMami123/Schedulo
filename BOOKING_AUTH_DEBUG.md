# Booking Authentication Debug

## Issue Description
When User A books with User B, User A sees the "Confirm" and "Cancel" buttons in their booking history, but only User B (the calendar owner) should see these buttons.

## Expected Behavior
- User A (guest) books with User B (host)
- User A should see the booking as "Your booking" in their history (isGuest=true)
- User B should see the booking as "With you" in their history (isHost=true)
- Only User B should see Confirm/Cancel buttons

## Current Behavior
- User A sees "With you" and gets Confirm/Cancel buttons
- This suggests the system thinks User A is the host

## Debug Points to Check

### 1. Booking Creation (BookingForm.tsx)
- `user.id` = Calendar owner's Firebase UID (should be User B)
- `currentUser.uid` = Person making booking (should be User A)
- `bookingData.userId` = Should be User B's ID
- `bookingData.guestEmail` = Should be User A's email

### 2. Booking History Loading (BookingHistory.tsx)
- `userProfile.id` = Current user's Firebase UID
- Host query: `where('userId', '==', userProfile.id)`
- Guest query: `where('guestEmail', '==', user.email)`

### 3. Possible Issues
1. **Same User Booking**: User A might be booking with themselves
2. **Wrong User ID**: The booking might be saved with wrong userId
3. **Session Mix-up**: The userProfile might be wrong user
4. **Query Issue**: Host/Guest queries might be wrong

## Debug Steps
1. Check console logs when booking is created
2. Check console logs when BookingHistory loads
3. Verify Firebase data directly
4. Check if user is booking with themselves

## Console Logs to Look For
- BookingForm: "Booking logic check"
- BookingHistory: "BookingHistory Debug"
- BookingHistory: "Host booking data" vs "Guest booking data"
