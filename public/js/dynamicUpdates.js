(function () {
  // dynamicUpdates.js
    "use strict";
    
    // Page: index.html
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

    // Page: index.html
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

              // Create the edit button
              const editbtn = document.createElement('button');
              editbtn.className = 'btn btn-sm btn-warning text-white edit-button edit-mode-only';
              editbtn.innerHTML = '<i class="bi bi-pencil-square me-1"></i>';

              // Create the delete button
              const deletebtn = document.createElement('button');
              deletebtn.className = 'btn btn-sm btn-danger text-white delete-button edit-mode-only';
              deletebtn.innerHTML = '<i class="bi bi-trash me-1"></i>';

              // Assemble the elements
              caption.appendChild(title);
              caption.appendChild(editbtn);
              caption.appendChild(deletebtn);
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
                    <td class="edit-mode-only">
                      <button class="btn btn-sm btn-warning text-white edit-button event" data-event-id="${doc.id}">
                        <i class="bi bi-pencil-square me-1"></i>
                      </button>

                      <button class="btn btn-sm btn-danger text-white delete-button event" data-event-id="${doc.id}">
                        <i class="bi bi-trash me-1"></i>
                      </button>
                    </td>
                `;

                clubEventsTable.appendChild(row);
            });
            
            // Add event listeners to all delete buttons
            const deleteEventButtons = document.querySelectorAll('.delete-button.event');
            deleteEventButtons.forEach(button => {
              button.addEventListener('click', () => {
                const eventId = button.getAttribute('data-event-id');
                if (eventId) {
                  deleteClubEvent(eventId);
                } else {
                  console.error('Event ID not found for this button');
                }
              });
            });
                        
            // Add event listeners to all edit buttons
            const editEventButtons = document.querySelectorAll('.edit-button.event');
            editEventButtons.forEach(button => {
                button.addEventListener('click', async () => {
                    const eventId = button.getAttribute('data-event-id');
                    if (eventId) {
                        try {
                            const docRef = firebase.firestore().collection('events').doc(eventId);
                            const docSnap = await docRef.get();
                            
                            if (docSnap.exists) {
                                const eventData = docSnap.data();
                                eventData.id = eventId;
                                showEditEventModal(eventData);
                            } else {
                                console.error('No such document!');
                            }
                        } catch (error) {
                            console.error('Error getting document:', error);
                        }
                    } else {
                        console.error('Event ID not found for this button');
                    }
                });
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
                <td class="edit-mode-only">
                  <button class="btn btn-sm btn-warning text-white edit-button">
                    <i class="bi bi-pencil-square me-1"></i>
                  </button>

                  <button class="btn btn-sm btn-danger text-white delete-button">
                    <i class="bi bi-trash me-1"></i>
                  </button>
                </td>
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
                 <td class="edit-mode-only">
                    <button class="btn btn-sm btn-warning text-white edit-button">
                      <i class="bi bi-pencil-square me-1"></i>
                    </button>

                    <button class="btn btn-sm btn-danger text-white delete-button">
                      <i class="bi bi-trash me-1"></i>
                    </button>
                 </td>
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

    // Page: myClub.html
    // Functionality: populate the social media table (bottom right)
    async function updateMyClubNewsDB() {

    }

  // -------------------------------------------------------------------------------- 

    document.addEventListener('DOMContentLoaded', () => {
      // Add button click handler to open modal
      const addButton = document.getElementById('addEventForm');
      addButton.addEventListener('click', () => {
        const createEventModal = new bootstrap.Modal(document.getElementById('createEventModal'));
        createEventModal.show();
      });
    
      // Add form submit handler
      const createEventForm = document.getElementById('createEventForm');
      createEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await createClubEvent();
      });
    });
    
    async function createClubEvent() {
      // Get form values
      const eventTitle = document.getElementById('eventTitle').value;
      const eventDate = document.getElementById('eventDate').value;
      const startTime = document.getElementById('startTime').value;
      const endTime = document.getElementById('endTime').value;
      const location = document.getElementById('location').value;
    
      // Form validation
      if (!eventTitle || !eventDate || !startTime || !endTime || !location) {
        console.error('All fields are required');
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
        // Get club name from user document
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
          console.error('User document not found');
          return;
        }
        
        const userData = userDoc.data();
        const clubName = userData.displayName;
    
        // Create the event document
        const newEvent = {
          clubName: clubName,
          createdBy: user.uid,
          date: eventDate,
          endTime: endTime,
          location: location,
          startTime: startTime,
          title: eventTitle,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
    
        // Add the document to Firestore
        await firebase.firestore().collection('events').add(newEvent);
    
        // Clear the form
        document.getElementById('createEventForm').reset();
        
        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('createEventModal'));
        modal.hide();
    
        // Show success message
        alert('Event created successfully!');
    
        // Refresh tables if they exist
        if (typeof populateClubEventsTable === 'function') {
          await populateClubEventsTable();
        }
        if (typeof populateEventsTable === 'function') {
          await populateEventsTable();
        }

      } catch (error) {
        console.error('Error adding event: ', error);
        alert('Error creating event. Please try again.');
      }
    }

    // Function to handle event deletion
    async function deleteClubEvent(eventId) {
      console.log(`Deleting event with ID: ${eventId}`);
      if (!eventId) {
        console.error('No event ID provided');
        return;
      }
    
      try {
        // Get current user
        const user = firebase.auth().currentUser;
        if (!user) {
          throw new Error('User not logged in');
        }
    
        // Simple confirmation
        if (confirm('Are you sure you want to delete this event?')) {
          // Get event data to verify ownership
          const eventDoc = await db.collection('events').doc(eventId).get();
          
          if (!eventDoc.exists) {
            throw new Error('Event not found');
          }
    
          const eventData = eventDoc.data();
          
          // Verify user has permission to delete
          if (eventData.clubName !== user.displayName) {
            throw new Error('You do not have permission to delete this event');
          }
    
          // Delete the event
          await db.collection('events').doc(eventId).delete();
    
          // Refresh tables if they exist
          if (typeof populateClubEventsTable === 'function') {
            await populateClubEventsTable();
          }
          if (typeof populateEventsTable === 'function') {
            await populateEventsTable();
          }
    
          alert('Event deleted successfully!');
        }
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('Error deleting event: ' + error.message);
      }
    }

    function showEditEventModal(eventData) {
      // Only try to close the details modal if it exists
      const eventDetailsModalEl = document.getElementById('eventDetailsModal');
      if (eventDetailsModalEl) {
          const eventDetailsModal = bootstrap.Modal.getInstance(eventDetailsModalEl);
          if (eventDetailsModal) {
              eventDetailsModal.hide();
          }
      }
      
      // Populate the edit form with current event data
      document.getElementById('editEventTitle').value = eventData.title || '';
      document.getElementById('editEventDate').value = eventData.date || '';
      document.getElementById('editStartTime').value = eventData.startTime || '';
      document.getElementById('editEndTime').value = eventData.endTime || '';
      document.getElementById('editLocation').value = eventData.location || '';
      document.getElementById('editEventId').value = eventData.id || '';
  
      // Show the edit modal
      const editEventModal = new bootstrap.Modal(document.getElementById('editEventModal'));
      editEventModal.show();
  }

  document.getElementById('editEventForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const form = e.target;
    // Check if the form is valid
    if (!form.checkValidity()) {
        e.stopPropagation();
        form.classList.add('was-validated');
        return;
    }

    form.classList.add('was-validated');

    // Get form values
    const eventId = document.getElementById('editEventId').value;
    
    // Add this check
    if (!eventId) {
        alert('Error: Could not find event ID');
        return;
    }

    const title = document.getElementById('editEventTitle').value.trim();
    const date = document.getElementById('editEventDate').value;
    const startTime = document.getElementById('editStartTime').value;
    const endTime = document.getElementById('editEndTime').value;
    const location = document.getElementById('editLocation').value.trim();
  
    // Additional validation: Ensure endTime is after startTime
    if (endTime <= startTime) {
      alert('End time must be after start time.');
      return;
    }
  
    // Update the event in Firestore
    db.collection('events').doc(eventId).update({
      title: title,
      date: date,
      startTime: startTime,
      endTime: endTime,
      location: location
    })
    .then(() => {
      // Remove focus from any elements inside the modal before closing
      document.activeElement.blur();

      // Close the modal
      const editEventModalEl = document.getElementById('editEventModal');
      const editEventModal = bootstrap.Modal.getInstance(editEventModalEl);
      editEventModal.hide();
  
      // Reset the form
      form.classList.remove('was-validated');
  
      // Show success message
      alert('Event updated successfully!');

      // Refresh tables if they exist
      if (typeof populateClubEventsTable === 'function') {
        populateClubEventsTable();
      }
      if (typeof populateEventsTable === 'function') {
        populateEventsTable();
      }
    })
    .catch((error) => {
      console.error('Error updating event: ', error);
      alert('Error updating event: ' + error.message);
    });
  });

    // --------------------------------------------------------------------------------

    async function updateMyClubCabinetDB() {

    }

    async function updateMySocialMediaDB() {

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
                  populateFeaturedClubs();
                  populateEventsTable();
                  populateMainClubNews()
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
