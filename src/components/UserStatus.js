// UserStatus.js - Corrected version

import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useEffect, useState } from "react";
import { getDatabase, ref, onDisconnect as rtdbOnDisconnect, set } from "firebase/database";

// Function to set up online/offline tracking for current user
export const setupOnlineStatus = () => {
    const auth = getAuth();
    const firestore = getFirestore();
    const database = getDatabase(); // We'll use RTDB for presence

    // Only run if a user is logged in
    if (!auth.currentUser) return;

    // Reference to the user's status in Firestore
    const userStatusRef = doc(firestore, "status", auth.currentUser.uid);

    // Reference to the user's status in Realtime Database
    const userStatusRTDBRef = ref(database, `status/${auth.currentUser.uid}`);

    // Set the user as online in Firestore
    setDoc(userStatusRef, {
        online: true
    });

    // Set the user as online in RTDB
    set(userStatusRTDBRef, true);

    // When user disconnects, set them as offline in RTDB
    // This will trigger the Firestore onDisconnect handler
    rtdbOnDisconnect(userStatusRTDBRef).set(false);
};

// Hook to check if a user is online
export const useIsUserOnline = (userId) => {
    const [isOnline, setIsOnline] = useState(false);
    const firestore = getFirestore();

    useEffect(() => {
        if (!userId) return;

        const userStatusRef = doc(firestore, "status", userId);

        // Subscribe to status changes
        const unsubscribe = onSnapshot(userStatusRef, (doc) => {
            if (doc.exists()) {
                setIsOnline(doc.data().online === true);
            } else {
                setIsOnline(false);
            }
        });

        // Clean up subscription when component unmounts
        return () => unsubscribe();
    }, [userId]);

    return isOnline;
};