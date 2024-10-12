(function () {
    // dynamicUpdates.js
  
    // Function to populate the events table on the index page
    async function populateEventsTable() {
        const eventsTable = document.querySelector('.table tbody');
        if (!eventsTable) return; // Exit if table doesn't exist on the page
    
        const currentDate = new Date();
    
        try {
        // Fetch events from Firestore
        const querySnapshot = await db.collection('events')
            .where('date', '>=', currentDate.toISOString().split('T')[0]) // Filter for future events
            .orderBy('date')
            .orderBy('startTime')
            .limit(10) // Limit to 10 events
            .get();
    
        eventsTable.innerHTML = ''; // Clear existing rows
    
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const row = document.createElement('tr');
    
            // Use the clubName directly from the event data
            const clubName = data.clubName || 'Unknown Club';
    
            // Format date and time
            const eventDate = new Date(data.date + 'T' + data.startTime);
            const formattedDate = eventDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
            const formattedTime = eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
            row.innerHTML = `
            <th scope="row">${clubName}</th>
            <td>${data.title}</td>
            <td>${formattedDate}</td>
            <td>${formattedTime}</td>
            `;
    
            eventsTable.appendChild(row);
        });
        } catch (error) {
        console.error("Error fetching events: ", error);
        }
    }
  
  // Function to initialize dynamic updates
  function initDynamicUpdates() {
    // Check if we're on the index page
    if (document.querySelector('.table')) {
      populateEventsTable();
    }
  
    // Add more functions here for other dynamic updates on different pages
  }
  
  // Call initDynamicUpdates when the DOM is fully loaded
  document.addEventListener('DOMContentLoaded', initDynamicUpdates);

})();
