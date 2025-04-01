import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, query, where, onSnapshot, orderBy, doc, getDoc } from "firebase/firestore";
import { getAvatarForUser } from "./UserProfile";
import { NewDirectMessage } from "./NewDirectMessage"; // Added this import

export function Sidebar({ onSelectChat, currentChatId }) {
    const [isOpen, setIsOpen] = useState(false);
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const auth = getAuth();
    const firestore = getFirestore();

    // Toggle sidebar
    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

    // Fetch conversations (both direct messages and global chat)
    useEffect(() => {
        if (!auth.currentUser) return;

        const fetchConversations = async () => {
            try {
                setLoading(true);

                // Add global chat as the first item
                const globalChat = {
                    id: "global",
                    name: "Global Chat",
                    type: "global",
                    lastMessage: "Everyone is welcome here",
                    lastMessageTime: new Date(),
                    unreadCount: 0,
                };

                // Create a query for direct message chats where the current user is a participant
                const chatsRef = collection(firestore, "chats");
                const userChatsQuery = query(
                    chatsRef,
                    where("participants", "array-contains", auth.currentUser.uid),
                    orderBy("lastMessageTime", "desc")
                );

                // Listen for changes to the user's chats
                const unsubscribe = onSnapshot(userChatsQuery, async (snapshot) => {
                    const chatsData = [];

                    // Process each chat
                    for (const chatDoc of snapshot.docs) {
                        const chatData = chatDoc.data();

                        // Skip group chats if they're implemented later
                        if (chatData.type !== "direct") continue;

                        // Find the other participant (not the current user)
                        const otherParticipantId = chatData.participants.find(
                            (id) => id !== auth.currentUser.uid
                        );

                        // Get the other user's profile data
                        let otherUserName = "Unknown User";
                        let otherUserPhotoURL = null;

                        try {
                            const userProfileDoc = await getDoc(doc(firestore, "userProfiles", otherParticipantId));

                            if (userProfileDoc.exists()) {
                                otherUserName = userProfileDoc.data().displayName || "User";
                                otherUserPhotoURL = userProfileDoc.data().photoURL;
                            }
                        } catch (error) {
                            console.error("Error fetching user profile:", error);
                        }

                        // Add the chat to the list
                        chatsData.push({
                            id: chatDoc.id,
                            name: otherUserName,
                            photoURL: otherUserPhotoURL,
                            type: "direct",
                            lastMessage: chatData.lastMessage || "No messages yet",
                            lastMessageTime: chatData.lastMessageTime?.toDate() || new Date(),
                            unreadCount: 0, // You can implement unread counts later
                            otherParticipantId: otherParticipantId
                        });
                    }

                    // Combine global chat with direct message chats
                    setConversations([globalChat, ...chatsData]);
                    setLoading(false);
                });

                return unsubscribe;
            } catch (error) {
                console.error("Error fetching conversations:", error);
                setLoading(false);
            }
        };

        fetchConversations();
    }, [auth.currentUser, firestore]);

    // Select a chat
    const selectChat = (chatId) => {
        onSelectChat(chatId);
        // On mobile, close the sidebar after selection
        if (window.innerWidth <= 768) {
            setIsOpen(false);
        }
    };

    // Show new DM UI
    const [showNewDmUI, setShowNewDmUI] = useState(false);

    return (
        <>
            {/* Burger Menu Button */}
            <button
                className="menu-toggle"
                onClick={toggleSidebar}
                aria-label={isOpen ? "Close menu" : "Open menu"}
            >
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    {isOpen ? (
                        <path d="M18 6L6 18M6 6l12 12" />
                    ) : (
                        <>
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </>
                    )}
                </svg>
            </button>

            {/* Sidebar */}
            <div className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h2>Conversations</h2>
                    <button
                        className="new-chat-button"
                        onClick={() => setShowNewDmUI(true)}
                        aria-label="New conversation"
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>New Chat</span>
                    </button>
                </div>

                {loading ? (
                    <div className="sidebar-loading">Loading conversations...</div>
                ) : (
                    <div className="conversations-list">
                        {conversations.map((chat) => (
                            <div
                                key={chat.id}
                                className={`conversation-item ${currentChatId === chat.id ? 'active' : ''}`}
                                onClick={() => selectChat(chat.id)}
                            >
                                {chat.type === "global" ? (
                                    <div className="conversation-avatar global">
                                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="2" y1="12" x2="22" y2="12" />
                                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                        </svg>
                                    </div>
                                ) : (
                                    <img
                                        src={chat.photoURL || getAvatarForUser(chat.otherParticipantId, false)}
                                        alt={chat.name}
                                        className="conversation-avatar"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = "https://ui-avatars.com/api/?name=?&background=808080&color=fff";
                                        }}
                                    />
                                )}

                                <div className="conversation-details">
                                    <div className="conversation-top">
                                        <span className="conversation-name">{chat.name}</span>
                                        {chat.lastMessageTime && (
                                            <span className="conversation-time">
                                                {formatTime(chat.lastMessageTime)}
                                            </span>
                                        )}
                                    </div>
                                    <p className="conversation-last-message">{chat.lastMessage}</p>
                                </div>

                                {chat.unreadCount > 0 && (
                                    <div className="unread-badge">{chat.unreadCount}</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Overlay when sidebar is open on mobile */}
            {isOpen && window.innerWidth <= 768 && (
                <div className="sidebar-overlay" onClick={toggleSidebar} />
            )}

            {/* New DM UI */}
            {showNewDmUI && (
                <NewDirectMessage
                    onClose={() => setShowNewDmUI(false)}
                    onChatCreated={(chatId) => {
                        selectChat(chatId);
                        setShowNewDmUI(false);
                    }}
                />
            )}
        </>
    );
}

// Helper function to format the last message time
function formatTime(date) {
    if (!date) return '';

    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // If less than 24 hours, show the time
    if (diff < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // If less than 7 days, show the day name
    if (diff < 7 * 24 * 60 * 60 * 1000) {
        return date.toLocaleDateString([], { weekday: 'short' });
    }

    // Otherwise show the date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}