"use strict";

(function () {
  /*
   * Initialize calendar component
   */
  document.addEventListener('DOMContentLoaded', function() {

    function fetchEventsFromFirestore(info, successCallback, failureCallback) {
      // Fetch events from Firestore
      db.collection('events').get()
        .then((querySnapshot) => {
          const events = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
    
            // Convert Firestore data to FullCalendar event format
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
        .catch((error) => {
          console.error('Error fetching events: ', error);
          failureCallback(error);
        });
    }
    
    let calendar;

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
              <div class="fc-event-title">${arg.event.extendedProps.clubName}</div>
            `
          };
        },
        eventClick: function(info) {
          showEventDetails(info.event);
        },
        themeSystem: 'bootstrap5',
        buttonIcons: true,
        buttonText: {
          today: 'Today',
          month: 'Month',
          week: 'Week',
          day: 'Day'
        }
      });

      calendar.render();
      
      // Add custom class to calendar element for CSS targeting
      calendarEl.classList.add('custom-calendar');
    }

    // Initialize calendar without the Create Event button
    initializeCalendar();

    // Check authentication state and update calendar accordingly
    auth.onAuthStateChanged((user) => {
      if (user) {
        // User is signed in, reinitialize calendar with Create Event button
        if (calendar) {
          calendar.destroy(); // Destroy existing calendar instance
        }
        initializeCalendar(true);
      } else {
        // User is signed out, reinitialize calendar without Create Event button
        if (calendar) {
          calendar.destroy(); // Destroy existing calendar instance
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
