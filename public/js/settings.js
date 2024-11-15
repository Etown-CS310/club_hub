"use strict";

(function() {
    // Move the function to higher scope so it can be used everywhere
    function updateSelectedClubsText(selectedClubs) {
      const selectedClubsText = document.getElementById('selectedClubsText');
      if (selectedClubs && selectedClubs.size > 0) {
          selectedClubsText.textContent = `${selectedClubs.size} club${selectedClubs.size !== 1 ? 's' : ''} selected`;
      } else {
          selectedClubsText.textContent = 'Choose Clubs';
      }
  }

  function createClubAffiliationsHTML() {
      return `
          <div class="mb-3">
              <label class="form-label">Current Club Affiliations</label>
              <div id="currentAffiliations" class="club-affiliations-container bg-dark text-white p-3 rounded">
                  <!-- Will be populated by JavaScript -->
              </div>
          </div>
          <div class="mb-3">
              <label class="form-label">Add Club Affiliations</label>
              <div class="dropdown">
                  <button class="form-control bg-dark text-white d-flex justify-content-between align-items-center" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                      <span id="selectedClubsText">Choose Clubs</span>
                      <i class="bi bi-chevron-down"></i>
                  </button>
                  <div class="dropdown-menu bg-dark w-100 p-2">
                      <input type="text" class="form-control bg-dark text-white mb-2" id="clubSearchInput" placeholder="Search clubs...">
                      <div class="club-options" style="max-height: 200px; overflow-y: auto;">
                          <!-- Will be populated by JavaScript -->
                      </div>
                  </div>
              </div>
          </div>`;
  }

  function initializeClubDropdown() {
      const clubOptionsContainer = document.querySelector('.club-options');
      if (!clubOptionsContainer) return { selectedClubs: new Set() }; // Return empty set if container doesn't exist

      const clubSearchInput = document.getElementById('clubSearchInput');
      const selectedClubs = new Set();

      db.collection('clubs').get().then((snapshot) => {
          const clubs = [];
          snapshot.forEach(doc => {
              const club = doc.data();
              clubs.push({
                  id: doc.id,
                  name: club.name
              });
          });

          renderClubOptions(clubs);

          if (clubSearchInput) {
              clubSearchInput.addEventListener('input', (e) => {
                  const searchTerm = e.target.value.toLowerCase();
                  const filteredClubs = clubs.filter(club => 
                      club.name.toLowerCase().includes(searchTerm)
                  );
                  renderClubOptions(filteredClubs);
              });
          }
      });

      function renderClubOptions(clubs) {
          if (!clubOptionsContainer) return;
          
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

      return { selectedClubs };
  }

  document.addEventListener('DOMContentLoaded', function() {
      const userInfoForm = document.getElementById('userInfoForm');
      const displayNameContainer = document.querySelector('.mb-3:has(#settingsDisplayName)');
      const MAX_FILE_SIZE = 1 * 512 * 512;
      const DEFAULT_PROFILE_PICTURE = 'https://firebasestorage.googleapis.com/v0/b/etown-clubhub.appspot.com/o/default_bluejay.jpg?alt=media';
      let selectedClubs;

      auth.onAuthStateChanged(function(user) {
          if (user) {
              populateUserSettings(user);
          } else {
              window.location.href = '/';
          }
      });

      function populateUserSettings(user) {
        document.getElementById('settingsEmail').value = user.email;
        
        db.collection('users').doc(user.uid).get().then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                const displayNameInput = document.getElementById('settingsDisplayName');
                const clubAffiliationsContainer = document.getElementById('clubAffiliationsContainer');
                
                displayNameInput.value = userData.displayName || '';
                
                // Handle club admin specific UI
                if (userData.role === 'clubAdmin') {
                    // Hide club affiliations container completely for club admins
                    if (clubAffiliationsContainer) {
                        clubAffiliationsContainer.style.display = 'none';
                    }
                    
                    // Modify display name field
                    displayNameInput.disabled = true;
                    displayNameInput.title = "Club names cannot be edited here";
                    const helpText = document.createElement('div');
                    helpText.className = 'form-text';
                    helpText.textContent = 'Club names are managed by administrators';
                    displayNameInput.parentNode.appendChild(helpText);
                } else {
                    // Regular user setup
                    displayNameInput.disabled = false;
                    
                    if (clubAffiliationsContainer) {
                        clubAffiliationsContainer.innerHTML = createClubAffiliationsHTML();
                        
                        // Initialize club dropdown and populate affiliations
                        const dropdownInit = initializeClubDropdown();
                        selectedClubs = dropdownInit.selectedClubs;
                        
                        const currentAffiliationsDiv = document.getElementById('currentAffiliations');
                        if (currentAffiliationsDiv) {
                            if (userData.clubAffiliations && userData.clubAffiliations.length > 0) {
                                currentAffiliationsDiv.innerHTML = userData.clubAffiliations.map(club => `
                                    <div class="mb-2">
                                        <input type="checkbox" class="form-check-input" 
                                              id="current_${club.replace(/\s+/g, '')}" 
                                              name="currentAffiliations" 
                                              value="${club}" 
                                              checked>
                                        <label class="form-check-label ms-2" 
                                              for="current_${club.replace(/\s+/g, '')}">${club}</label>
                                    </div>
                                `).join('');
                            } else {
                                currentAffiliationsDiv.innerHTML = '<p class="text-white mb-0">No current club affiliations</p>';
                            }
                        }
                    }
                }
                
                // Set other user settings
                const notificationsCheckbox = document.getElementById('settingsNotifications');
                if (notificationsCheckbox) {
                    notificationsCheckbox.checked = userData.notifications || false;
                }
                
                const profilePicturePreview = document.getElementById('profilePicturePreview');
                if (profilePicturePreview) {
                    profilePicturePreview.src = userData.profilePicture || DEFAULT_PROFILE_PICTURE;
                }
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
  
          // Get current user data to check role
          db.collection('users').doc(user.uid).get().then(doc => {
              const userData = doc.data();
              let clubAffiliations = [];
  
              // Only process club affiliations for non-club admin users
              if (userData.role !== 'clubAdmin' && selectedClubs) {
                  // Get all checked clubs from both current and dropdown selections
                  const currentChecked = Array.from(document.querySelectorAll('#currentAffiliations input:checked'))
                      .map(input => input.value);
                  
                  const dropdownChecked = Array.from(document.querySelectorAll('.club-options input:checked'))
                      .map(input => input.value);
                  
                  // Combine both selections, remove duplicates
                  clubAffiliations = [...new Set([...currentChecked, ...dropdownChecked])];
              } else if (userData.role === 'clubAdmin') {
                  // Preserve existing club affiliations for club admin if any
                  clubAffiliations = userData.clubAffiliations || [];
              }
  
              // Continue with your existing update logic
              let updatePromise;
              if (file) {
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
                    clubAffiliations: clubAffiliations,  // Use the clubAffiliations we defined above
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
                  if (currentAffiliationsDiv) {
                    currentAffiliationsDiv.innerHTML = '';

                    if (clubAffiliations.length > 0) {
                      clubAffiliations.forEach(club => {
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

                    if (selectedClubs) {
                      selectedClubs.clear(); // Clear selections after saving
                      updateSelectedClubsText(selectedClubs);
                    }
                  }

                  alert('User information updated successfully!');
                  profilePictureInput.value = ''; 
                })
                .catch((error) => {
                  console.error('Error updating user information:', error);
                  alert('An error occurred while updating user information.');
                });
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