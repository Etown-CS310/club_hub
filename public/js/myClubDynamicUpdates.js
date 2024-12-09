(function () {
  // myClubDynamicUpdates.js
  "use strict";

  // ***************************** Populate Tables ******************************************* //

  // ----------------------------------------------------------------------------------------- //
  // Functionality: populate the club news carousel (top left)
  async function populateClubNews() {
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
      // Limit: only show 10 news
      const querySnapshot = await db.collection('news')
          .where('clubName', '==', user.displayName)
          .orderBy('createdAt')
          .limit(10)
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
            <span class="carousel-control-prev-icon"></span>
            <span class="visually-hidden">Previous</span>
          `;
      
          // Next button
          const nextButton = document.createElement('button');
          nextButton.className = 'carousel-control-next';
          nextButton.type = 'button';
          nextButton.dataset.bsTarget = '#newsCarousel';
          nextButton.dataset.bsSlide = 'next';
          nextButton.innerHTML = `
            <span class="carousel-control-next-icon"></span>
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
            editbtn.className = 'btn btn-sm btn-warning text-white edit-button news edit-mode-only';
            editbtn.setAttribute('data-news-id', doc.id);
            editbtn.innerHTML = '<i class="bi bi-pencil-square me-1"></i>';

            // Create the delete button
            const deletebtn = document.createElement('button');
            deletebtn.className = 'btn btn-sm btn-danger text-white delete-button news edit-mode-only';
            deletebtn.setAttribute('data-news-id', doc.id);
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

        // Add event listeners to all delete buttons
        const deleteNewsButtons = document.querySelectorAll('.delete-button.news');
        deleteNewsButtons.forEach(button => {
          button.addEventListener('click', () => {
            const newsId = button.getAttribute('data-news-id');
            if (newsId) {
              deleteClubNews(newsId);
            } else {
              console.error('News ID not found for this button');
            }
          });
        });

        // Add event listeners to all edit buttons
        const editNewsButtons = document.querySelectorAll('.edit-button.news');
        editNewsButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const newsId = button.getAttribute('data-news-id');
                if (newsId) {
                    try {
                        const docRef = firebase.firestore().collection('news').doc(newsId);
                        const docSnap = await docRef.get();
                        
                        if (docSnap.exists) {
                            const newsData = docSnap.data();
                            newsData.id = newsId;
                            showEditNewsModal(newsData);
                        } else {
                            console.error('No such document!');
                        }
                    } catch (error) {
                        console.error('Error getting document:', error);
                    }
                } else {
                    console.error('News ID not found for this button');
                }
            });
        });
      }
    } catch (error) {
        console.error("Error fetching news: ", error);
        return;
    }
  }

  // ----------------------------------------------------------------------------------------- //
  // Functionality: populate the events table (top right)
  async function populateClubEventsTable() {
    const clubEventsTable = document.getElementById('club-events');
    if (!clubEventsTable) {
        console.log("No club events table found");
        return;
    }
    
    // Get current user
    const user = firebase.auth().currentUser;
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

  // ----------------------------------------------------------------------------------------- //
  // Functionality: populate the cabinet table (bottom left)
  async function populateClubCabinetTable() {
    const clubCabinetTable = document.querySelector("#clubCabinet tbody");
    if (!clubCabinetTable) {
        console.log("No club cabinet table found");
        return;
    }
    
    // Get current user
    const user = firebase.auth().currentUser;
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

          // Define the desired order of positions
          const positionOrder = ["President", "Vice-President", "Treasurer", "Secretary"];
          
          // Sort the cabinet members array based on the positionOrder
          const sortedCabinetMembers = Object.values(cabinetMembers).sort((a, b) => {
            // Get the index of each position in the positionOrder array, or use a large index if the position is not found
            const indexA = positionOrder.indexOf(a.position) === -1 ? positionOrder.length : positionOrder.indexOf(a.position);
            const indexB = positionOrder.indexOf(b.position) === -1 ? positionOrder.length : positionOrder.indexOf(b.position);

            return indexA - indexB;
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
                <button class="btn btn-sm btn-warning text-white edit-button cabinet" data-cabinet-id="${member.position}">
                  <i class="bi bi-pencil-square me-1"></i>
                </button>

                <button class="btn btn-sm btn-danger text-white delete-button cabinet" data-cabinet-id="${member.position}">
                  <i class="bi bi-trash me-1"></i>
                </button>
              </td>
            `;
            clubCabinetTable.appendChild(row);
          });
        }
      });

      // Add event listeners to all delete buttons
      const deleteCabinetButtons = document.querySelectorAll('.delete-button.cabinet');
      deleteCabinetButtons.forEach(button => {
        button.addEventListener('click', () => {
          const cabinetId = button.getAttribute('data-cabinet-id');
          if (cabinetId) {
            deleteClubCabinet(cabinetId);
          } else {
            console.error('Cabinet Member ID not found for this button');
          }
        });
      });

      // Add event listeners to all edit buttons
      const editCabinetButtons = document.querySelectorAll('.edit-button.cabinet');
      editCabinetButtons.forEach(button => {
        button.addEventListener('click', async () => {
          // Get the position (cabinetId) from the data attribute of the button
          const cabinetId = button.getAttribute('data-cabinet-id');

          if (cabinetId) {
            try {
              // Get current user
              const user = firebase.auth().currentUser;
              if (!user) {
                throw new Error('User not logged in');
              }

              // Get club name from the current user
              const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
              if (!userDoc.exists) {
                throw new Error('User document not found');
              }

              const userData = userDoc.data();
              const clubName = userData.displayName;

              // Query the clubs collection to find the club by name
              const clubQuerySnapshot = await firebase.firestore().collection('clubs').where('name', '==', clubName).get();

              if (clubQuerySnapshot.empty) {
                throw new Error(`No club found for ${clubName}`);
              }

              // Get the club document reference
              const clubDocRef = clubQuerySnapshot.docs[0].ref;

              // Get the current cabinet members
              const clubDoc = await clubDocRef.get();
              const cabinetMembers = clubDoc.data().cabinetMembers;

              if (!cabinetMembers || !cabinetMembers[cabinetId]) {
                throw new Error(`Cabinet member with ID ${cabinetId} not found`);
              }

              // Fetch the cabinet member to be edited
              const cabinetMember = cabinetMembers[cabinetId];
              cabinetMember.id = cabinetId;
              
              // Open modal to edit cabinet member details
              showEditCabinetModal(cabinetMember);

            } catch (error) {
              console.error('Error editing cabinet member:', error);
              alert('Error editing cabinet member: ' + error.message);
            }
          } else {
            console.error('Cabinet ID or position not found for this button');
          }
        });
      });

    } catch (error) {
        console.error("Error fetching cabinet: ", error);
        return;
    }
  }

  // ----------------------------------------------------------------------------------------- //
  // Functionality: populate the social media table (bottom right)
  async function populateSocialMediaTable() {
    const socialMediaTable = document.querySelector("#socialMedia tbody");
    if (!socialMediaTable) {
        console.log("No social media table found");
        return;
    }
    
    // Get current user
    const user = firebase.auth().currentUser;
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
                <button class="btn btn-sm btn-warning text-white edit-button social" data-social-id="${site.social}">
                  <i class="bi bi-pencil-square me-1"></i>
                </button>

                <button class="btn btn-sm btn-danger text-white delete-button social" data-social-id="${site.social}">
                  <i class="bi bi-trash me-1"></i>
                </button>
              </td>
            `;
            socialMediaTable.appendChild(row);
          });
        }
      });

      // Add event listeners to all delete buttons
      const deleteSocialButtons = document.querySelectorAll('.delete-button.social');
      deleteSocialButtons.forEach(button => {
        button.addEventListener('click', () => {
          const socialId = button.getAttribute('data-social-id');
          if (socialId) {
            deleteClubSocial(socialId);
          } else {
            console.error('Social Media ID not found for this button');
          }
        });
      });

      // Add event listeners to all edit buttons
      const editSocialButtons = document.querySelectorAll('.edit-button.social');
      editSocialButtons.forEach(button => {
        button.addEventListener('click', async () => {
          // Get the social (socialId) from the data attribute of the button
          const socialId = button.getAttribute('data-social-id');

          if (socialId) {
            try {
              // Get current user
              const user = firebase.auth().currentUser;
              if (!user) {
                throw new Error('User not logged in');
              }

              // Get club name from the current user
              const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
              if (!userDoc.exists) {
                throw new Error('User document not found');
              }

              const userData = userDoc.data();
              const clubName = userData.displayName;

              // Query the clubs collection to find the club by name
              const clubQuerySnapshot = await firebase.firestore().collection('publicClubProfiles').where('clubName', '==', clubName).get();

              if (clubQuerySnapshot.empty) {
                throw new Error(`No club found for ${clubName}`);
              }

              // Get the club document reference
              const clubDocRef = clubQuerySnapshot.docs[0].ref;

              // Get the current cabinet members
              const clubDoc = await clubDocRef.get();
              const socialMedias = clubDoc.data().socialMedia;

              if (!socialMedias || !socialMedias[socialId]) {
                throw new Error(`Social media with ID ${socialId} not found`);
              }

              // Fetch the social media to be edited
              const socialMedia = socialMedias[socialId];
              socialMedia.id = socialId;
              
              // Open modal to edit cabinet member details
              showEditSocialModal(socialMedia);

            } catch (error) {
              console.error('Error editing social media:', error);
              alert('Error editing social media: ' + error.message);
            }
          } else {
            console.error('Social ID or social not found for this button');
          }
        });
      });

    } catch (error) {
        console.error("Error fetching social media: ", error);
        return;
    }
  }

  // ----------------------------------------------------------------------------------------- //
  // Functionality: populate the email (bottom)
  async function populateEmail() {
    const email = document.getElementById("email");
    if (!email) {
        console.log("No email found");
        return;
    }
    
    // Get current user
    const user = firebase.auth().currentUser;
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

  // ***************************** Create, Read, Delete Tables ********************************* //

  // ----------------------------------------------------------------------------------------- //
  // Functionality: Update the club news carousel (top left)
  function previewImage(input) {
    const preview = document.getElementById('preview');
    const previewDiv = document.getElementById('imagePreview');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.src = e.target.result;
            previewDiv.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    } else {
        preview.src = '#';
        previewDiv.style.display = 'none';
    }
  }

  // Bind the function to the file input
  document.getElementById('picture').addEventListener('change', function () {
      previewImage(this);
  });

  // Bind the function to the file input
    document.getElementById('editPicture').addEventListener('change', function () {
      previewImage(this);
  });

  // Upload image function
  function uploadImage(imageFile) {
    return new Promise((resolve, reject) => {
      const user = firebase.auth().currentUser;

      if (user) {
        // Refresh the token to ensure it is up-to-date
        user.getIdToken(true).then((idToken) => {

          // Ensure the file exists before proceeding
          if (imageFile) {
            const storageRef = firebase.storage().ref();
            const timestamp = Date.now();
            const fileRef = storageRef.child(`news_pictures/${timestamp}_${imageFile.name}`);

            // Start the upload task
            const uploadTask = fileRef.put(imageFile);

            // Monitor the upload progress
            uploadTask.on('state_changed',
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              },
              (error) => {
                // Handle upload errors
                console.error("Error during upload:", error);
                reject(error); // Reject the promise on error
              },
              () => {
                // Upload complete, get the download URL
                uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                  resolve(downloadURL); // Resolve the promise with the download URL
                }).catch((error) => {
                  console.error("Error getting download URL:", error);
                  reject(error); // Reject the promise if fetching the download URL fails
                });
              }
            );
          } else {
            reject("No file selected");
          }
        }).catch((error) => {
          console.error("Error refreshing token:", error);
          reject(error); // Reject the promise if token refresh fails
        });
      } else {
        console.error("User is not authenticated");
        reject("User is not authenticated");
      }
    });
  }

  async function createClubNews() {
    try {
        // Form validation
        const newsTitle = document.getElementById('newsTitle').value.trim();
        const description = document.getElementById('description').value.trim();
        const imageInput = document.getElementById('picture');
        const imageFile = imageInput?.files?.[0];

        // Validate all required fields
        const validationErrors = [];
        if (!newsTitle) validationErrors.push('News title is required');
        if (!description) validationErrors.push('Description is required');
        if (!imageFile) validationErrors.push('Image is required');
        
        if (validationErrors.length > 0) {
            throw new Error(validationErrors.join('\n'));
        }

        // Get current user
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error('Please log in to create news');
        }

        // Show loading state
        const submitButton = document.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = 'Creating news...';

        // Get user data
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            throw new Error('User profile not found');
        }

        const userData = userDoc.data();
        
        // Upload image and get the URL
        const imageUrl = await uploadImage(imageFile);

        // Create news document
        const newNews = {
            clubName: userData.displayName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            description,
            newsTitle,
            picture: imageUrl,
            createdBy: user.uid,
            lastModified: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Add to Firestore
        await firebase.firestore().collection('news').add(newNews);

        // Reset form
        document.getElementById('createNewsForm').reset();
        document.getElementById('imagePreview').style.display = 'none';

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('createNewsModal'));
        modal.hide();

        // Show success message
        alert('News created successfully!');

    } catch (error) {
        console.error('Error in createClubNews:', error);
        alert(error.message || 'Failed to create news. Please try again.');
    } finally {
        // Reset button state
        const submitButton = document.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.innerHTML = 'Create News';
    }
  }

  // Function to handle event deletion
  async function deleteClubNews(newsId) {
    if (!newsId) {
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
      if (confirm('Are you sure you want to delete this news?')) {
        // Get event data to verify ownership
        const newsDoc = await db.collection('news').doc(newsId).get();
        
        if (!newsDoc.exists) {
          throw new Error('News not found');
        }
  
        const newsData = newsDoc.data();
        
        // Verify user has permission to delete
        if (newsData.clubName !== user.displayName) {
          throw new Error('You do not have permission to delete this news');
        }
  
        // Delete the event
        await db.collection('news').doc(newsId).delete();
  
        // Refresh tables if they exist
        if (typeof populateClubNews === 'function') {
          await populateClubNews();
        }
  
        alert('News deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting news:', error);
      alert('Error deleting news: ' + error.message);
    }
  }

  function showEditNewsModal(newsData) {
    // Populate the form fields
    document.getElementById('editNewsTitle').value = newsData.newsTitle || '';
    document.getElementById('editDescription').value = newsData.description || '';
    document.getElementById('editNewsId').value = newsData.id || '';

    // Show the modal
    const editNewsModal = new bootstrap.Modal(document.getElementById('editNewsModal'));
    editNewsModal.show();
  }

  // ----------------------------------------------------------------------------------------- //
  // Functionality: Update the events table (top right)

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

    } catch (error) {
      console.error('Error adding event: ', error);
      alert('Error creating event. Please try again.');
    }
  }

  // Function to handle event deletion
  async function deleteClubEvent(eventId) {
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
  
        alert('Event deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error deleting event: ' + error.message);
    }
  }

  function showEditEventModal(eventData) { 
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

  // ----------------------------------------------------------------------------------------- //
  // Functionality: Update the cabinet table (bottom left)

  async function createClubCabinet() {
    // Get form values
    const grade = document.getElementById('grade').value;
    const major = document.getElementById('major').value;
    const name = document.getElementById('name').value;
    const position = document.getElementById('position').value;
  
    // Form validation
    if (!grade || !major || !name || !position) {
      console.error('All fields are required');
      return;
    }
  
    // Get current user
    const user = firebase.auth().currentUser;
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
    
      // Ensure that the clubName exists
      if (!clubName) {
        console.error('Club name is missing');
        return;
      }

      // Query for the club document based on the clubName field
      const clubQuerySnapshot = await firebase.firestore().collection('clubs').where('name', '==', clubName).get();

      // Check if the club document exists
      if (clubQuerySnapshot.empty) {
        console.error(`No club document found for ${clubName}`);
        alert('No club found for this name. Please check and try again.');
        return;
      }

      // Get the first document (there should be only one matching document)
      const clubDocRef = clubQuerySnapshot.docs[0].ref;
    
      // Create the cabinet member object
      const newMember = {
        grade: grade,
        major: major,
        name: name,
        position: position
      };
    
      // Update the cabinetMembers map inside the specific club document
      await clubDocRef.update({
        [`cabinetMembers.${position}`]: newMember // Position as the key for the new member
      });
    
      // Clear the form
      document.getElementById('createCabinetForm').reset();
      
      // Close the modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('createCabinetModal'));
      modal.hide();
    
      // Show success message
      alert('Cabinet member added successfully!');
    
      // Refresh tables if they exist
      if (typeof populateClubCabinetTable === 'function') {
        await populateClubCabinetTable();
      }
    
    } catch (error) {
      console.error('Error adding cabinet member: ', error);
      alert('Error creating cabinet member. Please try again.');
    }
  }

  // Function to handle cabinet member deletion
  async function deleteClubCabinet(cabinetId) {
    // Ensure a valid cabinetId is provided
    if (!cabinetId) {
      console.error('No cabinet ID provided');
      alert('No cabinet ID provided');
      return;
    }

    try {
      // Get current user
      const user = firebase.auth().currentUser;
      if (!user) {
        throw new Error('User not logged in');
      }

      // Simple confirmation
      if (confirm('Are you sure you want to delete this member?')) {
        // Get club name from the current user
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
          throw new Error('User document not found');
        }

        const userData = userDoc.data();
        const clubName = userData.displayName;

        // Query the clubs collection to find the club by name
        const clubQuerySnapshot = await firebase.firestore().collection('clubs').where('name', '==', clubName).get();

        if (clubQuerySnapshot.empty) {
          throw new Error(`No club found for ${clubName}`);
        }

        // Get the club document reference
        const clubDocRef = clubQuerySnapshot.docs[0].ref;

        // Get the current cabinet members
        const clubDoc = await clubDocRef.get();
        const cabinetMembers = clubDoc.data().cabinetMembers;

        if (!cabinetMembers || !cabinetMembers[cabinetId]) {
          throw new Error(`Cabinet member with ID ${cabinetId} not found`);
        }

        // Delete the cabinet member
        await clubDocRef.update({
          [`cabinetMembers.${cabinetId}`]: firebase.firestore.FieldValue.delete()
        });

        // Refresh tables if they exist
        if (typeof populateClubCabinetTable === 'function') {
          await populateClubCabinetTable();
        }

        // Show success message
        alert('Cabinet member deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting cabinet member:', error);
      alert('Error deleting cabinet member: ' + error.message);
    }
  }

  function showEditCabinetModal(cabinetData) { 
    // Populate the edit form with current event data
    document.getElementById('editGrade').value = cabinetData.grade || '';
    document.getElementById('editMajor').value = cabinetData.major || '';
    document.getElementById('editName').value = cabinetData.name || '';
    document.getElementById('editPosition').value = cabinetData.position || '';
    document.getElementById('editCabinetId').value = cabinetData.id || '';

    // Show the edit modal
    const editCabinetModal = new bootstrap.Modal(document.getElementById('editCabinetModal'));
    editCabinetModal.show();
  }

  // ----------------------------------------------------------------------------------------- //
  // Functionality: Update the social media table (bottom right)

  async function createClubSocial() {
    // Get form values
    const link = document.getElementById('link').value;
    const social = document.getElementById('social').value;
    const tag = document.getElementById('tag').value;
  
    // Form validation
    if (!link || !social || !tag) {
      console.error('All fields are required');
      return;
    }
  
    // Get current user
    const user = firebase.auth().currentUser;
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
    
      // Ensure that the clubName exists
      if (!clubName) {
        console.error('Club name is missing');
        return;
      }

      // Query for the club document based on the clubName field
      const clubQuerySnapshot = await firebase.firestore().collection('publicClubProfiles').where('clubName', '==', clubName).get();

      // Check if the club document exists
      if (clubQuerySnapshot.empty) {
        console.error(`No club document found for ${clubName}`);
        alert('No club found for this name. Please check and try again.');
        return;
      }

      // Get the first document (there should be only one matching document)
      const clubDocRef = clubQuerySnapshot.docs[0].ref;
    
      // Create the cabinet member object
      const newSocial = {
        social: social,
        link: link,
        tag: tag
      };
    
      // Update the socialMedia map inside the specific club document
      await clubDocRef.update({
        [`socialMedia.${social}`]: newSocial // Social as the key for the new social media
      });
    
      // Clear the form
      document.getElementById('createSocialForm').reset();
      
      // Close the modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('createSocialModal'));
      modal.hide();
    
      // Show success message
      alert('Social media added successfully!');
    
      // Refresh tables if they exist
      if (typeof populateSocialMediaTable === 'function') {
        await populateSocialMediaTable();
      }
    
    } catch (error) {
      console.error('Error adding social media: ', error);
      alert('Error creating social media. Please try again.');
    }
  }

  // Function to handle social media deletion
  async function deleteClubSocial(socialId) {
    // Ensure a valid socialId is provided
    if (!socialId) {
      console.error('No social ID provided');
      alert('No social ID provided');
      return;
    }

    try {
      // Get current user
      const user = firebase.auth().currentUser;
      if (!user) {
        throw new Error('User not logged in');
      }

      // Simple confirmation
      if (confirm('Are you sure you want to delete this member?')) {
        // Get club name from the current user
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
          throw new Error('User document not found');
        }

        const userData = userDoc.data();
        const clubName = userData.displayName;

        // Query the clubs collection to find the club by name
        const clubQuerySnapshot = await firebase.firestore().collection('publicClubProfiles').where('clubName', '==', clubName).get();

        if (clubQuerySnapshot.empty) {
          throw new Error(`No club found for ${clubName}`);
        }

        // Get the club document reference
        const clubDocRef = clubQuerySnapshot.docs[0].ref;

        // Get the current cabinet members
        const clubDoc = await clubDocRef.get();
        const cabinetMembers = clubDoc.data().socialMedia;

        if (!cabinetMembers || !cabinetMembers[socialId]) {
          throw new Error(`Social media with ID ${socialId} not found`);
        }

        // Delete the cabinet member
        await clubDocRef.update({
          [`socialMedia.${socialId}`]: firebase.firestore.FieldValue.delete()
        });

        // Refresh tables if they exist
        if (typeof populateSocialMediaTable === 'function') {
          await populateSocialMediaTable();
        }

        // Show success message
        alert('Social media deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting social media:', error);
      alert('Error deleting social media: ' + error.message);
    }
  }

  function showEditSocialModal(socialData) { 
    // Populate the edit form with current event data
    document.getElementById('editSocial').value = socialData.social || '';
    document.getElementById('editTag').value = socialData.tag || '';
    document.getElementById('editLink').value = socialData.link || '';
    document.getElementById('editSocialId').value = socialData.id || '';

    // Show the edit modal
    const editSocialModal = new bootstrap.Modal(document.getElementById('editSocialModal'));
    editSocialModal.show();
  }

  // ***************************** Dynamically Initialize Page ********************************* //
  function initializeMyClubPage() {
    
      // Handle create modal and form:
      /* 1) Event
      /* 2) News
      /* 3) Cabinet Member
      /* 4) Social Media */

      const addEventButton = document.getElementById('addEventForm');
      if (addEventButton) {
        addEventButton.addEventListener('click', () => {
          const createEventModal = new bootstrap.Modal(document.getElementById('createEventModal'));
          createEventModal.show();
        });
      }

      const addNewsButton = document.getElementById('addNewsForm');
      if (addNewsButton) {
        addNewsButton.addEventListener('click', () => {
          const createNewsModal = new bootstrap.Modal(document.getElementById('createNewsModal'));
          createNewsModal.show();
        });
      }

      const addCabinetButton = document.getElementById('addCabinetForm');
      if (addCabinetButton) {
        addCabinetButton.addEventListener('click', () => {
          const createCabinetModal = new bootstrap.Modal(document.getElementById('createCabinetModal'));
          createCabinetModal.show();
        });
      }

      const addSocialButton = document.getElementById('addSocialForm');
      if (addSocialButton) {
        addSocialButton.addEventListener('click', () => {
          const createSocialModal = new bootstrap.Modal(document.getElementById('createSocialModal'));
          createSocialModal.show();
        });
      }

      //----------------------------------------------------------//
      // Handle create form to submit:
      /* 1) Event
      /* 2) News
      /* 3) Cabinet Member
      /* 4) Social Media */

      const createEventForm = document.getElementById('createEventForm');
      if (createEventForm) {
        createEventForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          await createClubEvent();
        });
      }

      const createNewsForm = document.getElementById('createNewsForm');
      if (createNewsForm) {
        createNewsForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          await createClubNews();
        });
      }

      const createCabinetForm = document.getElementById('createCabinetForm');
      if (createCabinetForm) {
        createCabinetForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          await createClubCabinet();
        });
      }

      const createSocialForm = document.getElementById('createSocialForm');
      if (createSocialForm) {
        createSocialForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          await createClubSocial();
        });
      }

      //----------------------------------------------------------//
      // Handle edit form to submit:
      /* 1) Event
      /* 2) News
      /* 3) Cabinet Member
      /* 4) Social Media */
    
      const editEventForm = document.getElementById('editEventForm');
      if (editEventForm) {
        editEventForm.addEventListener('submit', function(e) {
          e.preventDefault();
          
          const form = e.target;
          if (!form.checkValidity()) {
            e.stopPropagation();
            form.classList.add('was-validated');
            return;
          }
          
          form.classList.add('was-validated');
          
          const eventId = document.getElementById('editEventId').value;
          if (!eventId) {
            alert('Error: Could not find event ID');
            return;
          }
          
          const title = document.getElementById('editEventTitle').value.trim();
          const date = document.getElementById('editEventDate').value;
          const startTime = document.getElementById('editStartTime').value;
          const endTime = document.getElementById('editEndTime').value;
          const location = document.getElementById('editLocation').value.trim();
          
          if (endTime <= startTime) {
            alert('End time must be after start time.');
            return;
          }
          
          db.collection('events').doc(eventId).update({
            title: title,
            date: date,
            startTime: startTime,
            endTime: endTime,
            location: location
          })
          .then(() => {
            document.activeElement.blur();
            
            const editEventModalEl = document.getElementById('editEventModal');
            const editEventModal = bootstrap.Modal.getInstance(editEventModalEl);
            editEventModal.hide();
            
            form.classList.remove('was-validated');
            alert('Event updated successfully!');
            
            if (typeof populateClubEventsTable === 'function') {
              populateClubEventsTable();
            }
          })
          .catch((error) => {
            console.error('Error updating event: ', error);
            alert('Error updating event: ' + error.message);
          });
        });
      }

      const editNewsForm = document.getElementById('editNewsForm');
      if (editNewsForm) {
        editNewsForm.addEventListener('submit', async function(e) {
          e.preventDefault();
          
          const form = e.target;
          if (!form.checkValidity()) {
            e.stopPropagation();
            form.classList.add('was-validated');
            return;
          }
          
          form.classList.add('was-validated');
          
          const newsId = document.getElementById('editNewsId').value;
          if (!newsId) {
            alert('Error: Could not find news ID');
            return;
          }
          
          const newsTitle = document.getElementById('editNewsTitle').value.trim();
          const description = document.getElementById('editDescription').value.trim();
          const imageInput = document.getElementById('editPicture');
          const imageFile = imageInput?.files?.[0];
          const imageUrl = await uploadImage(imageFile);

          db.collection('news').doc(newsId).update({
            newsTitle: newsTitle,
            description: description,
            picture: imageUrl
          })
          .then(() => {
            document.activeElement.blur();
            
            const editNewsModalEl = document.getElementById('editNewsModal');
            const editNewsModal = bootstrap.Modal.getInstance(editNewsModalEl);
            editNewsModal.hide();
            
            form.classList.remove('was-validated');
            alert('News updated successfully!');
            
            if (typeof populateClubNews === 'function') {
              populateClubNews();
            }
          })
          .catch((error) => {
            console.error('Error updating news: ', error);
            alert('Error updating news: ' + error.message);
          });
        });
      }

      const editCabinetForm = document.getElementById('editCabinetForm');
      if (editCabinetForm) {
        editCabinetForm.addEventListener('submit', async function (e) {
          e.preventDefault();
          
          const form = e.target;

          // Validate form input
          if (!form.checkValidity()) {
            e.stopPropagation();
            form.classList.add('was-validated');
            return;
          }
          
          form.classList.add('was-validated');
          
          const cabinetId = document.getElementById('editCabinetId').value;
          if (!cabinetId) {
            alert('Error: Could not find cabinet ID');
            return;
          }

          const grade = document.getElementById('editGrade').value;
          const major = document.getElementById('editMajor').value;
          const name = document.getElementById('editName').value;
          const position = document.getElementById('editPosition').value;

          try {
            const user = firebase.auth().currentUser;
            if (!user) throw new Error('User not logged in');
            
            // Confirm the update action
            if (!confirm('Are you sure you want to update this cabinet member?')) return;

            // Get the user's club name
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (!userDoc.exists) throw new Error('User document not found');
            const clubName = userDoc.data().displayName;

            // Find the club document by name
            const clubQuerySnapshot = await firebase.firestore().collection('clubs').where('name', '==', clubName).get();
            if (clubQuerySnapshot.empty) throw new Error(`No club found for ${clubName}`);
            
            const clubDocRef = clubQuerySnapshot.docs[0].ref;
            const clubDoc = await clubDocRef.get();
            const cabinetMembers = clubDoc.data().cabinetMembers;

            if (!cabinetMembers || !cabinetMembers[cabinetId]) {
              throw new Error(`Cabinet member with ID ${cabinetId} not found`);
            }

            // Update the cabinet member's details
            await clubDocRef.update({
              [`cabinetMembers.${cabinetId}`]: {
                grade,
                major,
                name,
                position
              }
            });

            // Hide modal and reset form
            document.activeElement.blur();
            const editCabinetModalEl = document.getElementById('editCabinetModal');
            const editCabinetModal = bootstrap.Modal.getInstance(editCabinetModalEl);
            editCabinetModal.hide();
            form.classList.remove('was-validated');

            // Show success message
            alert('Cabinet member updated successfully!');

            // Refresh table if function exists
            if (typeof populateClubCabinetTable === 'function') {
              populateClubCabinetTable();
            }
          } catch (error) {
            console.error('Error updating cabinet member:', error);
            alert('Error updating cabinet member: ' + error.message);
          }
        });
      }

      const editSocialForm = document.getElementById('editSocialForm');
      if (editSocialForm) {
        editSocialForm.addEventListener('submit', async function (e) {
          e.preventDefault();
          
          const form = e.target;

          // Validate form input
          if (!form.checkValidity()) {
            e.stopPropagation();
            form.classList.add('was-validated');
            return;
          }
          
          form.classList.add('was-validated');
          
          const socialId = document.getElementById('editSocialId').value;
          if (!socialId) {
            alert('Error: Could not find social ID');
            return;
          }

          const link = document.getElementById('editLink').value;
          const social = document.getElementById('editSocial').value;
          const tag = document.getElementById('editTag').value;

          try {
            const user = firebase.auth().currentUser;
            if (!user) throw new Error('User not logged in');
            
            // Confirm the update action
            if (!confirm('Are you sure you want to update this cabinet member?')) return;

            // Get the user's club name
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (!userDoc.exists) throw new Error('User document not found');
            const clubName = userDoc.data().displayName;

            // Find the club document by name
            const clubQuerySnapshot = await firebase.firestore().collection('publicClubProfiles').where('clubName', '==', clubName).get();
            if (clubQuerySnapshot.empty) throw new Error(`No club found for ${clubName}`);
            
            const clubDocRef = clubQuerySnapshot.docs[0].ref;
            const clubDoc = await clubDocRef.get();
            const socialMedia = clubDoc.data().socialMedia;

            if (!socialMedia || !socialMedia[socialId]) {
              throw new Error(`Social media with ID ${socialId} not found`);
            }

            // Update the cabinet member's details
            await clubDocRef.update({
              [`socialMedia.${socialId}`]: {
                link,
                social,
                tag
              }
            });

            // Hide modal and reset form
            document.activeElement.blur();
            const editSocialModalEl = document.getElementById('editSocialModal');
            const editSocialModal = bootstrap.Modal.getInstance(editSocialModalEl);
            editSocialModal.hide();
            form.classList.remove('was-validated');

            // Show success message
            alert('Social media updated successfully!');

            // Refresh table if function exists
            if (typeof populateSocialMediaTable === 'function') {
              populateSocialMediaTable();
            }
          } catch (error) {
            console.error('Error updating social media:', error);
            alert('Error updating social media: ' + error.message);
          }
        });
      }

      // ----------------------------------------------------------------------------------------- //

    
      // Initialize dynamic updates
      if (typeof initDynamicUpdates === 'function') {
        initDynamicUpdates();
      }
    }

    function initDynamicUpdates() {
        // Wait for auth to be ready
        firebase.auth().onAuthStateChanged((user) => {
            const clubEventsTable = document.getElementById('club-events');
            
            if (clubEventsTable) {
                populateClubNews();
                populateClubEventsTable();
                populateClubCabinetTable();
                populateSocialMediaTable();
                populateEmail()
            }
        });
    }

    // Call functions when the DOM is fully loaded
    document.addEventListener('DOMContentLoaded', initializeMyClubPage);
    document.addEventListener('DOMContentLoaded', initDynamicUpdates);

}());