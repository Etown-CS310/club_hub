(function() {
    "use strict";

    //Firebase configuration
    const firebaseConfig = {
    apiKey: "AIzaSyCGi5qq6n5UOi9bjn94y90-tuaVXmPlZB0",
    authDomain: "etown-clubhub.firebaseapp.com",
    projectId: "etown-clubhub",
    storageBucket: "etown-clubhub.appspot.com",
    messagingSenderId: "46415967469",
    appId: "1:46415967469:web:f5fd332f05f698fdfb48e4"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);

    // Initialize Firebase services
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    // Expose to global scope
    window.auth = auth;
    window.db = db;
    window.signIn = signIn;
    window.signOut = signOut;
    window.signUp = signUp;
    window.resetPassword = resetPassword;

    function isAllowedEmail(email) {
        return email.endsWith('@etown.edu');
    }

    function signUp(email, password) {
        if (!isAllowedEmail(email)) {
          alert('Please use your school email to register.');
          return;
        }
      
        return auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
        // Send email verification
        return userCredential.user.sendEmailVerification()
            .then(() => {
            // Create user profile after verification email is sent
            return createUserProfile(userCredential.user);
            })
            .then(() => {
            // Sign out the user after registration
            return auth.signOut();
            });
        })
        .catch((error) => {
        console.error('Error signing up:', error);
        alert(error.message);
        return Promise.reject(error);
        });
    }

    function createUserProfile(user) {
        const userRef = db.collection('users').doc(user.uid);
      
        // Determine role based on email
        let role = 'user';
        if (user.email === 'islamm@etown.edu' || user.email === 'smithm6@etown.edu'|| user.email === 'csclub@etown.edu') {
          role = 'clubAdmin';
        }
      
        return userRef.set({
          uid: user.uid,
          email: user.email,
          role: role,
          displayName: user.email.split('@')[0],
          // Add other profile info 
        });
    }

    function signIn(email, password) {
        return auth.signInWithEmailAndPassword(email, password)
          .then((userCredential) => {
            if (!userCredential.user.emailVerified) {
              alert('Please verify your email before signing in.');
              auth.signOut();
              return Promise.reject(new Error('Email not verified.'));
            } else {
              // User is signed in
              console.log('User signed in:', userCredential.user);
              return userCredential;
            }
          })
          .catch((error) => {
            console.error('Error signing in:', error);
            alert(error.message);
            return Promise.reject(error);
          });
      }
    
    function signOut() {
    auth.signOut()
        .then(() => {
        // Sign-out successful
        // Redirect or update UI
        console.log('User signed out');
        })
        .catch((error) => {
        console.error('Error signing out:', error);
        });
    }

    function resetPassword(email) {
      return auth.sendPasswordResetEmail(email)
        .then(() => {
          alert('Password reset email sent. Please check your inbox.');
          // Close the reset password modal
          const resetPassModalEl = document.getElementById('resetPassModal');
          const resetPassModal = bootstrap.Modal.getInstance(resetPassModalEl);
          resetPassModal.hide();
          // Open the login modal
          const loginModalEl = document.getElementById('loginModal');
          const loginModal = new bootstrap.Modal(loginModalEl);
          loginModal.show();
        })
        .catch((error) => {
          console.error('Error sending password reset email:', error);
          alert(error.message);
        });
    }


}) ();