"use strict";

(function () {
    let currentConversation = null;
    let unsubscribeListener = null;

    // Wait for auth state before initializing
    firebase.auth().onAuthStateChanged((user) => {
        if (user && user.emailVerified) {
            console.log('Auth state changed, user:', user.uid);
            initializeChat();
            setupEventListeners();
        } else {
            console.log('No authenticated user, redirecting...');
            window.location.href = '/';
        }
    });

    function setupEventListeners() {
        const messageForm = document.getElementById('messageForm');
        if (messageForm) {
            messageForm.addEventListener('submit', handleMessageSubmit);
        }

        const userSearch = document.getElementById('userSearch');
        if (userSearch) {
            userSearch.addEventListener('input', debounce(handleSearch, 300));
        }
    }

    async function initializeChat() {
        try {
            const user = firebase.auth().currentUser;
            if (!user) return;

            console.log('Initializing chat for user:', user.uid);
            showEmptyState();

            const conversationsList = document.getElementById('conversationsList');
            if (!conversationsList) {
                console.error('Conversations list element not found');
                return;
            }

            // Initial loading state
            conversationsList.innerHTML = '<div class="text-center p-3">Loading conversations...</div>';

            // Set up conversations listener
            const conversationsQuery = db.collection('conversations')
                .where('participants', 'array-contains', user.uid)
                .orderBy('lastMessageTime', 'desc');

            conversationsQuery.onSnapshot(async (snapshot) => {
                console.log('Got conversations snapshot, size:', snapshot.size);
                
                if (snapshot.empty) {
                    conversationsList.innerHTML = `
                        <div class="text-center p-3 text-muted">
                            No conversations yet
                        </div>
                    `;
                    return;
                }

                let conversationsHTML = '';
                const conversationPromises = snapshot.docs.map(async (doc) => {
                    const data = doc.data();
                    const otherParticipant = data.participants.find(p => p !== user.uid);
                    
                    // Get other participant's details
                    const otherUser = await db.collection('users').doc(otherParticipant).get();
                    const otherUserData = otherUser.data();
                    
                    const hasUnread = data.unreadBy?.includes(user.uid);
                    
                    return `
                        <div class="conversation-item ${hasUnread ? 'unread' : ''} ${currentConversation === doc.id ? 'active' : ''}"
                             onclick="selectConversation('${doc.id}')">
                            <div class="d-flex align-items-center">
                                <img src="${otherUserData.profilePicture || '/images/default_profile.png'}" 
                                     class="rounded-circle me-2" style="width: 40px; height: 40px; object-fit: cover;">
                                <div>
                                    <div class="fw-bold">${otherUserData.displayName}</div>
                                    <small class="text-muted">${data.lastMessage?.substring(0, 30)}${data.lastMessage?.length > 30 ? '...' : ''}</small>
                                </div>
                            </div>
                        </div>
                    `;
                });

                // Wait for all promises to resolve
                const conversationElements = await Promise.all(conversationPromises);
                conversationsHTML = conversationElements.join('');
                
                console.log('Updating conversations list HTML');
                conversationsList.innerHTML = conversationsHTML;
            }, error => {
                console.error('Error in conversations listener:', error);
                conversationsList.innerHTML = `
                    <div class="text-center p-3 text-danger">
                        Error loading conversations
                    </div>
                `;
            });

        } catch (error) {
            console.error('Error in initializeChat:', error);
        }
    }

    async function loadConversations() {
        const conversationsList = document.getElementById('conversationsList');
        if (!conversationsList) return;
    
        try {
            const user = firebase.auth().currentUser;
            
            // Query for conversations where user is participant
            const conversationsQuery = db.collection('conversations')
                .where('participants', 'array-contains', user.uid)
                .orderBy('lastMessageTime', 'desc');
    
            // Set up real-time listener
            conversationsQuery.onSnapshot(async (snapshot) => {
                let html = '';
                
                // Use docs instead of docChanges to get all documents
                for (const doc of snapshot.docs) {
                    const data = doc.data();
                    const otherParticipant = data.participants.find(p => p !== user.uid);
                    
                    // Get other participant's details
                    const otherUser = await db.collection('users').doc(otherParticipant).get();
                    const otherUserData = otherUser.data();
                    
                    const hasUnread = data.unreadBy?.includes(user.uid);
                    
                    html += `
                        <div class="conversation-item ${hasUnread ? 'unread' : ''} ${currentConversation === doc.id ? 'active' : ''}"
                             onclick="selectConversation('${doc.id}')">
                            <div class="d-flex align-items-center">
                                <img src="${otherUserData.profilePicture || '/images/default_profile.png'}" 
                                     class="rounded-circle me-2" style="width: 40px; height: 40px; object-fit: cover;">
                                <div>
                                    <div class="fw-bold">${otherUserData.displayName}</div>
                                    <small class="text-muted">${data.lastMessage?.substring(0, 30)}${data.lastMessage?.length > 30 ? '...' : ''}</small>
                                </div>
                            </div>
                        </div>
                    `;
                }
    
                conversationsList.innerHTML = html;
            });
    
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }

    async function updateChatHeader(conversationId) {
        const chatHeader = document.getElementById('chatHeader');
        const messageForm = document.getElementById('messageForm');
        
        try {
            const conversationDoc = await db.collection('conversations').doc(conversationId).get();
            const data = conversationDoc.data();
            const currentUser = firebase.auth().currentUser;
            
            // Get other participant's ID
            const otherUserId = data.participants.find(id => id !== currentUser.uid);
            
            // Get other user's details
            const otherUserDoc = await db.collection('users').doc(otherUserId).get();
            const otherUserData = otherUserDoc.data();
            
            chatHeader.innerHTML = `
                <div class="d-flex align-items-center">
                    <img src="${otherUserData.profilePicture || '/images/default_profile.png'}" 
                         class="rounded-circle me-2" 
                         style="width: 40px; height: 40px; object-fit: cover;">
                    <div>
                        <h6 class="mb-0">${otherUserData.displayName}</h6>
                    </div>
                </div>
            `;
            
            // Show message form
            if (messageForm) messageForm.style.display = 'flex';
        } catch (error) {
            console.error('Error updating chat header:', error);
            chatHeader.innerHTML = '<div class="text-danger">Error loading chat details</div>';
        }
    }

    async function selectConversation(conversationId) {
        currentConversation = conversationId;
        
        if (unsubscribeListener) {
            unsubscribeListener();
        }

        const messagesArea = document.getElementById('messagesArea');
        if (!messagesArea) return;

        try {
            // Clear previous messages
            messagesArea.innerHTML = '';
            
            // Update chat header
            await updateChatHeader(conversationId);
            
            // Mark conversation as read
            await markConversationAsRead(conversationId);

            // Update UI to show selected conversation
            document.querySelectorAll('.conversation-item').forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('onclick').includes(conversationId)) {
                    item.classList.remove('unread');
                    item.classList.add('active');
                }
            });

            // Set up real-time listener for messages
            const messagesQuery = db.collection('conversations').doc(conversationId)
                .collection('messages')
                .orderBy('timestamp', 'asc');

            unsubscribeListener = messagesQuery.onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        appendMessage(data);
                    }
                });
                
                // Scroll to bottom
                messagesArea.scrollTop = messagesArea.scrollHeight;
            });

        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    function appendMessage(messageData) {
        const messagesArea = document.getElementById('messagesArea');
        if (!messagesArea) return;

        const currentUser = firebase.auth().currentUser;
        const isSent = messageData.senderId === currentUser.uid;
        const date = messageData.timestamp?.toDate().toLocaleString() || 'Just now';

        const messageElement = document.createElement('div');
        messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
        messageElement.innerHTML = `
            <div class="message-content">${messageData.message}</div>
            <div class="message-time">${date}</div>
            ${isSent ? `<div class="message-status">${messageData.status || 'sent'}</div>` : ''}
        `;

        messagesArea.appendChild(messageElement);
    }

    async function handleMessageSubmit(e) {
        e.preventDefault();

        if (!currentConversation) {
            alert('Please select a conversation first');
            return;
        }

        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        if (!message) return;

        try {
            const user = firebase.auth().currentUser;
            const conversationRef = db.collection('conversations').doc(currentConversation);
            
            // Add message to conversation
            await conversationRef.collection('messages').add({
                message: message,
                senderId: user.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'sent'
            });

            // Update conversation metadata
            await conversationRef.update({
                lastMessage: message,
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                unreadBy: firebase.firestore.FieldValue.arrayUnion(
                    // Add all participants except current user
                    ...(await conversationRef.get()).data().participants.filter(p => p !== user.uid)
                )
            });

            messageInput.value = '';

        } catch (error) {
            console.error('Error sending message:', error);
            alert('Error sending message');
        }
    }

    async function handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase().trim();
        const searchResults = document.getElementById('searchResults');
        
        if (!searchTerm) {
            searchResults.innerHTML = '';
            return;
        }

        try {
            // Search for users and clubs
            const usersQuery = await db.collection('users')
                .where('role', 'in', ['user', 'clubAdmin'])
                .get();

            let html = '';
            usersQuery.forEach(doc => {
                const userData = doc.data();
                if (userData.displayName.toLowerCase().includes(searchTerm)) {
                    html += `
                        <div class="p-2 border-bottom" style="cursor: pointer" 
                             onclick="startConversation('${doc.id}')">
                            <div class="d-flex align-items-center">
                                <img src="${userData.profilePicture || '/images/default_profile.png'}" 
                                     class="rounded-circle me-2"
                                     style="width: 30px; height: 30px; object-fit: cover;">
                                <span>${userData.displayName}</span>
                            </div>
                        </div>
                    `;
                }
            });

            searchResults.innerHTML = html || '<div class="p-2">No results found</div>';

        } catch (error) {
            console.error('Error searching:', error);
            searchResults.innerHTML = '<div class="p-2 text-danger">Error searching</div>';
        }
    }

    async function startConversation(userId) {
        try {
            const currentUser = firebase.auth().currentUser;
            
            // Get current user's role
            const currentUserDoc = await db.collection('users').doc(currentUser.uid).get();
            const currentUserData = currentUserDoc.data();
            
            // Get other user's details
            const otherUserDoc = await db.collection('users').doc(userId).get();
            const otherUserData = otherUserDoc.data();
            
            // Check permissions
            if (currentUserData.role !== 'superadmin' && 
                currentUserData.role !== 'clubAdmin' && 
                otherUserData.role !== 'clubAdmin') {
                throw new Error('Regular users can only message clubs');
            }
            
            // Check if conversation already exists
            const existingConversation = await db.collection('conversations')
                .where('participants', 'array-contains', currentUser.uid)
                .get();
    
            let conversationId;
    
            if (!existingConversation.empty) {
                // Find the conversation with the target user
                const conversation = existingConversation.docs.find(doc => 
                    doc.data().participants.includes(userId)
                );
                if (conversation) {
                    conversationId = conversation.id;
                }
            }
    
            if (!conversationId) {
                // Create new conversation
                const conversationRef = await db.collection('conversations').add({
                    participants: [currentUser.uid, userId],
                    participantRoles: {
                        [currentUser.uid]: currentUserData.role,
                        [userId]: otherUserData.role
                    },
                    created: firebase.firestore.FieldValue.serverTimestamp(),
                    lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                    participantDetails: {
                        [currentUser.uid]: {
                            name: currentUserData.displayName || currentUser.email,
                            role: currentUserData.role
                        },
                        [userId]: {
                            name: otherUserData.displayName,
                            role: otherUserData.role
                        }
                    }
                });
                
                conversationId = conversationRef.id;
                
                // Add initial system message
                await conversationRef.collection('messages').add({
                    message: `Chat started between ${currentUserData.displayName} and ${otherUserData.displayName}`,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    type: 'system'
                });
            }
    
            // Close modal and select conversation
            const modal = bootstrap.Modal.getInstance(document.getElementById('newMessageModal'));
            if (modal) modal.hide();
            
            // Select and show the conversation
            await selectConversation(conversationId);
            
            // Update conversations list
            await loadConversations();
    
        } catch (error) {
            console.error('Error starting conversation:', error.message);
            alert(`Error starting conversation: ${error.message}`);
        }
    }

    async function markConversationAsRead(conversationId) {
        try {
            const user = firebase.auth().currentUser;
            await db.collection('conversations').doc(conversationId).update({
                unreadBy: firebase.firestore.FieldValue.arrayRemove(user.uid)
            });
        } catch (error) {
            console.error('Error marking conversation as read:', error);
        }
    }

    function showEmptyState() {
        const chatHeader = document.getElementById('chatHeader');
        const messagesArea = document.getElementById('messagesArea');
        const messageForm = document.getElementById('messageForm');

        if (chatHeader) chatHeader.innerHTML = '';
        if (messagesArea) messagesArea.innerHTML = `
            <div class="h-100 d-flex align-items-center justify-content-center text-muted">
                Select a conversation or start a new one
            </div>
        `;
        if (messageForm) messageForm.style.display = 'none';
    }

    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Expose necessary functions to global scope
    window.selectConversation = selectConversation;
    window.startConversation = startConversation;
    window.handleSearch = handleSearch;
    window.handleMessageSubmit = handleMessageSubmit;

})();