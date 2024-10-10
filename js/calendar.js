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
                createdBy: data.createdBy
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
    
    let calendar; // Declare calendar variable in a wider scope

    function initializeCalendar(showCreateEventButton = false) {
      const calendarEl = document.getElementById('calendar');

      calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        events: fetchEventsFromFirestore,
        headerToolbar: {
          left: showCreateEventButton ? 'prev,next today createEventButton' : 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
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
    
        // Create event object
        const event = {
          title: title,
          date: date,
          startTime: startTime,
          endTime: endTime,
          location: location,
          createdBy: user.uid,
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
      }
    });

    function showEventDetails(event) {
      document.getElementById('detailEventTitle').textContent = event.title;
      document.getElementById('detailEventDate').textContent = event.start.toLocaleDateString();
      document.getElementById('detailEventTime').textContent = `${event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      document.getElementById('detailEventLocation').textContent = event.extendedProps.location;

      const user = auth.currentUser;
      const deleteButton = document.getElementById('deleteEventButton');
      
      if (user && user.uid === event.extendedProps.createdBy) {
        deleteButton.style.display = 'block';
        deleteButton.onclick = () => deleteEvent(event.id);
      } else {
        deleteButton.style.display = 'none';
      }

      const eventDetailsModal = new bootstrap.Modal(document.getElementById('eventDetailsModal'));
      eventDetailsModal.show();
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

  });
})();
