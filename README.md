![nodejs](https://img.shields.io/badge/Node%20js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![firebase](https://img.shields.io/badge/firebase-ffca28?style=for-the-badge&logo=firebase&logoColor=black)

# ClubHub

## Project Overview

ClubHub is a website designed to centralize school clubs and provide easy management and access for different organizations. Each organization gets their own customizable webpage, featuring:

- Interactive calendar for tracking campus club activities
- Customizable club pages accessible through club user login
- Template-based design for consistent branding

## Layout Design

![Layout](/public/docs/layout.png)

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth

## Database Setup

No manual setup required. The database is automatically configured through Firebase API in the `firebase.js` file.

## Local Setup Guide

1. Clone the repository to your local machine
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npx nodemon server.js
   ```
4. Open [http://localhost:8080](http://localhost:8080) in your web browser

## API Documentation

### Firebase Authentication Endpoints

Base URL: `https://identitytoolkit.googleapis.com/v1`

#### Sign Up

- **Firebase Endpoint**: `/accounts:signUp?key=[API_KEY]`
- **Client Usage**: `signUp(email, password)`
- **Type**: POST
- **Description**: Creates a new user account with email verification
- **Parameters**:
  - email: String (must end with @etown.edu)
  - password: String
- **Response**: Returns a Promise with user credentials

#### Sign In

- **Firebase Endpoint**: `/accounts:signInWithPassword?key=[API_KEY]`
- **Client Usage**: `signIn(email, password)`
- **Type**: POST
- **Description**: Authenticates user with email and password
- **Parameters**:
  - email: String
  - password: String
- **Response**: Returns a Promise with user credentials

#### Reset Password

- **Firebase Endpoint**: `/accounts:sendOobCode?key=[API_KEY]`
- **Client Usage**: `resetPassword(email)`
- **Type**: POST
- **Description**: Sends password reset email
- **Parameters**:
  - email: String
- **Response**: Returns a Promise

### Firestore Database Endpoints

Base URL: `https://firestore.googleapis.com/v1`  
Project Path: `projects/etown-clubhub/databases/(default)/documents`

#### User Profile Operations

- **Collection Path**: `/users`
- **Document Path**: `/users/{userId}`
- **Client Usage**: `createUserProfile(user)`
- **Operations**:
  - Create/Update Profile: POST/PATCH to `/users/{userId}`
  - Read Profile: GET from `/users/{userId}`

#### Club Operations

- **Collection Path**: `/clubs`
- **Document Path**: `/clubs/{clubId}`
- **Operations**:
  - Update Club Verification: PATCH to `/clubs/{clubId}`
  - Read Club Data: GET from `/clubs/{clubId}`

#### Public Club Profiles

- **Collection Path**: `/publicClubProfiles`
- **Document Path**: `/publicClubProfiles/{userId}`
- **Operations**:
  - Create/Update Profile: POST/PATCH to `/publicClubProfiles/{userId}`
  - Read Profile: GET from `/publicClubProfiles/{userId}`

### Important Notes

1. Firebase endpoints are handled automatically by the Firebase SDK - no need for direct calls
2. Authentication handling is managed through `firebase.auth()`
3. Database operations are managed through `firebase.firestore()`
4. Additional Firebase API calls exist for calendar, messaging, and other features across different files - this documentation covers the core authentication and user management endpoints

### Security Rules

- All requests require valid Firebase authentication tokens
- Database access restricted to authenticated users
- Email domain restriction: @etown.edu only
- Role-based access control:
  - superadmin
  - clubAdmin
  - user

---

Created by © MM Studios for Elizabethtown College Fall 2024 CS 310
