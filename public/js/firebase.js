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
    window.createUserProfile = createUserProfile;

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
              // Only send verification email, don't create profile yet
              return userCredential.user.sendEmailVerification();
          })
          .then(() => {
              // Sign out the user after sending verification
              return auth.signOut();
          })
          .catch((error) => {
              console.error('Error signing up:', error);
              alert(error.message);
              return Promise.reject(error);
          });
     }

     async function createUserProfile(user) {
      try {
        // Check if profile already exists to prevent duplicate creation
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          console.log('User profile already exists');
          return;
        }

        let userData = {
          uid: user.uid,
          email: user.email.toLowerCase(),
          role: 'user',
          clubAffiliations: [],
          displayName: user.email.split('@')[0], // Default display name
          profilePicture: 'https://firebasestorage.googleapis.com/v0/b/etown-clubhub.appspot.com/o/default_bluejay.jpg?alt=media',
        };

        // Check for superadmin
        if (['islamm@etown.edu', 'smithm6@etown.edu'].includes(user.email.toLowerCase())) {
          userData.role = 'superadmin';
        } else {
          // Check for club admin
          const clubSnapshot = await db.collection('clubs')
            .where('email', '==', user.email.toLowerCase())
            .get();

          if (!clubSnapshot.empty) {
            const clubDoc = clubSnapshot.docs[0];
            const clubData = clubDoc.data();

            userData.role = 'clubAdmin';
            userData.displayName = clubData.name;
            userData.clubAffiliations = [clubDoc.id];
          }
        }

        // Save the user profile first
        await db.collection('users').doc(user.uid).set(userData);
        console.log('User profile created successfully');

        await user.updateProfile({
          displayName: userData.displayName,
          photoURL: userData.profilePicture
        });
        await user.reload();

        // Now that the user's profile exists, proceed to update other collections
        if (userData.role === 'clubAdmin') {
          const clubId = userData.clubAffiliations[0];

          // Update club verification
          await db.collection('clubs').doc(clubId).update({
            isVerified: true,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
          });

          // Create/update public club profile
          await db.collection('publicClubProfiles').doc(user.uid).set({
            clubName: userData.displayName,
            profilePicture: userData.profilePicture,
            lastFeatured: firebase.firestore.FieldValue.serverTimestamp(),
          });
        }
      } catch (error) {
        console.error('Error creating user profile:', error);
        throw error;
      }
    }


    function signIn(email, password) {
      return auth.signInWithEmailAndPassword(email, password)
          .then((userCredential) => {
              if (!userCredential.user.emailVerified) {
                  alert('Please verify your email before signing in.');
                  auth.signOut();
                  return Promise.reject(new Error('Email not verified.'));
              }
              return userCredential;
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