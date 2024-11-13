"use strict";

(function() {
    // Get event ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');
    let currentUser = null;
    let eventData = null;

    // Initialize page
    document.addEventListener('DOMContentLoaded', function() {
        if (!eventId) {
            window.location.href = '/calendar.html';
            return;
        }

        auth.onAuthStateChanged((user) => {
            currentUser = user;
            loadEventDetails();
            loadComments();
            if (user) {
                document.getElementById('commentForm').classList.remove('d-none');
            } else {
                document.getElementById('commentForm').classList.add('d-none');
            }
        });

        // Initialize event listeners
        document.getElementById('commentForm').addEventListener('submit', handleCommentSubmit);
    });

    function loadEventDetails() {
        db.collection('events').doc(eventId).get()
            .then((doc) => {
                if (doc.exists) {
                    eventData = doc.data();
                    
                    // Update page elements
                    document.getElementById('eventTitle').textContent = eventData.title;
                    document.getElementById('eventClub').textContent = eventData.clubName;
                    document.getElementById('eventDate').textContent = new Date(eventData.date).toLocaleDateString();
                    document.getElementById('eventTime').textContent = `${eventData.startTime} - ${eventData.endTime}`;
                    document.getElementById('eventLocation').textContent = eventData.location;

                    // Check if current user is the event creator
                    if (currentUser && currentUser.uid === eventData.createdBy) {
                        document.getElementById('attendanceSection').classList.remove('d-none');
                        loadClubMembers();
                    }
                } else {
                    alert('Event not found');
                    window.location.href = '/calendar.html';
                }
            });
    }

    function loadClubMembers() {
        const selectedMembers = new Set(); // Track selected members
        let memberData = new Map(); // Store member data for reference

        db.collection('users')
            .where('clubAffiliations', 'array-contains', eventData.clubName)
            .get()
            .then((snapshot) => {
                snapshot.forEach((doc) => {
                    const userData = doc.data();
                    memberData.set(doc.id, {
                        id: doc.id,
                        email: userData.email
                    });
                });

                // Initial render of search dropdown
                renderMemberList(Array.from(memberData.values()));
                
                // Load existing attendance first
                loadExistingAttendance();

                // Add search handler
                document.getElementById('memberSearch').addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    const filteredMembers = Array.from(memberData.values()).filter(member => 
                        member.email.toLowerCase().includes(searchTerm)
                    );
                    renderMemberList(filteredMembers);
                });
            });

        function renderMemberList(members) {
            const memberList = document.getElementById('memberList');
            memberList.innerHTML = members.map(member => `
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" 
                           value="${member.id}" 
                           id="member_${member.id}"
                           ${selectedMembers.has(member.id) ? 'checked' : ''}>
                    <label class="form-check-label" for="member_${member.id}">
                        ${member.email}
                    </label>
                </div>
            `).join('');

            // Add change listeners to checkboxes
            memberList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        selectedMembers.add(e.target.value);
                    } else {
                        selectedMembers.delete(e.target.value);
                    }
                    updateAttendanceUI();
                });
            });
        }

        function updateAttendanceUI() {
            const selectedMembersText = document.getElementById('selectedMembersText');
            const selectedMembersList = document.getElementById('selectedMembersList');
            
            // Update dropdown text
            const count = selectedMembers.size;
            selectedMembersText.textContent = count === 0 ? 'Select Members' : 
                `${count} member${count !== 1 ? 's' : ''} selected`;

            // Update attendance list
            if (count === 0) {
                selectedMembersList.innerHTML = '<p class="text-muted mb-0">No members marked for attendance</p>';
                return;
            }

            let membersHTML = '';
            selectedMembers.forEach(memberId => {
                const member = memberData.get(memberId);
                if (member) {
                    membersHTML += `
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span>${member.email}</span>
                            <button type="button" class="btn btn-sm text-danger" 
                                    onclick="removeMember('${memberId}')">
                                <i class="bi bi-x"></i>
                            </button>
                        </div>`;
                }
            });

            selectedMembersList.innerHTML = membersHTML;
        }

        // Make removeMember function globally available
        window.removeMember = function(memberId) {
            selectedMembers.delete(memberId);
            const checkbox = document.getElementById(`member_${memberId}`);
            if (checkbox) checkbox.checked = false;
            updateAttendanceUI();
        };

        function loadExistingAttendance() {
            db.collection('eventAttendance')
                .doc(eventId)
                .get()
                .then((doc) => {
                    if (doc.exists) {
                        const attendanceData = doc.data();
                        selectedMembers.clear(); // Clear any existing selections
                        Object.entries(attendanceData.attendees).forEach(([userId, isPresent]) => {
                            if (isPresent) {
                                selectedMembers.add(userId);
                                const checkbox = document.getElementById(`member_${userId}`);
                                if (checkbox) checkbox.checked = true;
                            }
                        });
                        updateAttendanceUI();
                    }
                });
        }

        // Add save attendance handler
        document.getElementById('saveAttendance').addEventListener('click', function() {
            const attendees = {};
            selectedMembers.forEach(memberId => {
                attendees[memberId] = true;
            });

            db.collection('eventAttendance').doc(eventId).set({
                eventId: eventId,
                attendees: attendees,
                updatedAt: new Date(),
                updatedBy: currentUser.uid
            })
            .then(() => {
                // Clear the search input and dropdown
                document.getElementById('memberSearch').value = '';
                const dropdownButton = document.getElementById('memberDropdown');
                if (dropdownButton.getAttribute('aria-expanded') === 'true') {
                    bootstrap.Dropdown.getInstance(dropdownButton).hide();
                }
                
                // Reload attendance from database
                loadExistingAttendance();
                
                alert('Attendance saved successfully!');
            })
            .catch((error) => {
                console.error('Error saving attendance:', error);
                alert('Error saving attendance');
            });
        });

        // Prevent dropdown from closing when clicking inside
        document.querySelector('.dropdown-menu').addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    function loadComments() {
        db.collection('eventComments')
            .where('eventId', '==', eventId)
            .orderBy('timestamp', 'desc')
            .onSnapshot((snapshot) => {
                const commentsContainer = document.getElementById('commentsContainer');
                commentsContainer.innerHTML = '';

                snapshot.forEach((doc) => {
                    const comment = doc.data();
                    const div = document.createElement('div');
                    div.className = 'card mb-2';
                    div.innerHTML = `
                        <div class="card-body">
                            <h6 class="card-subtitle mb-2 text-muted">
                                ${comment.userEmail} - ${comment.timestamp.toDate().toLocaleString()}
                            </h6>
                            <p class="card-text">${comment.text}</p>
                        </div>
                    `;
                    commentsContainer.appendChild(div);
                });
            });
    }

    function handleCommentSubmit(e) {
        e.preventDefault();
        
        const commentText = document.getElementById('commentText').value.trim();
        if (!commentText || !currentUser) return;

        db.collection('eventComments').add({
            eventId: eventId,
            text: commentText,
            userId: currentUser.uid,
            userEmail: currentUser.email,
            timestamp: new Date()
        })
        .then(() => {
            document.getElementById('commentText').value = '';
        })
        .catch((error) => {
            console.error('Error posting comment:', error);
            alert('Error posting comment');
        });
    }
})();