"use strict";

(function () {
    // Handle contact form submissions and general messaging
    async function handleContactSubmit(e) {
        e.preventDefault();
        
        const submitButton = document.getElementById('contactSubmitButton');
        submitButton.disabled = true;
        
        try {
            const currentUser = firebase.auth().currentUser;
            
            // Get form values
            let name, email;
            
            if (currentUser) {
                // For logged in users, use their profile info
                name = currentUser.displayName || currentUser.email.split('@')[0];
                email = currentUser.email;
            } else {
                // For anonymous users, get from form
                name = document.getElementById('nameInput').value.trim();
                email = document.getElementById('emailInput').value.trim();
                
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
            
            // Create message object
            const messageData = {
                sender: {
                    name: name,
                    email: email,
                    id: currentUser ? currentUser.uid : 'anonymous'
                },
                recipients: ['superadmin'], // Contact form messages always go to superadmins
                message: message,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'unread',
                type: 'contact',
                isAuthenticated: !!currentUser,
                dateKey: new Date().toISOString().split('T')[0]
            };
            
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
            
            // Save to Firestore
            await db.collection('messages').add(messageData);
            
            // Clear form and show success
            document.getElementById('contactForm').reset();
            alert('Message sent successfully! We will get back to you soon.');
            
        } catch (error) {
            console.error('Error sending message:', error);
            alert(error.message || 'Error sending message. Please try again.');
        } finally {
            submitButton.disabled = false;
        }
    }

    // Initialize message event listeners and form state
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