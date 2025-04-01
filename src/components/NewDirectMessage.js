import { useState } from "react";
import { getAuth } from "firebase/auth";
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp,
} from "firebase/firestore";
import { getAvatarForUser } from "./UserProfile";
import StatusDot from "./StatusDot"; // Import the status indicator component

export function NewDirectMessage({ onClose, onChatCreated }) {
    const [searchText, setSearchText] = useState("");
    const [users, setUsers] = useState([]);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState(null);
    const auth = getAuth();
    const firestore = getFirestore();

    // Enhanced user search function with more robust debugging and email privacy
    const searchUsers = async () => {
        if (!searchText.trim()) {
            setError("Please enter a search term");
            return;
        }

        try {
            setSearching(true);
            setError(null);

            // Get all userProfiles
            const userProfilesRef = collection(firestore, "userProfiles");
            const querySnapshot = await getDocs(userProfilesRef);

            // Log all retrieved profiles to debug
            const allProfiles = querySnapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            }));
            console.log("Total profiles retrieved:", allProfiles.length);
            console.log("Current user ID:", auth.currentUser?.uid);

            // Improved filtering logic with email privacy respect
            const searchedUsers = allProfiles.filter(user => {
                // Exclude current user
                if (user.uid === auth.currentUser?.uid) return false;

                // Normalize search comparisons
                const normalizedSearch = searchText.toLowerCase().trim();
                const displayName = (user.displayName || "").toLowerCase().trim();

                // Only search email if user hasn't hidden it
                const email = user.hideEmail ? "" : (user.email || "").toLowerCase().trim();

                // More flexible matching
                return (
                    displayName.includes(normalizedSearch) ||
                    email.includes(normalizedSearch) ||
                    displayName.split(' ').some(namePart => namePart.startsWith(normalizedSearch)) ||
                    (email && email.split('@')[0].includes(normalizedSearch))
                );
            });

            console.log("Filtered users:", searchedUsers);

            // Update state
            setUsers(searchedUsers);

            // Provide feedback if no users found
            if (searchedUsers.length === 0) {
                setError("No users found matching your search");
            }

            setSearching(false);
        } catch (error) {
            console.error("Error searching users:", error);
            setError("Failed to search users. Please check console for details.");
            setSearching(false);
        }
    };

    // Fallback function to show all users (for debugging)
    const showAllUsers = async () => {
        try {
            setSearching(true);
            setError(null);

            const userProfilesRef = collection(firestore, "userProfiles");
            const querySnapshot = await getDocs(userProfilesRef);

            const allUsers = querySnapshot.docs
                .map(doc => ({
                    uid: doc.id,
                    ...doc.data()
                }))
                .filter(user => user.uid !== auth.currentUser?.uid);

            console.log("All available users:", allUsers);
            setUsers(allUsers);
            setSearching(false);

            if (allUsers.length === 0) {
                setError("No user profiles found in the database");
            }
        } catch (error) {
            console.error("Error fetching all users:", error);
            setError("Failed to fetch users. Please check console for details.");
            setSearching(false);
        }
    };

    // Start a new direct message chat (unchanged from previous implementation)
    const startChat = async (userId) => {
        try {
            const chatsRef = collection(firestore, "chats");

            const q1 = query(
                chatsRef,
                where("participants", "array-contains", auth.currentUser.uid),
                where("type", "==", "direct")
            );

            const querySnapshot = await getDocs(q1);

            let existingChat = null;

            querySnapshot.forEach((doc) => {
                const chatData = doc.data();
                if (chatData.participants.includes(userId)) {
                    existingChat = {
                        id: doc.id,
                        ...chatData
                    };
                }
            });

            if (existingChat) {
                onChatCreated(existingChat.id);
                return;
            }

            const newChatRef = await addDoc(chatsRef, {
                type: "direct",
                participants: [auth.currentUser.uid, userId],
                createdAt: serverTimestamp(),
                lastMessageTime: serverTimestamp(),
                lastMessage: "No messages yet"
            });

            onChatCreated(newChatRef.id);
        } catch (error) {
            console.error("Error starting chat:", error);
            setError("Failed to start conversation. Please try again.");
        }
    };

    return (
        <div className="new-dm-overlay">
            <div className="new-dm-container">
                <div className="new-dm-header">
                    <h2>New Conversation</h2>
                    <button
                        className="close-button"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Search by username or email..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && searchUsers()}
                        className="search-input"
                    />
                    <button
                        className="search-button"
                        onClick={searchUsers}
                        disabled={searching || !searchText.trim()}
                    >
                        {searching ? "Searching..." : "Search"}
                    </button>
                    <button
                        className="show-all-button"
                        onClick={showAllUsers}
                        disabled={searching}
                    >
                        Show All
                    </button>
                </div>

                {error && <p className="error-message">{error}</p>}

                <div className="users-list">
                    {users.map((user) => (
                        <div
                            key={user.uid}
                            className="user-item"
                            onClick={() => startChat(user.uid)}
                        >
                            <div className="avatar-wrapper">
                                <img
                                    src={user.photoURL || getAvatarForUser(user.uid, false)}
                                    alt={user.displayName || "User"}
                                    className="user-avatar"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = "https://ui-avatars.com/api/?name=?&background=808080&color=fff";
                                    }}
                                />
                                <StatusDot userId={user.uid} />
                            </div>
                            <div className="user-details">
                                <span className="user-name">{user.displayName || "User"}</span>
                                {/* Only show email if user hasn't hidden it */}
                                {user.email && !user.hideEmail && (
                                    <span className="user-email">{user.email}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}