(function () {
    // dynamicUpdates.js
    "use strict";
    
    // Page: index.html
    // Functionality: populate the featured clubs carousel (top left)
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
          });
        }
      } catch (error) {
        console.error("Error fetching featured clubs: ", error);
        return;
      }
    }

    // Page: index.html
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

// --------------------------------------------------------------------------------

    // Page: myClub.html
    // Functionality: populate the club news carousel (top left)
    async function populateClubNews() {
      console.log("Populating club news table");
      const clubName = document.getElementById('club_name');
      const clubNewsTable = document.querySelector('.carousel-inner');
      const carouselButtonIndicators = document.querySelector('.carousel-button-indicators');
      const carouselIndicators = document.querySelector('.carousel-indicators');

      if (!clubNewsTable) {
        console.log("No club news table found");
        return;
      }

      if (!clubName) {
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
              clubName.innerHTML = user.displayName;
            }
        } else {
            console.log("No user document found!");
            return;
        }

        // Fetch events from Firestore:
        // 1st Where: Only show for relevant club
        // Limit: only show 5 news
        const querySnapshot = await db.collection('news')
            .where('clubName', '==', user.displayName)
            .orderBy('createdAt')
            .limit(5)
            .get();

        // Clear existing rows
        clubNewsTable.innerHTML = '';

        // Counter to track the first item (which should be active)
        let isFirst = true;

        if (querySnapshot.empty) {
          console.log("No club news found, displaying default data.");
          
          // Add a default carousel item
          const defaultItem = document.createElement('div');
          defaultItem.className = 'carousel-item active';
          defaultItem.innerHTML = `
            <img id="newsImage1" src="/images/img_logo.png" class="d-block w-100 mx-auto" alt="Image">
            <div class="carousel-caption d-none d-md-block">
              <h5>[News Title 1]</h5>
            </div>
          `;
          clubNewsTable.appendChild(defaultItem);
        } else {

          // Create array to store all items before rendering
          const newsItems = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            newsItems.push(data);
          });

          const hasMultipleItems = newsItems.length > 1;
          // Handle carousel indicators
          if (hasMultipleItems && carouselIndicators && carouselButtonIndicators) {
            // Clear existing indicators
            carouselIndicators.innerHTML = '';
            carouselButtonIndicators.innerHTML = '';
            
            // Create indicators for each item
            newsItems.forEach((_, index) => {
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
            });
        
            // Previous button
            const prevButton = document.createElement('button');
            prevButton.className = 'carousel-control-prev';
            prevButton.type = 'button';
            prevButton.dataset.bsTarget = '#newsCarousel';
            prevButton.dataset.bsSlide = 'prev';
            prevButton.innerHTML = `
              <span class="carousel-control-prev-icon" aria-hidden="true"></span>
              <span class="visually-hidden">Previous</span>
            `;
        
            // Next button
            const nextButton = document.createElement('button');
            nextButton.className = 'carousel-control-next';
            nextButton.type = 'button';
            nextButton.dataset.bsTarget = '#newsCarousel';
            nextButton.dataset.bsSlide = 'next';
            nextButton.innerHTML = `
              <span class="carousel-control-next-icon" aria-hidden="true"></span>
              <span class="visually-hidden">Next</span>
            `;
        
            // Append buttons to container
            carouselButtonIndicators.appendChild(prevButton);
            carouselButtonIndicators.appendChild(nextButton);

          } else {
            carouselIndicators.style.display = 'none';
            carouselButtonIndicators.style.display = 'none';
          }

          querySnapshot.forEach((doc) => {
              const data = doc.data();
              const carouselItem = document.createElement('div');
              carouselItem.className = `carousel-item${isFirst ? ' active' : ''}`;

              // Create the image element
              const img = document.createElement('img');
              img.src = data.picture;
              img.className = 'd-block w-100 mx-auto';
              img.alt = data.newsTitle;

              // Create the caption container
              const caption = document.createElement('div');
              caption.className = 'carousel-caption d-none d-md-block';

              // Create the title element
              const title = document.createElement('h5');
              title.textContent = data.newsTitle;

              // Assemble the elements
              caption.appendChild(title);
              carouselItem.appendChild(img);
              carouselItem.appendChild(caption);

              // Add to carousel
              clubNewsTable.appendChild(carouselItem);

              // Update first item flag
              isFirst = false;
          });
        }
      } catch (error) {
          console.error("Error fetching events: ", error);
          return;
      }
    }

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

          if (querySnapshot.empty) {
            console.log("No club events found, displaying default data.");
            
            // Add a default row to the table
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>Event Name</td>
                <td>MM/DD/YYYY</td>
                <td>XX:YY PM</td>
                <td>Room #</td>
            `;

            clubEventsTable.appendChild(row);
          } else {
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
          }
      } catch (error) {
          console.error("Error fetching events: ", error);
          return;
      }
    }

    // Page: myClub.html
    // Functionality: populate the cabinet table (bottom left)
    async function populateClubCabinetTable() {
      console.log("Populating club cabinet table");
      const clubCabinetTable = document.querySelector("#clubCabinet tbody");
      if (!clubCabinetTable) {
          console.log("No club cabinet table found");
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
        // Fetch events from Firestore:
        // Where: Only show for relevant club
        const querySnapshot = await db.collection('clubs')
          .where('name', '==', user.displayName)
          .get();

        clubCabinetTable.innerHTML = '';

        if (querySnapshot.empty) {
          console.log("No matching club found");
          return;
        }

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const cabinetMembers = data.cabinetMembers;
    
          if (!cabinetMembers) {
            console.log("No cabinet members found, displaying default data.");
            const defaultMembers = [
              { name: "Default Name", position: "President", major: "Default Major", year: "XXXX" },
              { name: "Default Name", position: "Vice-President", major: "Default Major", year: "XXXX" },
              { name: "Default Name", position: "Treasurer", major: "Default Major", year: "XXXX" },
              { name: "Default Name", position: "Secretary", major: "Default Major", year: "XXXX" },
            ];
    
            defaultMembers.forEach(member => {
              const row = document.createElement('tr');
              row.innerHTML = `
                <td>${member.name}</td>
                <td>${member.position}</td>
                <td>${member.major}</td>
                <td>${member.year}</td>
              `;
              clubCabinetTable.appendChild(row);
            });
          } else {
            console.log("Cabinet members found, populating table.");

            // Define the desired order of positions
            const positionOrder = ["President", "Vice-President", "Treasurer", "Secretary"];
            
            // Sort the cabinet members array based on the positionOrder
            const sortedCabinetMembers = Object.values(cabinetMembers).sort((a, b) => {
              return positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position);
            });
            
            // Loop through the sorted cabinet members
            sortedCabinetMembers.forEach(member => {
              const row = document.createElement('tr');
              row.innerHTML = `
                <td>${member.name}</td>
                <td>${member.position}</td>
                <td>${member.major}</td>
                <td>${member.grade}</td>
              `;
              clubCabinetTable.appendChild(row);
            });
          }
        });
      } catch (error) {
          console.error("Error fetching events: ", error);
          return;
      }
    }

    // Page: myClub.html
    // Functionality: populate the social media table (bottom right)
    async function populateSocialMediaTable() {
      console.log("Populating social media table");
      const socialMediaTable = document.querySelector("#socialMedia tbody");
      if (!socialMediaTable) {
          console.log("No social media table found");
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
        // Fetch events from Firestore:
        // Where: Only show for relevant club
        const querySnapshot = await db.collection('publicClubProfiles')
          .where('clubName', '==', user.displayName)
          .get();

        socialMediaTable.innerHTML = '';

        if (querySnapshot.empty) {
          console.log("No matching club found");
          return;
        }

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const socialMedia = data.socialMedia;
    
          if (!socialMedia) {
            console.log("No social media found, displaying default data.");
            const defaultSocialMedia = [
              { social: "Default Name", tag: "Default Tag"},
              { social: "Default Name", tag: "Default Tag"},
              { social: "Default Name", tag: "Default Tag"},
              { social: "Default Name", tag: "Default Tag"},
            ];
    
            defaultSocialMedia.forEach(site => {
              const row = document.createElement('tr');
              row.innerHTML = `
                <td>${site.social}</td>
                <td>${site.tag}</td>
              `;
              socialMediaTable.appendChild(row);
            });
          } else {
             // Social media found, populating table.
             const positionOrder = ["Website", "Insta", "TikTok", "Discord", "GitHub", "LinkedIn"];
            
             // Convert socialMedia into an array if needed
             const socialMediaArray = Array.isArray(socialMedia) ? socialMedia : Object.values(socialMedia);
             
             // Sort the social media array based on positionOrder
             const sortedSocialMedia = socialMediaArray.sort((a, b) => {
               const indexA = positionOrder.indexOf(a.social);
               const indexB = positionOrder.indexOf(b.social);
               
               // Treat items not in positionOrder as lowest priority
               return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
             });
             
             // Populate the table
             sortedSocialMedia.forEach(site => {
               const row = document.createElement('tr');
               row.innerHTML = `
                 <td>${site.social}</td>
                 <td> <a href="${site.link}" target="_blank" rel="noopener noreferrer">${site.tag}</a> </td>
               `;
               socialMediaTable.appendChild(row);
             });
          }
        });
      } catch (error) {
          console.error("Error fetching events: ", error);
          return;
      }
    }

    // Page: myClub.html
    // Functionality: populate the email (bottom)
    async function populateEmail() {
      console.log("Populating email");
      const email = document.getElementById("email");
      if (!email) {
          console.log("No email found");
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
        // Fetch events from Firestore:
        // Where: Only show for relevant club
        const querySnapshot = await db.collection('clubs')
          .where('name', '==', user.displayName)
          .get();

        email.innerHTML = '';
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Create an anchor element for the email
          const anchor = document.createElement('a');
        
          // Set the anchor's attributes and content
          anchor.href = `mailto:${data.email}`;
          anchor.className = "text-primary fs-6 text-decoration-underline";
          anchor.textContent = data.email;
        
          // Create a heading element for the email
          const heading = document.createElement('h6');
          heading.className = "mb-0";
          heading.textContent = "Reach out to our Club:";

          // Append the anchor to the email container
          email.appendChild(heading);
          email.appendChild(anchor);
        });
      } catch (error) {
          console.error("Error fetching events: ", error);
          return;
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
                populateClubCabinetTable();
                populateSocialMediaTable();
                populateEmail()
              }
          }
      });
    }
  
    // Call initDynamicUpdates when the DOM is fully loaded
    document.addEventListener('DOMContentLoaded', initDynamicUpdates);

})();
