document.addEventListener('DOMContentLoaded', function() {
    const userInfoForm = document.getElementById('userInfoForm');
    const changePasswordForm = document.getElementById('changePasswordForm');
    const notificationsForm = document.getElementById('notificationsForm');
  

  
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
        }
      }).catch((error) => {
        console.error("Error fetching user data:", error);
      });
    }
  
    // Handle user info form submission
    userInfoForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const user = auth.currentUser;
      if (user) {
        const displayName = document.getElementById('settingsDisplayName').value;
        const clubAffiliation = document.getElementById('settingsClub').value;
  
        // Update user profile in Firebase Auth
        user.updateProfile({
          displayName: displayName
        }).then(() => {
          // Update additional user data in Firestore
          return db.collection('users').doc(user.uid).set({
            displayName: displayName,
            clubAffiliation: clubAffiliation
          }, { merge: true });
        }).then(() => {
          alert('User information updated successfully!');
        }).catch((error) => {
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