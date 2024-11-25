"use strict";

(function () {
    async function handleContactSubmit(e) {
        e.preventDefault();
        
        const submitButton = document.getElementById('contactSubmitButton');
        submitButton.disabled = true;
        
        try {
            const currentUser = firebase.auth().currentUser;
            
            // Get form values
            let name, email, userId;
            
            if (currentUser) {
                // For logged in users, use their profile info
                name = currentUser.displayName || currentUser.email.split('@')[0];
                email = currentUser.email;
                userId = currentUser.uid;
            } else {
                // For anonymous users, get from form
                name = document.getElementById('nameInput').value.trim();
                email = document.getElementById('emailInput').value.trim();
                userId = 'anonymous_' + Date.now(); // Create a unique anonymous ID
                
                // Email validation for anonymous users
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    throw new Error('Please enter a valid email address');
                }
            }
            
            const message = document.getElementById('messageInput').value.trim();
            
            // Basic validation
            if (!message) {
                throw new Error('Please enter a message');
            }
            
            // Check for spam (anonymous users only)
            if (!currentUser) {
                const todayStart = new Date();
                todayStart.setHours(0,0,0,0);
                
                const messagesQuery = await db.collection('messages')
                    .where('sender.email', '==', email)
                    .where('timestamp', '>=', todayStart)
                    .get();
                
                if (messagesQuery.size >= 3) {
                    throw new Error('Maximum daily message limit reached. Please try again tomorrow.');
                }
            }

            // Get specific superadmin by email
            const superadminSnapshot = await db.collection('users')
                .where('email', '==', 'islamm@etown.edu')
                .limit(1)
                .get();
            
            if (superadminSnapshot.empty) {
                throw new Error('Support system temporarily unavailable');
            }

            const superadminId = superadminSnapshot.docs[0].id;
            let conversationId;

            if (currentUser) {
                // Check for existing conversation with superadmin
                const existingConvSnapshot = await db.collection('conversations')
                    .where('participants', 'array-contains', currentUser.uid)
                    .where('participants', 'array-contains', superadminId)
                    .get();

                if (!existingConvSnapshot.empty) {
                    conversationId = existingConvSnapshot.docs[0].id;
                }
            }

            if (!conversationId) {
                // Create new conversation
                const conversationRef = await db.collection('conversations').add({
                    participants: [userId, superadminId],
                    participantRoles: {
                        [userId]: currentUser ? 'user' : 'anonymous',
                        [superadminId]: 'superadmin'
                    },
                    created: firebase.firestore.FieldValue.serverTimestamp(),
                    lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                    participantDetails: {
                        [userId]: {
                            name: name,
                            email: email,
                            isAnonymous: !currentUser
                        },
                        [superadminId]: {
                            name: 'Support Team',
                            email: 'islamm@etown.edu',
                            role: 'superadmin'
                        }
                    },
                    type: 'support',
                    unreadBy: [superadminId]
                });
                
                conversationId = conversationRef.id;
            }

            // Add message to conversation
            await db.collection('conversations').doc(conversationId)
                .collection('messages').add({
                    message: message,
                    senderId: userId,
                    senderName: name,
                    senderEmail: email,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'sent',
                    type: 'support'
                });

            // Update conversation metadata
            await db.collection('conversations').doc(conversationId).update({
                lastMessage: message,
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                unreadBy: firebase.firestore.FieldValue.arrayUnion(superadminId)
            });
            
            // Clear form and show success
            document.getElementById('contactForm').reset();
            alert('Message sent successfully! We will respond to your inquiry soon.');
            
        } catch (error) {
            console.error('Error sending message:', error);
            alert(error.message || 'Error sending message. Please try again.');
        } finally {
            submitButton.disabled = false;
        }
    }

    function initMessageListeners() {
        const contactForm = document.getElementById('contactForm');
        if (!contactForm) return;

        // Setup form based on auth state
        firebase.auth().onAuthStateChanged(user => {
            const nameInput = document.getElementById('nameInput');
            const emailInput = document.getElementById('emailInput');
            const nameGroup = nameInput?.parentElement;
            const emailGroup = emailInput?.parentElement;

            if (user) {
                // Hide name/email fields for logged in users
                if (nameGroup) nameGroup.style.display = 'none';
                if (emailGroup) emailGroup.style.display = 'none';
                
                // Pre-fill hidden fields
                if (nameInput) nameInput.value = user.displayName || user.email.split('@')[0];
                if (emailInput) emailInput.value = user.email;
            } else {
                // Show name/email fields for anonymous users
                if (nameGroup) nameGroup.style.display = 'block';
                if (emailGroup) emailGroup.style.display = 'block';
                
                // Clear fields
                if (nameInput) nameInput.value = '';
                if (emailInput) emailInput.value = '';
            }
        });

        contactForm.addEventListener('submit', handleContactSubmit);
    }

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', initMessageListeners);

    // Expose necessary functions to global scope
    window.initMessageListeners = initMessageListeners;
})();