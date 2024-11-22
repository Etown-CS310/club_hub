"use strict";

(function () {
  /*
   * Initialize global components through loadComponent function
   */
  async function initGlobal() {
    try {
      await loadComponent('/components/navbar.html', 'navbar');
      await loadComponent('/components/footer.html', 'footer');
      initEventListeners();

      auth.onAuthStateChanged(async (user) => {
        if (user && user.emailVerified) {
            console.log('User is signed in:', user);
            
            try {
                // Check if user profile exists
                const userDoc = await db.collection('users').doc(user.uid).get();
                
                if (!userDoc.exists) {
                    console.log('Creating new user profile for verified user');
                    await createUserProfile(user);
                }
                
                // Update UI
                displayUserUI(user);
                displayMyClubPage(user);
            } catch (error) {
                console.error('Error in auth state change:', error);
                // Handle error appropriately
            }
        } else {
            // User is signed out or email not verified
            console.log('No user is signed in or email not verified');
            displayGuestUI();
            displayMyClubPage(null);
        }
      });
    } catch (error) {
      console.error('Error loading components:', error);
    }
  }

  /*
   * Takes url path and element id to load component
   * @param {string, string} path and element id to load component
   */
  async function loadComponent(url, elementId) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const html = await response.text();
      document.getElementById(elementId).innerHTML = html;
    } catch (error) {
      console.error(`Error loading ${url}:`, error);
    }
  }

  // Initialize global components when window is loaded
  window.addEventListener("load", initGlobal);

  // Define initEventListeners in the correct scope
  function initEventListeners() {
    // Handle login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        signIn(email, password)
          .then((userCredential) => {
            // Hide the login modal
            const loginModalEl = document.getElementById('loginModal');
            const loginModal = bootstrap.Modal.getInstance(loginModalEl) || new bootstrap.Modal(loginModalEl);
            loginModal.hide();

            // Optionally, reset the form
            loginForm.reset();

            displayUserUI(userCredential.user);
          })
          .catch((error) => {
            // Error is already handled in signIn function
          });
      });
    }

    // Handle "Forgot password" link in login modal
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
      forgotPasswordLink.addEventListener('click', function(e) {
        e.preventDefault();
        // Close the login modal and open the reset password modal
        const loginModalEl = document.getElementById('loginModal');
        const resetPassModalEl = document.getElementById('resetPassModal');
        const loginModal = bootstrap.Modal.getInstance(loginModalEl);
        const resetPassModal = new bootstrap.Modal(resetPassModalEl);
        loginModal.hide();
        resetPassModal.show();
      });
    }
    
    // Handle reset password form submission
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
      resetPasswordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('resetEmail').value;
        resetPassword(email)
          .then(() => {
            console.log('Password reset email sent successfully');
          })
          .catch((error) => {
            console.error('Error in reset password:', error);
          });
      });
    }

    // Handle "Sign Up" link
    const signUpLink = document.getElementById('signUpLink');
    if (signUpLink) {
      signUpLink.addEventListener('click', function(e) {
        e.preventDefault();
        // Close the login modal and open the sign-up modal
        const loginModalEl = document.getElementById('loginModal');
        const signUpModalEl = document.getElementById('signUpModal');
        const loginModal = bootstrap.Modal.getInstance(loginModalEl);
        const signUpModal = new bootstrap.Modal(signUpModalEl);
        loginModal.hide();
        signUpModal.show();
      });
    }

    // Handle sign-up form submission
    const signUpForm = document.getElementById('signUpForm');
    if (signUpForm) {
      signUpForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('signUpEmail').value;
        const password = document.getElementById('signUpPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
          alert('Passwords do not match. Please try again.');
          return;
        }

        // Check password requirements
        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.*[0-9]).{6,}$/;
        if (!passwordRegex.test(password)) {
          alert('Password does not meet the requirements. Please ensure your password has at least 6 characters, one uppercase letter, one special character, and one number.');
          return;
        }

        signUp(email, password)
          .then(() => {
            console.log('Sign-up successful, updating UI.');
            // Hide the sign-up modal
            const signUpModalEl = document.getElementById('signUpModal');
            const signUpModal = bootstrap.Modal.getInstance(signUpModalEl) || new bootstrap.Modal(signUpModalEl);
            signUpModal.hide();

            // Reset the sign-up form
            signUpForm.reset();

            // Open the login modal
            const loginModalEl = document.getElementById('loginModal');
            const loginModal = bootstrap.Modal.getInstance(loginModalEl) || new bootstrap.Modal(loginModalEl);
            loginModal.show();

            // Inform the user to verify their email
            alert('Registration successful! Please verify your email before logging in.');
          })
          .catch((error) => {
            // Error is already handled in signUp function
            console.error('Error in sign-up event listener:', error);
          });
      });
    }

    // Handle "Login" link in sign-up modal
    const loginLink = document.getElementById('loginLink');
    if (loginLink) {
      loginLink.addEventListener('click', function(e) {
        e.preventDefault();
        // Close the sign-up modal and open the login modal
        const signUpModalEl = document.getElementById('signUpModal');
        const loginModalEl = document.getElementById('loginModal');
        const signUpModal = bootstrap.Modal.getInstance(signUpModalEl);
        const loginModal = new bootstrap.Modal(loginModalEl);
        signUpModal.hide();
        loginModal.show();
      });
    }

    // Handle "Back to Login" link in reset password modal
    const backToLoginLink = document.getElementById('backToLoginLink');
    if (backToLoginLink) {
      backToLoginLink.addEventListener('click', function(e) {
        e.preventDefault();
        // Close the reset password modal and open the login modal
        const resetPassModalEl = document.getElementById('resetPassModal');
        const loginModalEl = document.getElementById('loginModal');
        const resetPassModal = bootstrap.Modal.getInstance(resetPassModalEl);
        const loginModal = new bootstrap.Modal(loginModalEl);
        resetPassModal.hide();
        loginModal.show();
      });
    }

    const signUpPassword = document.getElementById('signUpPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const passwordHelp = document.getElementById('passwordHelp');
    const passwordHelpNoMatch = document.getElementById('passwordHelpNoMatch');

    function validatePassword(password) {
      const regex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.*[0-9]).{6,}$/;
      return regex.test(password);
    }
  
    function updatePasswordHelp() {
      const password = signUpPassword.value;
      const confirmPwd = confirmPassword.value;
      
      // hide if password meets requirements
      if (validatePassword(signUpPassword.value)) {
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
    signUpPassword.addEventListener('input', updatePasswordHelp);  
    confirmPassword.addEventListener('input', updatePasswordHelp);
    
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
    togglePasswordVisibility('loginPassword', 'toggleLoginPassword');
    togglePasswordVisibility('signUpPassword', 'togglePassword');
    togglePasswordVisibility('confirmPassword', 'toggleConfirmPassword');

  }

  function toggleInboxVisibility(show) {
    const inboxNav = document.querySelector('.nav-item a[href="/pages/inbox.html"]')?.parentElement;
    if (inboxNav) {
        if (show) {
            inboxNav.classList.remove('d-none');
        } else {
            inboxNav.classList.add('d-none');
        }
    }
  }
  // Move displayUserUI and displayGuestUI functions here
  function displayUserUI(user) {

    const DEFAULT_PROFILE_PICTURE = 'https://firebasestorage.googleapis.com/v0/b/etown-clubhub.appspot.com/o/default_bluejay.jpg?alt=media';
    const authSection = document.getElementById('authSection');

    toggleInboxVisibility(true);

    authSection.innerHTML = `
      <div class="dropdown">
        <button class="btn btn-clubhub dropdown-toggle d-flex align-items-center" type="button" id="userDropdown" data-bs-toggle="dropdown" aria-expanded="false">
          <img src="${user.photoURL || DEFAULT_PROFILE_PICTURE}" alt="Profile" class="rounded-circle me-2" style="width: 30px; height: 30px; object-fit: cover;">
          ${user.displayName || user.email}
        </button>
        <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
          <li><a class="dropdown-item" href="/pages/settings.html">Settings</a></li>
          <li><a class="dropdown-item" href="#" id="logoutButton">Logout</a></li>
        </ul>
      </div>
    `;

    // Add event listener for logout
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
      logoutButton.addEventListener('click', function(e) {
        e.preventDefault();
        signOut();
      });
    }
  }

  function displayGuestUI() {
    const authSection = document.getElementById('authSection');
    
    toggleInboxVisibility(false);
    
    authSection.innerHTML = `
      <!-- Button trigger login modal -->
      <button type="button" class="btn btn-clubhub" data-bs-toggle="modal" data-bs-target="#loginModal">
        Login
      </button>
    `;
  }

  function displayMyClubPage(user){
    if (user) {
      // Fetch user role from Firestore
      db.collection('users').doc(user.uid).get().then((doc) => {
        if (doc.exists) {
          const userData = doc.data();
          if (userData.role === 'clubAdmin') {
            myClubNav.classList.remove('hidden');
          } else {
            myClubNav.classList.add('hidden');
          }
        } else {
          alert('User data not found.');
        }
      });
    } else {
      myClubNav.classList.add('hidden');
    }
  }

  // Expose functions to global scope if necessary
  window.displayUserUI = displayUserUI;
  window.displayGuestUI = displayGuestUI;

})();
