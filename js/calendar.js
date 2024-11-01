"use strict";

(function () {
  /*
   * Initialize calendar component
   */
  document.addEventListener('DOMContentLoaded', function() {
    let calendar;
    let currentFilters = {
      clubType: '',
      selectedClubs: [] // Changed to array for multiple selections
    };

    function initializeFilters() {

      handleClubSearch();

      // Populate club types from Firestore
      db.collection('clubs').get().then((snapshot) => {
        const types = new Set(); // Using Set automatically prevents duplicates
        snapshot.forEach(doc => {
          const club = doc.data();
          if (club.type) types.add(club.type);
        });
        
        const typeSelect = document.getElementById('clubTypeFilter');
        // Clear existing options except "All Types"
        typeSelect.innerHTML = '<option value="">All Types</option>';
        
        // Add unique types
        Array.from(types).sort().forEach(type => {
          const option = document.createElement('option');
          option.value = type;
          option.textContent = type;
          typeSelect.appendChild(option);
        });
      });

      // Add event listeners
      document.getElementById('clubTypeFilter').addEventListener('change', handleFilterChange);
      document.getElementById('clubNameFilter').addEventListener('input', handleClubSearch);
      document.getElementById('applyFilter').addEventListener('click', applyFilters);

      // Stop dropdown from closing when clicking inside
      document.querySelector('.dropdown-menu').addEventListener('click', function(e) {
        e.stopPropagation();
      });
    }

    function updateSelectedClubsText() {
      const selectedClubsText = document.getElementById('selectedClubsText');
      if (currentFilters.selectedClubs.length > 0) {
        selectedClubsText.textContent = `${currentFilters.selectedClubs.length} club(s) selected`;
      } else {
        selectedClubsText.textContent = 'Choose Clubs';
      }
    }

    function handleFilterChange() {
      currentFilters.clubType = document.getElementById('clubTypeFilter').value;
      handleClubSearch();
    }

    function handleClubSearch() {
    const searchTerm = document.getElementById('clubNameFilter').value.toLowerCase();
    const clubListContainer = document.querySelector('.club-list');
    
    // Get public club profiles first
    db.collection('publicClubProfiles').get()
      .then((profilesSnapshot) => {
        const clubMappings = {};
        profilesSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.clubName) clubMappings[data.clubName.toLowerCase()] = data.clubName;
          if (data.clubAffiliation) clubMappings[data.clubAffiliation.toLowerCase()] = data.clubAffiliation;
        });

        let query = db.collection('clubs');
        if (currentFilters.clubType) {
          query = query.where('type', '==', currentFilters.clubType);
        }
        
        return query.get().then((snapshot) => {
          const clubs = [];
          snapshot.forEach(doc => {
            const club = doc.data();
            if (club.name.toLowerCase().includes(searchTerm)) {
              // Use the mapping to get the correct stored name
              const storedName = clubMappings[club.name.toLowerCase()] || club.name;
              clubs.push({
                id: doc.id,
                name: club.name,
                storedName: storedName
              });
            }
          });

          clubListContainer.innerHTML = clubs.map(club => `
            <div class="form-check">
              <input class="form-check-input" type="checkbox" name="clubFilter" 
                    id="club_${club.id}" value="${club.storedName}"
                    ${currentFilters.selectedClubs.includes(club.storedName) ? 'checked' : ''}>
              <label class="form-check-label" for="club_${club.id}">
                ${club.name}
              </label>
            </div>
          `).join('');

          // Add event listeners for checkboxes
          clubListContainer.querySelectorAll('input[name="clubFilter"]').forEach(input => {
            input.addEventListener('change', (e) => {
              if (e.target.checked) {
                if (!currentFilters.selectedClubs.includes(e.target.value)) {
                  currentFilters.selectedClubs.push(e.target.value);
                }
              } else {
                currentFilters.selectedClubs = currentFilters.selectedClubs.filter(
                  club => club !== e.target.value
                );
              }
              updateSelectedClubsText();
            });
          });
        });
      });
    }

    function applyFilters() {
      calendar.refetchEvents();
    }

    function fetchEventsFromFirestore(info, successCallback, failureCallback) {
      let query = db.collection('events');
      
      if (currentFilters.selectedClubs.length > 0) {
        // Filter events for selected clubs
        query = query.where('clubName', 'in', currentFilters.selectedClubs);
      } else if (currentFilters.clubType) {
        // If no specific clubs selected but type is selected
        db.collection('clubs')
          .where('type', '==', currentFilters.clubType)
          .get()
          .then((clubsSnapshot) => {
            const clubNames = [];
            clubsSnapshot.forEach(doc => {
              clubNames.push(doc.data().name);
            });
            return db.collection('events')
              .where('clubName', 'in', clubNames)
              .get();
          })
          .then((eventsSnapshot) => {
            const events = [];
            eventsSnapshot.forEach((doc) => {
              const data = doc.data();
              events.push({
                id: doc.id,
                title: data.title,
                start: data.date + 'T' + data.startTime,
                end: data.date + 'T' + data.endTime,
                location: data.location,
                extendedProps: {
                  location: data.location,
                  createdBy: data.createdBy,
                  clubName: data.clubName
                }
              });
            });
            successCallback(events);
          })
          .catch(failureCallback);
        return;
      }

      // Execute query
      query.get()
        .then((querySnapshot) => {
          const events = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            events.push({
              id: doc.id,
              title: data.title,
              start: data.date + 'T' + data.startTime,
              end: data.date + 'T' + data.endTime,
              location: data.location,
              extendedProps: {
                location: data.location,
                createdBy: data.createdBy,
                clubName: data.clubName
              }
            });
          });
          successCallback(events);
        })
        .catch(failureCallback);
    }

    function initializeCalendar(showCreateEventButton = false) {
      const calendarEl = document.getElementById('calendar');
      
      calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        events: fetchEventsFromFirestore,
        headerToolbar: {
          left: 'dayGridMonth,timeGridWeek,timeGridDay',
          center: 'title',
          right: showCreateEventButton ? 'createEventButton today prev,next' : 'today prev,next'
        },
        customButtons: showCreateEventButton ? {
          createEventButton: {
            text: 'Create Event',
            click: function() {
              const createEventModal = new bootstrap.Modal(document.getElementById('createEventModal'));
              createEventModal.show();
            }
          }
        } : {},
        eventContent: function(arg) {
          return {
              html: `
                  <div class="fc-daygrid-event-dot"></div>
                  <div class="fc-event-time">${arg.timeText}</div>
                  <div class="fc-event-title text-wrap">${arg.event.extendedProps.clubName}</div>
              `
          };
      },
        eventClick: function(info) {
          showEventDetails(info.event);
        }
      });

      calendar.render();
      initializeFilters();
      calendarEl.classList.add('custom-calendar');
    }

    initializeCalendar();

    auth.onAuthStateChanged((user) => {
      if (user) {
        if (calendar) {
          calendar.destroy();
        }
        initializeCalendar(true);
      } else {
        if (calendar) {
          calendar.destroy();
        }
        initializeCalendar(false);
      }
    });

    document.getElementById('createEventForm').addEventListener('submit', function(e) {
      e.preventDefault();
    
      const form = e.target;
    
      // Check if the form is valid
      if (!form.checkValidity()) {
        e.stopPropagation();
        form.classList.add('was-validated');
        return;
      }
    
      form.classList.add('was-validated');
    
      // Get current user
      const user = auth.currentUser;
      if (user) {
        // Fetch user role from Firestore
        db.collection('users').doc(user.uid).get().then((doc) => {
          if (doc.exists) {
            const userData = doc.data();
            if (userData.role === 'clubAdmin') {
              // Proceed to save the event
              saveEvent();
            } else {
              alert('You do not have permission to add events.');
            }
          } else {
            alert('User data not found.');
          }
        });
      } else {
        alert('You must be logged in to submit an event.');
      }
    
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
    });

    function showEventDetails(event) {
      document.getElementById('detailEventTitle').textContent = event.title;
      document.getElementById('detailEventClub').textContent = event.extendedProps.clubName;
      document.getElementById('detailEventDate').textContent = event.start.toLocaleDateString();
      document.getElementById('detailEventTime').textContent = `${event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      document.getElementById('detailEventLocation').textContent = event.extendedProps.location;
    
      const user = auth.currentUser;
      const deleteButton = document.getElementById('deleteEventButton');
      const editButton = document.getElementById('editEventButton');
      
      // Always reset button visibility first
      deleteButton.classList.add('hidden');
      editButton.classList.add('hidden');
      
      if (user && user.uid === event.extendedProps.createdBy) {
        deleteButton.classList.remove('hidden');
        editButton.classList.remove('hidden');
        deleteButton.onclick = () => deleteEvent(event.id);
        editButton.onclick = () => showEditEventModal(event);
      }
    
      const eventDetailsModal = new bootstrap.Modal(document.getElementById('eventDetailsModal'));
      eventDetailsModal.show();
    }

    function showEditEventModal(event) {
      // Close the details modal
      const eventDetailsModalEl = document.getElementById('eventDetailsModal');
      const eventDetailsModal = bootstrap.Modal.getInstance(eventDetailsModalEl);
      eventDetailsModal.hide();
    
      // Populate the edit form with current event data
      document.getElementById('editEventTitle').value = event.title;
      document.getElementById('editEventDate').value = event.start.toISOString().split('T')[0];
      document.getElementById('editStartTime').value = event.start.toTimeString().slice(0, 5);
      document.getElementById('editEndTime').value = event.end.toTimeString().slice(0, 5);
      document.getElementById('editLocation').value = event.extendedProps.location;
      document.getElementById('editEventId').value = event.id;
    
      // Show the edit modal
      const editEventModal = new bootstrap.Modal(document.getElementById('editEventModal'));
      editEventModal.show();
    }
    
    function deleteEvent(eventId) {
      if (confirm('Are you sure you want to delete this event?')) {
        db.collection('events').doc(eventId).delete()
          .then(() => {
            const eventDetailsModalEl = document.getElementById('eventDetailsModal');
            const eventDetailsModal = bootstrap.Modal.getInstance(eventDetailsModalEl);
            eventDetailsModal.hide();

            calendar.refetchEvents();
            alert('Event deleted successfully!');
          })
          .catch((error) => {
            console.error('Error deleting event: ', error);
            alert('Error deleting event: ' + error.message);
          });
      }
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
        // Close the modal
        const editEventModalEl = document.getElementById('editEventModal');
        const editEventModal = bootstrap.Modal.getInstance(editEventModalEl);
        editEventModal.hide();
    
        // Reset the form
        form.classList.remove('was-validated');
    
        // Refresh the calendar events
        calendar.refetchEvents();
    
        // Show success message
        alert('Event updated successfully!');
      })
      .catch((error) => {
        console.error('Error updating event: ', error);
        alert('Error updating event: ' + error.message);
      });
    });

  });

})();
