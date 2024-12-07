(function () {
  // dynamicUpdates.js
    "use strict";
    
    // Functionality: populate the featured clubs carousel (top left)
    async function populateFeaturedClubs() {
      console.log("Populating featured clubs carousel");
      
      // Get carousel elements
      const clubCarousel = document.getElementById('clubCarousel');
      const carouselInner = clubCarousel?.querySelector('.carousel-inner');
      const carouselIndicators = clubCarousel?.querySelector('.carousel-indicators');
      const carouselButtonIndicators = clubCarousel?.querySelector('.carousel-button-indicators');
      
      if (!carouselInner || !clubCarousel) {
        console.error("Required carousel elements not found");
        return;
      }
    
      try {
        console.log("Fetching featured clubs from Firestore...");
        const querySnapshot = await db.collection('publicClubProfiles')
          .orderBy('lastFeatured', 'desc')
          .limit(5)
          .get();
    
        // Clear existing content
        carouselInner.innerHTML = '';
        if (carouselIndicators) carouselIndicators.innerHTML = '';
        if (carouselButtonIndicators) carouselButtonIndicators.innerHTML = '';
    
        if (querySnapshot.empty) {
          console.log("No featured clubs found, displaying default item");
          const defaultItem = document.createElement('div');
          defaultItem.className = 'carousel-item active';
          defaultItem.innerHTML = `
            <img src="/images/img_logo.png" class="d-block w-100 mx-auto" alt="Default club image">
            <div class="carousel-caption d-none d-md-block">
              <h5>Join a Club!</h5>
              <p>Explore and join exciting clubs on campus</p>
            </div>
          `;
          carouselInner.appendChild(defaultItem);
          
          // Hide indicators if only one item
          if (carouselIndicators) carouselIndicators.style.display = 'none';
          if (carouselButtonIndicators) carouselButtonIndicators.style.display = 'none';
        } else {
          const clubItems = querySnapshot.docs.map(doc => doc.data());
          console.log(`Found ${clubItems.length} featured clubs`);
    
          // Create carousel items
          clubItems.forEach((data, index) => {
            const carouselItem = document.createElement('div');
            carouselItem.className = `carousel-item${index === 0 ? ' active' : ''}`;
            
            carouselItem.innerHTML = `
              <img src="${data.profilePicture || '/images/img_logo.png'}" 
                   class="d-block w-100 mx-auto" 
                   alt="${data.clubName || 'Club image'}"
                   onerror="this.src='/images/img_logo.png'">
              <div class="carousel-caption d-none d-md-block">
                <h5>${data.clubName || 'Untitled Club'}</h5>
                ${data.description ? `<p>${data.description}</p>` : ''}
              </div>
            `;
            
            carouselInner.appendChild(carouselItem);
    
            // Create indicator if we have multiple items
            if (clubItems.length > 1 && carouselIndicators) {
              const indicator = document.createElement('button');
              indicator.type = 'button';
              indicator.dataset.bsTarget = '#clubCarousel';
              indicator.dataset.bsSlideTo = index.toString();
              if (index === 0) {
                indicator.classList.add('active');
                indicator.setAttribute('aria-current', 'true');
              }
              indicator.setAttribute('aria-label', `Slide ${index + 1}`);
              carouselIndicators.appendChild(indicator);
            }     
          });
    
          // Add navigation buttons if multiple items
          if (clubItems.length > 1 && carouselButtonIndicators) {
            carouselButtonIndicators.innerHTML = `
              <button class="carousel-control-prev" type="button" data-bs-target="#clubCarousel" data-bs-slide="prev">
                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Previous</span>
              </button>
              <button class="carousel-control-next" type="button" data-bs-target="#clubCarousel" data-bs-slide="next">
                <span class="carousel-control-next-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Next</span>
              </button>
            `;
          } else {
            if (carouselIndicators) carouselIndicators.style.display = 'none';
            if (carouselButtonIndicators) carouselButtonIndicators.style.display = 'none';
          }
        }
    
        // Initialize the Bootstrap carousel
        new bootstrap.Carousel(clubCarousel);
    
      } catch (error) {
        console.error("Error fetching featured clubs:", error);
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          stack: error.stack
        });
      }
    }

    
    // Functionality: populate the events table (top right)
    async function populateEventsTable() {
      const eventsTable = document.getElementById('home-events');
      if (!eventsTable){
        console.log("No events table found");
        return;
      }

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
          return;
      }
    }

    // Functionality: populate the club news carousel (bottom left)
    async function populateMainClubNews() {
      console.log("Populating main page's club news table");
      
      // Get carousel elements
      const newsCarousel = document.getElementById('newsCarousel');
      const carouselInner = newsCarousel?.querySelector('.carousel-inner');
      const carouselIndicators = newsCarousel?.querySelector('.carousel-indicators');
      const carouselButtonIndicators = newsCarousel?.querySelector('.carousel-button-indicators');
    
      if (!carouselInner || !newsCarousel) {
        console.error("Required carousel elements not found");
        return;
      }
    
      try {
        console.log("Fetching news from Firestore...");
        const querySnapshot = await db.collection('news')
          .orderBy('createdAt', 'desc')
          .limit(10)
          .get();
    
        // Clear existing content
        carouselInner.innerHTML = '';
        if (carouselIndicators) carouselIndicators.innerHTML = '';
        if (carouselButtonIndicators) carouselButtonIndicators.innerHTML = '';
    
        if (querySnapshot.empty) {
          console.log("No news found, displaying default item");
          const defaultItem = document.createElement('div');
          defaultItem.className = 'carousel-item active';
          defaultItem.innerHTML = `
            <img src="/images/img_logo.png" class="d-block w-100 mx-auto" alt="Default news image">
            <div class="carousel-caption d-none d-md-block">
              <h5>No News Available</h5>
            </div>
          `;
          carouselInner.appendChild(defaultItem);
          
          // Hide indicators if only one item
          if (carouselIndicators) carouselIndicators.style.display = 'none';
          if (carouselButtonIndicators) carouselButtonIndicators.style.display = 'none';
        } else {
          const newsItems = querySnapshot.docs.map(doc => doc.data());
          console.log(`Found ${newsItems.length} news items`);
    
          // Create carousel items
          newsItems.forEach((data, index) => {
            const carouselItem = document.createElement('div');
            carouselItem.className = `carousel-item${index === 0 ? ' active' : ''}`;
            
            carouselItem.innerHTML = `
              <img src="${data.picture || '/images/img_logo.png'}" 
                   class="d-block w-100 mx-auto" 
                   alt="${data.newsTitle || 'News image'}"
                   onerror="this.src='/images/img_logo.png'">
              <div class="carousel-caption d-none d-md-block">
                <h5>${data.newsTitle || 'Untitled News'}</h5>
              </div>
            `;
            
            carouselInner.appendChild(carouselItem);
    
            // Create indicator if we have multiple items
            if (newsItems.length > 1 && carouselIndicators) {
              const indicator = document.createElement('button');
              indicator.type = 'button';
              indicator.dataset.bsTarget = '#newsCarousel';
              indicator.dataset.bsSlideTo = index.toString();
              if (index === 0) {
                indicator.classList.add('active');
                indicator.setAttribute('aria-current', 'true');
              }
              indicator.setAttribute('aria-label', `Slide ${index + 1}`);
              carouselIndicators.appendChild(indicator);
            }
          });
    
          // Add navigation buttons if multiple items
          if (newsItems.length > 1 && carouselButtonIndicators) {
            carouselButtonIndicators.innerHTML = `
              <button class="carousel-control-prev" type="button" data-bs-target="#newsCarousel" data-bs-slide="prev">
                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Previous</span>
              </button>
              <button class="carousel-control-next" type="button" data-bs-target="#newsCarousel" data-bs-slide="next">
                <span class="carousel-control-next-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Next</span>
              </button>
            `;
          } else {
            if (carouselIndicators) carouselIndicators.style.display = 'none';
            if (carouselButtonIndicators) carouselButtonIndicators.style.display = 'none';
          }
        }
    
        // Initialize the Bootstrap carousel
        new bootstrap.Carousel(newsCarousel);
    
      } catch (error) {
        console.error("Error fetching news:", error);
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          stack: error.stack
        });
      }
    }


    // Function to initialize dynamic updates
    function initDynamicUpdates() {
      // Wait for auth to be ready
      firebase.auth().onAuthStateChanged((user) => {
        const homeEventsTable = document.getElementById('home-events');
        
        if (homeEventsTable) {
            populateFeaturedClubs();
            populateEventsTable();
            populateMainClubNews()
        }
      });
    }
  
    // Call initDynamicUpdates when the DOM is fully loaded
    document.addEventListener('DOMContentLoaded', initDynamicUpdates);

})();
