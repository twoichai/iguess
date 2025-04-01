import { useRef, useState, useEffect } from "react";
import {
    getFirestore,
    collection,
    query,
    orderBy,
    limit,
    addDoc,
    doc,
    getDoc,
    updateDoc,
    serverTimestamp,
    onSnapshot
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAvatarForUser } from "./UserProfile";
import { ChatMessage } from "./ChatComponents";

export function DirectMessage({ chatId }) {
    const auth = getAuth();
    const firestore = getFirestore();
    const [formValue, setFormValue] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chatData, setChatData] = useState(null);
    const [otherUser, setOtherUser] = useState(null);
    const dummy = useRef();

    // Fetch chat data and messages
    useEffect(() => {
        if (!auth.currentUser || !chatId) return;

        const fetchChatData = async () => {
            try {
                // Get chat data
                const chatDocRef = doc(firestore, "chats", chatId);
                const chatDoc = await getDoc(chatDocRef);

                if (!chatDoc.exists()) {
                    console.error("Chat not found");
                    setLoading(false);
                    return;
                }

                const chat = {
                    id: chatDoc.id,
                    ...chatDoc.data()
                };

                setChatData(chat);

                // Find the other participant
                const otherParticipantId = chat.participants.find(
                    (id) => id !== auth.currentUser.uid
                );

                // Fetch the other user's profile
                if (otherParticipantId) {
                    const userProfileDoc = await getDoc(doc(firestore, "userProfiles", otherParticipantId));

                    if (userProfileDoc.exists()) {
                        setOtherUser({
                            uid: userProfileDoc.id,
                            ...userProfileDoc.data()
                        });
                    }
                }

                // Set up message listener
                const messagesRef = collection(firestore, "chats", chatId, "messages");
                const q = query(messagesRef, orderBy("createdAt"), limit(50));

                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const messagesData = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    setMessages(messagesData);
                    setLoading(false);

                    // Scroll to bottom whenever messages change
                    setTimeout(() => {
                        dummy.current?.scrollIntoView({ behavior: "smooth" });
                    }, 100);
                });

                return unsubscribe;
            } catch (error) {
                console.error("Error fetching chat data:", error);
                setLoading(false);
            }
        };

        fetchChatData();
    }, [auth.currentUser, chatId, firestore]);

    // Send a message
    const sendMessage = async (e) => {
        e.preventDefault();
        if (!formValue.trim() || !chatId) return;

        try {
            const { uid } = auth.currentUser;

            // Get user profile for the display name
            let displayName = "User";
            const userProfileDoc = await getDoc(doc(firestore, "userProfiles", uid));

            if (userProfileDoc.exists()) {
                displayName = userProfileDoc.data().displayName || "User";
            }

            // Get photoURL but handle anonymous users differently
            const photoURL = auth.currentUser.isAnonymous ?
                getAvatarForUser(uid, true) :
                auth.currentUser.photoURL;

            // Add the message to the chat's messages subcollection
            await addDoc(collection(firestore, "chats", chatId, "messages"), {
                text: formValue,
                createdAt: serverTimestamp(),
                uid,
                photoURL,
                displayName
            });

            // Update the chat document with the last message preview and timestamp
            await updateDoc(doc(firestore, "chats", chatId), {
                lastMessage: formValue.length > 30 ? `${formValue.substring(0, 30)}...` : formValue,
                lastMessageTime: serverTimestamp(),
                lastMessageSender: uid
            });

            // Clear the input and scroll to bottom
            setFormValue('');
            dummy.current.scrollIntoView({ behavior: "smooth" });
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    return (
        <div className="direct-message-container">
            {/* Chat Header */}
            {otherUser && (
                <div className="direct-message-header">
                    <img
                        src={otherUser.photoURL || getAvatarForUser(otherUser.uid, false)}
                        alt={otherUser.displayName || "User"}
                        className="dm-header-avatar"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://ui-avatars.com/api/?name=?&background=808080&color=fff";
                        }}
                    />
                    <div className="dm-header-info">
                        <h3>{otherUser.displayName || "User"}</h3>
                        {/* You can add user status here if implemented */}
                    </div>
                </div>
            )}

            {/* Messages */}
            <main className="messages-container">
                {loading ? (
                    <div className="loading-messages">Loading messages...</div>
                ) : messages.length === 0 ? (
                    <div className="no-messages">
                        <p>No messages yet. Say hello!</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <ChatMessage key={msg.id} message={msg} />
                    ))
                )}
                <div ref={dummy}></div>
            </main>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="message-form">
                <input
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    placeholder="Type a message..."
                    className="message-input"
                />
                <button type="submit" disabled={!formValue.trim()} className="send-button">
                    🕊️
                </button>
            </form>
        </div>
    );
}