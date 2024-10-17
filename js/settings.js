(function() {
  "use strict";
  document.addEventListener('DOMContentLoaded', function() {
    const userInfoForm = document.getElementById('userInfoForm');
    const changePasswordForm = document.getElementById('changePasswordForm');
    const notificationsForm = document.getElementById('notificationsForm');
    const profilePictureInput = document.getElementById('profilePictureInput');
    const profilePicturePreview = document.getElementById('profilePicturePreview');

    const MAX_FILE_SIZE = 1 * 512 * 512; // 250kb
    const DEFAULT_PROFILE_PICTURE = 'https://firebasestorage.googleapis.com/v0/b/etown-clubhub.appspot.com/o/default_bluejay.jpg?alt=media';

    // Check if user is authenticated
    auth.onAuthStateChanged(function(user) {
      if (user) {
        // User is signed in, populate the form
        populateUserSettings(user);
      } else {
        // No user is signed in, redirect to home page
        window.location.href = '/';
      }
    });
  
    function populateUserSettings(user) {
      document.getElementById('settingsEmail').value = user.email;
      
      // Fetch additional user data from Firestore
      db.collection('users').doc(user.uid).get().then((doc) => {
        if (doc.exists) {
          const userData = doc.data();
          document.getElementById('settingsDisplayName').value = userData.displayName || '';
          document.getElementById('settingsClub').value = userData.clubAffiliation || '';
          document.getElementById('settingsNotifications').checked = userData.notifications || false;

          // Set profile picture
          profilePicturePreview.src = userData.profilePicture || DEFAULT_PROFILE_PICTURE;
        }
      }).catch((error) => {
        console.error("Error fetching user data:", error);
      });
    }
    
    // Handle profile picture upload
    profilePictureInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        if (file.size > MAX_FILE_SIZE) {
          alert('File is too large. Maximum size is 512kB.');
          profilePictureInput.value = '';
          return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
          profilePicturePreview.src = e.target.result;
        }
        reader.readAsDataURL(file);
      }
    });

    function updatePublicClubProfile(userId, userData) {
      // Only update public profile if the user is a club admin
      if (userData.role === 'clubAdmin') {
        return db.collection('publicClubProfiles').doc(userId).set({
          clubName: userData.displayName,
          clubAffiliation: userData.clubAffiliation,
          profilePicture: userData.profilePicture || DEFAULT_PROFILE_PICTURE,
          lastFeatured: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
      return Promise.resolve(); // If not a club admin, resolve immediately
    }

    // Handle user info form submission
    userInfoForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const user = auth.currentUser;
      if (user) {
        const displayName = document.getElementById('settingsDisplayName').value;
        const clubAffiliation = document.getElementById('settingsClub').value;
        const file = profilePictureInput.files[0];

        let updatePromise;
        if (file) {
          // Upload new profile picture
          const storageRef = firebase.storage().ref('profile_pictures/' + user.uid);
          updatePromise = storageRef.put(file).then(snapshot => snapshot.ref.getDownloadURL());
        } else {
          updatePromise = Promise.resolve(null);
        }

        updatePromise
          .then((downloadURL) => {
            // Update user profile in Firebase Auth
            return user.updateProfile({
              displayName: displayName,
              photoURL: downloadURL || user.photoURL || DEFAULT_PROFILE_PICTURE
            });
          })
          .then(() => {
            // Update additional user data in Firestore
            const userData = {
              displayName: displayName,
              clubAffiliation: clubAffiliation,
              profilePicture: user.photoURL || DEFAULT_PROFILE_PICTURE
            };
            return db.collection('users').doc(user.uid).set(userData, { merge: true });
          })
          .then(() => {
            // Fetch the complete user data including the role
            return db.collection('users').doc(user.uid).get();
          })
          .then((doc) => {
            if (doc.exists) {
              const completeUserData = doc.data();
              // Update public club profile if the user is a club admin
              return updatePublicClubProfile(user.uid, completeUserData);
            }
          })
          .then(() => {
            alert('User information updated successfully!');
            profilePictureInput.value = ''; // Clear the file input
          })
          .catch((error) => {
            console.error('Error updating user information:', error);
            alert('An error occurred while updating user information.');
          });
      }
    });
  
    // Password visibility toggle
    function togglePasswordVisibility(inputId, toggleId) {
        const input = document.getElementById(inputId);
        const toggle = document.getElementById(toggleId);

        toggle.addEventListener('click', function() {
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        this.classList.toggle('bi-eye');
        this.classList.toggle('bi-eye-slash');
        });
    }

    // Apply toggles
    togglePasswordVisibility('currentPassword', 'toggleCurrentPassword');
    togglePasswordVisibility('newPassword', 'toggleNewPassword');
    togglePasswordVisibility('confirmNewPassword', 'toggleConfirmNewPassword');

    // Password validation
    const newPassword = document.getElementById('newPassword');
    const confirmNewPassword = document.getElementById('confirmNewPassword');
    const passwordHelp = document.getElementById('passwordHelp');
    const passwordHelpNoMatch = document.getElementById('passwordHelpNoMatch');

    function validatePassword(password) {
        const regex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.*[0-9]).{6,}$/;
        return regex.test(password);
    }

    function updatePasswordHelp() {
        const password = newPassword.value;
        const confirmPwd = confirmNewPassword.value;
        
        // hide if password meets requirements
        if (validatePassword(password)) {
        passwordHelp.style.display = 'none';
        } else {
        passwordHelp.style.display = 'block';
        }

        // hide if confirm password matches
        if (password !== confirmPwd) {
        passwordHelpNoMatch.style.display = 'block';
        } else {
        passwordHelpNoMatch.style.display = 'none';
        }
    }

    // Initial check
    updatePasswordHelp();

    // Add event listener for real-time checking
    newPassword.addEventListener('input', updatePasswordHelp);  
    confirmNewPassword.addEventListener('input', updatePasswordHelp);

    // Handle change password form submission
    changePasswordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const user = auth.currentUser;
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;

        if (newPassword !== confirmNewPassword) {
        alert('New passwords do not match.');
        return;
        }

        if (!validatePassword(newPassword)) {
        alert('New password does not meet the requirements. Please ensure your password has at least 6 characters, one uppercase letter, one special character, and one number.');
        return;
        }

        if (newPassword === currentPassword) {
        alert('New password must be different from the current password.');
        return;
        }
        
        // Reauthenticate the user
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        user.reauthenticateWithCredential(credential).then(() => {
        // Change password
        return user.updatePassword(newPassword);
        }).then(() => {
        alert('Password updated successfully!');
        changePasswordForm.reset();
        }).catch((error) => {
        console.error('Error updating password:', error);
        alert('An error occurred while updating password.');
        });
    });
  
    // Handle notifications form submission
    notificationsForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const user = auth.currentUser;
      if (user) {
        const notifications = document.getElementById('settingsNotifications').checked;
  
        db.collection('users').doc(user.uid).set({
          notifications: notifications
        }, { merge: true }).then(() => {
          alert('Notification preferences updated successfully!');
        }).catch((error) => {
          console.error('Error updating notification preferences:', error);
          alert('An error occurred while updating notification preferences.');
        });
      }
    });
  });

})();