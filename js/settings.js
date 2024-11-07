"use strict";

(function() {
    // Move the function to higher scope so it can be used everywhere
    function updateSelectedClubsText(selectedClubs) {
      const selectedClubsText = document.getElementById('selectedClubsText');
      if (selectedClubs.size > 0) {
          selectedClubsText.textContent = `${selectedClubs.size} club${selectedClubs.size !== 1 ? 's' : ''} selected`;
      } else {
          selectedClubsText.textContent = 'Choose Clubs';
      }
  }

  function initializeClubDropdown() {
      const clubOptionsContainer = document.querySelector('.club-options');
      const clubSearchInput = document.getElementById('clubSearchInput');
      const selectedClubs = new Set(); // Track selected clubs across searches

      // Initial load of all clubs
      db.collection('clubs').get().then((snapshot) => {
          const clubs = [];
          snapshot.forEach(doc => {
              const club = doc.data();
              clubs.push({
                  id: doc.id,
                  name: club.name
              });
          });

          // Populate initial list
          renderClubOptions(clubs);

          // Add search handler
          clubSearchInput.addEventListener('input', (e) => {
              const searchTerm = e.target.value.toLowerCase();
              const filteredClubs = clubs.filter(club => 
                  club.name.toLowerCase().includes(searchTerm)
              );
              renderClubOptions(filteredClubs);
          });
      });

      function renderClubOptions(clubs) {
          clubOptionsContainer.innerHTML = clubs.map(club => `
              <div class="form-check">
                  <input class="form-check-input" type="checkbox" 
                         value="${club.name}" 
                         id="club_${club.id}"
                         ${selectedClubs.has(club.name) ? 'checked' : ''}>
                  <label class="form-check-label text-white" for="club_${club.id}">
                      ${club.name}
                  </label>
              </div>
          `).join('');

          // Reattach event listeners
          clubOptionsContainer.querySelectorAll('input[type="checkbox"]')
              .forEach(checkbox => {
                  checkbox.addEventListener('change', (e) => {
                      if (e.target.checked) {
                          selectedClubs.add(e.target.value);
                      } else {
                          selectedClubs.delete(e.target.value);
                      }
                      updateSelectedClubsText(selectedClubs);
                  });
              });
      }

      // Stop dropdown from closing when clicking inside
      document.querySelector('.dropdown-menu').addEventListener('click', function(e) {
          e.stopPropagation();
      });

      return { selectedClubs }; // Return selectedClubs so it can be used in form submission
  }

  document.addEventListener('DOMContentLoaded', function() {
    const userInfoForm = document.getElementById('userInfoForm');
    const changePasswordForm = document.getElementById('changePasswordForm');
    const notificationsForm = document.getElementById('notificationsForm');
    const profilePictureInput = document.getElementById('profilePictureInput');
    const profilePicturePreview = document.getElementById('profilePicturePreview');

    const MAX_FILE_SIZE = 1 * 512 * 512; // 250kb
    const DEFAULT_PROFILE_PICTURE = 'https://firebasestorage.googleapis.com/v0/b/etown-clubhub.appspot.com/o/default_bluejay.jpg?alt=media';

    const { selectedClubs } = initializeClubDropdown();

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
    
    const clubSearchInput = document.getElementById('clubSearchInput');
    const selectedClubsText = document.getElementById('selectedClubsText');

    // Stop dropdown from closing when clicking inside
    document.querySelector('.dropdown-menu').addEventListener('click', function(e) {
        e.stopPropagation();
    });

    function populateUserSettings(user) {
      document.getElementById('settingsEmail').value = user.email;
      
      // Fetch additional user data from Firestore
      db.collection('users').doc(user.uid).get().then((doc) => {
        if (doc.exists) {
          const userData = doc.data();
          const displayNameInput = document.getElementById('settingsDisplayName');
          
          displayNameInput.value = userData.displayName || '';
          
          // Disable display name editing for club admins
          if (userData.isClubAdmin) {
              displayNameInput.disabled = true;
              displayNameInput.title = "Club names cannot be edited here";
              // Optional: Add a help text
              const helpText = document.createElement('div');
              helpText.className = 'form-text';
              helpText.textContent = 'Club names are managed through the clubs directory';
              displayNameInput.parentNode.appendChild(helpText);
          }
            
          // Populate current affiliations
          const currentAffiliationsDiv = document.getElementById('currentAffiliations');
          currentAffiliationsDiv.innerHTML = '';

          if (userData.clubAffiliations && userData.clubAffiliations.length > 0) {
              userData.clubAffiliations.forEach(club => {
                  currentAffiliationsDiv.innerHTML += `
                      <div class="mb-2">
                          <input type="checkbox" class="form-check-input" 
                                  id="current_${club.replace(/\s+/g, '')}" 
                                  name="currentAffiliations" 
                                  value="${club}" 
                                  checked>
                          <label class="form-check-label ms-2" 
                                  for="current_${club.replace(/\s+/g, '')}">${club}</label>
                      </div>
                  `;
              });
          } else {
              currentAffiliationsDiv.innerHTML = '<p class="text-white mb-0">No current club affiliations</p>';
          }
            
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
        const file = profilePictureInput.files[0];

        // Get all checked clubs from both current and dropdown selections
        const currentChecked = Array.from(document.querySelectorAll('#currentAffiliations input:checked'))
        .map(input => input.value);
            
        const dropdownChecked = Array.from(document.querySelectorAll('.club-options input:checked'))
            .map(input => input.value);
            
        // Combine both selections, remove duplicates
        const allSelectedClubs = [...new Set([...currentChecked, ...selectedClubs])];
        
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
              clubAffiliations: allSelectedClubs,
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
              // After successful save, update the UI
              const currentAffiliationsDiv = document.getElementById('currentAffiliations');
              currentAffiliationsDiv.innerHTML = '';

              if (allSelectedClubs.length > 0) {
                  allSelectedClubs.forEach(club => {
                      currentAffiliationsDiv.innerHTML += `
                          <div class="mb-2">
                              <input type="checkbox" class="form-check-input" 
                                    id="current_${club.replace(/\s+/g, '')}" 
                                    name="currentAffiliations" 
                                    value="${club}" 
                                    checked>
                              <label class="form-check-label ms-2" 
                                    for="current_${club.replace(/\s+/g, '')}">${club}</label>
                          </div>
                      `;
                  });
              } else {
                  currentAffiliationsDiv.innerHTML = '<p class="text-white mb-0">No current club affiliations</p>';
              }

              selectedClubs.clear(); // Clear selections after saving
              updateSelectedClubsText(selectedClubs);

            alert('User information updated successfully!');
            profilePictureInput.value = ''; 
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