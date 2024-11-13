// clubManagement.js
(function () {
    "use strict";

    // Function to show all clubs
    async function showClubsList() {
        const clubsContainer = document.querySelector('.clubs-list');
        if (!clubsContainer) {
            console.error('Could not find clubs-list container');
            return;
        }

        try {
            console.log('Fetching clubs from database...');
            const snapshot = await db.collection('clubs').get();
            
            if (snapshot.empty) {
                console.log('No clubs found in database');
                return;
            }

            // Group clubs by type
            const clubsByType = {};
            snapshot.forEach(doc => {
                const club = doc.data();
                if (!clubsByType[club.type]) {
                    clubsByType[club.type] = [];
                }
                clubsByType[club.type].push({
                    id: doc.id,
                    ...club
                });
            });

            clubsContainer.innerHTML = ''; // Clear existing content

            // Create sections for each type
            Object.entries(clubsByType).forEach(([type, clubs]) => {
                const section = document.createElement('div');
                section.className = 'club-section mb-4';
                
                section.innerHTML = `
                    <h2 class="section-title mb-3">${type}</h2>
                    <div class="row row-cols-1 row-cols-md-3 g-4">
                        ${clubs.map(club => `
                            <div class="col">
                                <div class="card h-100">
                                    <div class="card-body">
                                        <h5 class="card-title">
                                            <a href="#" data-club-id="${club.id}" class="club-link text-decoration-none">
                                                ${club.name}
                                            </a>
                                        </h5>
                                        <p class="card-text">
                                            <a href="mailto:${club.email}" class="text-muted">
                                                <i class="bi bi-envelope"></i> ${club.email}
                                            </a>
                                        </p>
                                    </div>
                                    <div class="card-footer">
                                        <small class="text-muted">
                                            <i class="bi ${club.isVerified ? 'bi-check-circle-fill text-success' : 'bi-circle'}"></i>
                                            ${club.isVerified ? 'Verified' : 'Unverified'} Club
                                        </small>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                
                clubsContainer.appendChild(section);
            });

            // Add click handlers for club links
            document.querySelectorAll('.club-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const clubId = e.target.dataset.clubId;
                    showClubDetails(clubId);
                });
            });

            console.log('Clubs displayed successfully');

        } catch (error) {
            console.error('Error loading clubs:', error);
        }
    }

    // Function to show club details
    async function showClubDetails(clubId) {
        const clubsContainer = document.querySelector('.clubs-list');
        if (!clubsContainer) return;

        try {
            const clubDoc = await db.collection('clubs').doc(clubId).get();
            
            if (!clubDoc.exists) {
                showClubsList();
                return;
            }

            const clubData = clubDoc.data();
            
            clubsContainer.innerHTML = `
                <div class="container py-4">
                    <div class="row">
                        <div class="col-md-8 mx-auto">
                            <button class="btn btn-primary mb-4 back-button">
                                <i class="bi bi-arrow-left"></i> Back to Clubs
                            </button>
                            <div class="card">
                                <div class="card-body">
                                    <h1 class="card-title">${clubData.name}</h1>
                                    <p class="lead">${clubData.type}</p>
                                    <div class="mb-3">
                                        <strong>Contact:</strong> 
                                        <a href="mailto:${clubData.email}">
                                            <i class="bi bi-envelope"></i> ${clubData.email}
                                        </a>
                                    </div>
                                    ${clubData.isVerified ? 
                                        '<div class="alert alert-success"><i class="bi bi-check-circle-fill"></i> This is a verified club</div>' : 
                                        '<div class="alert alert-warning"><i class="bi bi-exclamation-triangle"></i> This club is not yet verified</div>'
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Add back button handler
            document.querySelector('.back-button').addEventListener('click', () => {
                showClubsList();
            });

        } catch (error) {
            console.error('Error loading club details:', error);
        }
    }

    // Function to initialize clubs page
    function initializeClubsPage() {
        console.log('Initializing clubs page...');
        if (document.querySelector('.clubs-list')) {
            showClubsList();
        }
    }

    // Call initialization when DOM is loaded
    document.addEventListener('DOMContentLoaded', initializeClubsPage);

})();