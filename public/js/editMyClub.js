"use strict";

(function () {
    
    // Name Form Elements
    const openNameFormBtn = document.getElementById('openNameForm');
    const closeNameFormBtn = document.getElementById('closeNameForm');
    const popupNameForm = document.getElementById('popupNameForm');
    const clubNameInput = document.getElementById('clubNameInput');
    const clubNameSpan = document.getElementById('club_name');

    // News Form Elements
    const openNewsFormBtn = document.getElementById('openNewsForm');
    const closeNewsFormBtn = document.getElementById('closeNewsForm');
    const popupNewsForm = document.getElementById('popupNewsForm');
    const newsTitleInput = document.getElementById('newsTitleInput');
    const newsImageInput = document.getElementById('newsImageInput');
    const previewImg = document.getElementById('previewImg');
    const newsTitle1 = document.getElementById('newsTitle1');
    const newsImage1 = document.getElementById('newsImage1');

    // Open/Close Popup Forms
    openNameFormBtn.addEventListener('click', () => popupNameForm.style.display = 'block');
    closeNameFormBtn.addEventListener('click', () => popupNameForm.style.display = 'none');
    openNewsFormBtn.addEventListener('click', () => popupNewsForm.style.display = 'block');
    closeNewsFormBtn.addEventListener('click', () => popupNewsForm.style.display = 'none');

    // Update Club Name
    popupNameForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const newName = clubNameInput.value.trim();
        if (newName) {
            clubNameSpan.textContent = newName;
        }
        popupNameForm.style.display = 'none';
    });

    // Preview Selected Image
    newsImageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
            previewImg.src = e.target.result;
            previewImg.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    // Update News Title and Image
    popupNewsForm.addEventListener('submit', (event) => {
        event.preventDefault();
        
        const newTitle = newsTitleInput.value.trim();
        const newImageSrc = previewImg.src; // This will be empty if no image is selected

        // Update news title if provided
        if (newTitle) {
            newsTitle1.textContent = newTitle;
        }

        // Check if an image is uploaded
        if (newsImageInput.files.length > 0) {
            // If a new image is selected, update the source
            newsImage1.src = previewImg.src; // Set the new image
        }

        popupNewsForm.style.display = 'none';
    });

    // Add button element to trigger the new collection creation
    const addNewsBtn = document.createElement('button');
    addCollectionBtn.id = 'addCollectionBtn';
    addCollectionBtn.textContent = 'Add New Collection';
    addCollectionBtn.addEventListener('click', addNewCollection);

    // Insert the button into the document (adjust the placement as needed)
    document.body.appendChild(addCollectionBtn);

})();

function saveEvent() {
    // Get form values
    const title = document.getElementById('eventTitle').value.trim();
    const date = document.getElementById('eventDate').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const location = document.getElementById('location').value.trim();

    // Additional validation: Ensure endTime is after startTime
    if (endTime <= startTime) {
      alert('End time must be after start time.');
      return;
    }
    
    // Get current user
    const user = auth.currentUser;
    
    // Fetch user data to get club affiliation
    db.collection('users').doc(user.uid).get().then((doc) => {
      if (doc.exists) {
        const userData = doc.data();
        const clubName = userData.displayName;

        // Create event object
        const event = {
          title: title,
          date: date,
          startTime: startTime,
          endTime: endTime,
          location: location,
          createdBy: user.uid,
          clubName: clubName 
        };

        // Save to Firestore under 'events' collection
        db.collection('events').add(event)
          .then(() => {
            // Close the modal
            const createEventModalEl = document.getElementById('createEventModal');
            const createEventModal = bootstrap.Modal.getInstance(createEventModalEl);
            createEventModal.hide();

            // Reset the form
            form.reset();
            form.classList.remove('was-validated');

            // Refresh the calendar events
            calendar.refetchEvents();

            // Show success message
            alert('Event created successfully!');
          })
          .catch((error) => {
            console.error('Error adding event: ', error);
            alert('Error adding event: ' + error.message);
          });
      } else {
        alert('User data not found.');
      }
    }).catch((error) => {
      console.error('Error fetching user data:', error);
      alert('Error fetching user data: ' + error.message);
    });
  }