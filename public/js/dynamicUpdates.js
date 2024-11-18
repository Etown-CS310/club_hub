(function () {
    // dynamicUpdates.js
    "use strict";
    
    // Page: index.html
    // Functionality: populate the events table (top right)
    async function populateEventsTable() {
      const eventsTable = document.getElementById('home-events');
      if (!eventsTable) return; // Exit if table doesn't exist on the page

      const currentDate = new Date();

      try {
          // Fetch events from Firestore:
          // Where: Filter for future events
          // Limit: only show 10 events
          const querySnapshot = await db.collection('events')
              .where('date', '>=', currentDate.toISOString().split('T')[0])
              .orderBy('date')
              .orderBy('startTime')
              .limit(10)
              .get();

          // Clear existing rows
          eventsTable.innerHTML = '';

          querySnapshot.forEach((doc) => {
              const data = doc.data();
              const row = document.createElement('tr');

              // Use the clubName directly from the event data
              const clubName = data.clubName || 'Unknown Club';

              // Format date and time
              const eventDate = new Date(data.date + 'T' + data.startTime);
              const formattedDate = eventDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
              const formattedTime = eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

              // Create the event link
              const eventLink = `<a href="/pages/eventDetails.html?id=${doc.id}" class="text-decoration-none text-primary">${data.title}</a>`;

              row.innerHTML = `
                  <th scope="row">${clubName}</th>
                  <td>${eventLink}</td>
                  <td>${formattedDate}</td>
                  <td>${formattedTime}</td>
                  <td>${data.location}</td>
              `;

              eventsTable.appendChild(row);
          });
      } catch (error) {
          console.error("Error fetching events: ", error);
      }
    }
    
    // Page: index.html
    // Functionality: populate the featured clubs carousel
    async function populateFeaturedClubs() {
      const featuredClubsContainer = document.getElementById('featuredClubs');
      if (!featuredClubsContainer) {
        console.error("Featured clubs container not found");
        return;
      }
    
      try {
        const querySnapshot = await db.collection('publicClubProfiles')
          .orderBy('lastFeatured')
          .limit(5)  
          .get();
    
        featuredClubsContainer.innerHTML = '';
    
        const indicators = document.createElement('div');
        indicators.className = 'carousel-indicators';
        featuredClubsContainer.appendChild(indicators);
    
        const innerCarousel = document.createElement('div');
        innerCarousel.className = 'carousel-inner';
        featuredClubsContainer.appendChild(innerCarousel);
    
        if (querySnapshot.empty) {
          console.log("No featured clubs found");
          // Add a default carousel item
          const defaultItem = document.createElement('div');
          defaultItem.className = 'carousel-item active';
          defaultItem.innerHTML = `
            <img src="path/to/default/image.jpg" class="d-block w-100 mx-auto" alt="Default Club" style="width: 200px; height: 200px; object-fit: cover;">
            <div class="carousel-caption d-none d-md-block">
              <h5>Join a Club!</h5>
            </div>
          `;
          innerCarousel.appendChild(defaultItem);
        } else {
          querySnapshot.docs.forEach((doc, index) => {
            const data = doc.data();
    
            // Create indicator
            const indicator = document.createElement('button');
            indicator.setAttribute('type', 'button');
            indicator.setAttribute('data-bs-target', '#clubCarousel');
            indicator.setAttribute('data-bs-slide-to', index.toString());
            if (index === 0) indicator.classList.add('active');
            indicators.appendChild(indicator);
    
            // Create carousel item
            const carouselItem = document.createElement('div');
            carouselItem.className = `carousel-item ${index === 0 ? 'active' : ''}`;
    
            carouselItem.innerHTML = `
              <img src="${data.profilePicture}" class="d-block w-100 mx-auto" alt="${data.clubName}" style="width: 200px; height: 200px; object-fit: cover;">
              <div class="carousel-caption d-none d-md-block">
                <h5>${data.clubName}</h5>
              </div>
            `;
    
            innerCarousel.appendChild(carouselItem);
    
            // Update the lastFeatured timestamp
            db.collection('publicClubProfiles').doc(doc.id).update({
              lastFeatured: firebase.firestore.FieldValue.serverTimestamp()
            });
          });
        }
    
      } catch (error) {
        console.error("Error fetching featured clubs: ", error);
      }
    }

// --------------------------------------------------------------------------------

    // Page: myClub.html
    // Functionality: populate the events table (top right)
    async function populateClubEventsTable() {
      console.log("Populating club events table");
      const clubEventsTable = document.getElementById('club-events');
      if (!clubEventsTable) {
          console.log("No club events table found");
          return;
      }
      
      // Get current user
      const user = firebase.auth().currentUser;
      console.log("Current user:", user);
      if (!user) {
          console.log('User not logged in.');
          return;
      }

      const currentDate = new Date();

      try {
          // Fetch events from Firestore:
          // 1st Where: Only show for relevant club
          // 2nd Where: Filter for future events
          // Limit: only show 10 events
          const querySnapshot = await db.collection('events')
              .where('clubName', '==', user.displayName)
              .where('date', '>=', currentDate.toISOString().split('T')[0])
              .orderBy('date')
              .orderBy('startTime')
              .limit(10)
              .get();

          // Clear existing rows
          clubEventsTable.innerHTML = '';

          querySnapshot.forEach((doc) => {
              const data = doc.data();
              const row = document.createElement('tr');

              // Format date and time
              const eventDate = new Date(data.date + 'T' + data.startTime);
              const formattedDate = eventDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
              const formattedTime = eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

              // Create the event link
              const eventLink = `<a href="/pages/eventDetails.html?id=${doc.id}" class="text-decoration-none text-primary">${data.title}</a>`;

              row.innerHTML = `
                  <td>${eventLink}</td>
                  <td>${formattedDate}</td>
                  <td>${formattedTime}</td>
                  <td>${data.location}</td>
              `;

              clubEventsTable.appendChild(row);
          });
      } catch (error) {
          console.error("Error fetching events: ", error);
      }
    }

    // Page: myClub.html
    // Functionality: populate the club news table (top left)
    async function populateClubNews() {
      console.log("Populating club news table");
      const clubNewsTitle = document.getElementById('club_name');
      if (!clubNewsTitle) {
          console.log("No club news title found");
          return;
      }

      // Get current user
      const user = firebase.auth().currentUser;
      console.log("Current user:", user);
      if (!user) {
          console.log('User not logged in.');
          return;
      }

      try {
        // Fetch user's data from Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Check if user is a club admin
            if (userData.role === "clubAdmin") {
                clubNewsTitle.innerHTML = user.displayName;
            }
        } else {
            console.log("No user document found!");
        }
      } catch (error) {
          console.error("Error fetching user data:", error);
      }
    }

// --------------------------------------------------------------------------------

    // Function to initialize dynamic updates
    function initDynamicUpdates() {
      const currentPath = window.location.pathname;
      console.log("Current path:", currentPath);
  
      // Wait for auth to be ready
      firebase.auth().onAuthStateChanged((user) => {
          if (currentPath === '/' || currentPath === '/index.html') {
              console.log("On home page");
              const homeEventsTable = document.getElementById('home-events');
              if (homeEventsTable) {
                  populateEventsTable();
                  populateFeaturedClubs();
              }
          }
          
          if (currentPath.includes('myClub.html')) {
              console.log("On myClub page, user:", user);
              const clubEventsTable = document.getElementById('club-events');
              if (clubEventsTable && user) {  // Only proceed if we have both table and user
                populateClubNews();
                populateClubEventsTable();
              }
          }
      });
    }
  
  
    // Call initDynamicUpdates when the DOM is fully loaded
    document.addEventListener('DOMContentLoaded', initDynamicUpdates);

})();
