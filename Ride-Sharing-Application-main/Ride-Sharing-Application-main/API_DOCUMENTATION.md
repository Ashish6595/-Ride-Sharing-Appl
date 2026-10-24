# Ride-Sharing Application - Backend API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:5000/api/v1`  
**Interactive Swagger UI:** `http://localhost:5000/api-docs`  
**Real-Time WebSocket Endpoint:** `ws://localhost:5000`

---

## 1. Authentication & Role-Based Access Control (RBAC)

All secured endpoints require the `Authorization` header formatted as:
`Authorization: Bearer <jwt_token>`

### 1.1 Register User
- **Method:** `POST`
- **Endpoint:** `/auth/register`
- **Access:** Public
- **Request Body (Rider):**
  ```json
  {
    "name": "Aarav Mehta",
    "email": "aarav@rideshare.com",
    "phone": "+919820011223",
    "password": "password123",
    "role": "rider"
  }
  ```
- **Request Body (Driver):**
  ```json
  {
    "name": "Rajesh Kumar",
    "email": "rajesh@rideshare.com",
    "phone": "+919811122334",
    "password": "password123",
    "role": "driver",
    "vehicleModel": "Maruti Dzire",
    "vehiclePlate": "MH-02-AK-4521",
    "vehicleColor": "Silver",
    "vehicleType": "economy",
    "licenseNumber": "DL-142011009876"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "RIDER registered successfully.",
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": 2,
      "name": "Aarav Mehta",
      "email": "aarav@rideshare.com",
      "phone": "+919820011223",
      "role": "rider"
    }
  }
  ```

### 1.2 User Login
- **Method:** `POST`
- **Endpoint:** `/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "aarav@rideshare.com",
    "password": "password123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Logged in successfully.",
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": { ... }
  }
  ```

### 1.3 Get Current Authenticated Profile
- **Method:** `GET`
- **Endpoint:** `/auth/me`
- **Access:** Protected (`rider`, `driver`, `admin`)
- **Response (200 OK):** Returns current user object and driver profile (if driver).

---

## 2. Ride Request & Fare Calculation

### 2.1 Upfront Route & Fare Estimation
- **Method:** `POST`
- **Endpoint:** `/rides/estimate`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "pickupAddress": "Bandra Kurla Complex, Mumbai",
    "pickupLatitude": 19.0657,
    "pickupLongitude": 72.8687,
    "dropoffAddress": "Chhatrapati Shivaji Maharaj Airport T2, Mumbai",
    "dropoffLatitude": 19.0886,
    "dropoffLongitude": 72.8679,
    "rideType": "economy"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "route": {
      "distanceKm": 4.8,
      "durationMinutes": 16,
      "geometry": { "type": "LineString", "coordinates": [...] },
      "routingSource": "mapbox-live-api"
    },
    "fareEstimate": {
      "distanceKm": 4.8,
      "durationMinutes": 16,
      "rideType": "economy",
      "breakdown": {
        "baseFare": 50,
        "perKmRate": 12,
        "distanceFare": 57.6,
        "perMinuteRate": 2.5,
        "timeFare": 40,
        "vehicleMultiplier": 1,
        "surgeMultiplier": 1,
        "surgeAmount": 0,
        "taxAmount": 7.38,
        "subtotal": 147.6
      },
      "totalFare": 154.98,
      "driverEarnings": 118.08,
      "platformFee": 36.9,
      "isSurgeActive": false,
      "surgeReason": "Standard pricing",
      "currency": "INR"
    },
    "availableOptions": [
      { "rideType": "economy", "totalFare": 154.98 },
      { "rideType": "comfort", "totalFare": 193.73 },
      { "rideType": "xl", "totalFare": 240.22 }
    ]
  }
  ```

### 2.2 Book a Ride (Rider Only)
- **Method:** `POST`
- **Endpoint:** `/rides/request`
- **Access:** Protected (`rider`)
- **Request Body:** Same parameters as `/rides/estimate`, with optional `paymentMethod` (`cash`, `card`, `upi`, `wallet`).
- **Response (201 Created):**
  Creates Ride in database, executes Haversine matching for nearest drivers within 10 km, broadcasts WebSocket event `ride:incoming_request` to candidates.

### 2.3 Search & Filter Rides
- **Method:** `GET`
- **Endpoint:** `/rides`
- **Access:** Protected (`rider` views own rides; `driver` views assigned rides; `admin` views all)
- **Query Parameters:**
  - `status`: Filter by `requested`, `accepted`, `arrived`, `in_progress`, `completed`, `cancelled`
  - `rideType`: `economy`, `comfort`, `xl`
  - `destination`: Substring match for destination
  - `startDate` & `endDate`: Filter by date range (ISO formatted)
  - `page`: Page number (default `1`)
  - `limit`: Items per page (default `10`)

### 2.4 Get Single Ride by ID
- **Method:** `GET`
- **Endpoint:** `/rides/:id`
- **Access:** Protected (`rider`, `driver`, `admin`)

---

## 3. Driver Operations

### 3.1 Driver Accepts Ride Request
- **Method:** `PUT`
- **Endpoint:** `/rides/:id/accept`
- **Access:** Protected (`driver`)
- **Response (200 OK):**
  Assigns driver to ride, marks driver unavailable, broadcasts `ride:accepted` to rider with driver vehicle and rating details.

### 3.2 Update Ride Progress Lifecycle
- **Method:** `PUT`
- **Endpoint:** `/rides/:id/status`
- **Access:** Protected (`driver`, `admin`)
- **Request Body:**
  ```json
  {
    "status": "arrived" // options: "arrived", "in_progress", "completed"
  }
  ```
- **Lifecycle Flow:**
  `requested` -> `accepted` -> `arrived` -> `in_progress` -> `completed`
  Upon completion, automatically updates driver total rides and accumulated earnings.

### 3.3 Cancel Ride
- **Method:** `PUT`
- **Endpoint:** `/rides/:id/cancel`
- **Access:** Protected (`rider`, `driver`, `admin`)
- **Request Body:**
  ```json
  {
    "reason": "Traffic delay / Passenger requested"
  }
  ```

### 3.4 Toggle Online/Offline Duty
- **Method:** `PUT`
- **Endpoint:** `/drivers/availability`
- **Access:** Protected (`driver`)
- **Request Body:** `{ "isAvailable": true }`

### 3.5 Broadcast Live Location
- **Method:** `PUT`
- **Endpoint:** `/drivers/location`
- **Access:** Protected (`driver`)
- **Request Body:** `{ "latitude": 19.0680, "longitude": 72.8690 }`

### 3.6 Driver Earnings
- **Method:** `GET`
- **Endpoint:** `/drivers/earnings`
- **Access:** Protected (`driver`)
- **Response (200 OK):** Today's earnings, this week's earnings, all-time earnings, and ratings.

---

## 4. Driver Ratings & Reviews

### 4.1 Post-Ride Review
- **Method:** `POST`
- **Endpoint:** `/reviews`
- **Access:** Protected (`rider`)
- **Request Body:**
  ```json
  {
    "rideId": 1,
    "rating": 5,
    "comment": "Very polite driver, car was clean and ride was on time!"
  }
  ```
- **Response (201 Created):**
  Recalculates driver's overall average rating across all reviews and returns `driverNewRating`.

### 4.2 Get Driver Reviews
- **Method:** `GET`
- **Endpoint:** `/reviews/driver/:driverId`
- **Access:** Public

---

## 5. Analytics & Data Visualization

### 5.1 Platform Overview KPIs
- **Method:** `GET`
- **Endpoint:** `/analytics/overview`
- **Access:** Protected (`admin`, `driver`)
- **Response:** Summary metrics: total rides, completion rate, platform profit, driver payouts, average distance.

### 5.2 7-Day Ride Trends (Chart.js Format)
- **Method:** `GET`
- **Endpoint:** `/analytics/trends`
- **Access:** Protected (`admin`, `driver`)
- **Response:** Daily counts of completed vs cancelled vs total rides with labels and datasets.

### 5.3 Driver Performance Metrics
- **Method:** `GET`
- **Endpoint:** `/analytics/driver-performance`
- **Access:** Protected (`admin`, `driver`)

### 5.4 Revenue & Earnings Distribution
- **Method:** `GET`
- **Endpoint:** `/analytics/earnings`
- **Access:** Protected (`admin`, `driver`)

---

## 6. Dynamic History Export

### 6.1 Download Ride History as CSV
- **Method:** `GET`
- **Endpoint:** `/export/rides/csv`
- **Access:** Protected (`rider`, `driver`, `admin`)
- **Headers Returned:**
  `Content-Type: text/csv`
  `Content-Disposition: attachment; filename="ride_history_....csv"`

### 6.2 Download Official Statement as PDF
- **Method:** `GET`
- **Endpoint:** `/export/rides/pdf`
- **Access:** Protected (`rider`, `driver`, `admin`)
- **Headers Returned:**
  `Content-Type: application/pdf`
  `Content-Disposition: attachment; filename="ride_statement_....pdf"`

---

## 7. Real-Time WebSocket Events (Socket.io)

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `join` | Client -> Server | `{ userId, role }` | Joins private user room `user_<id>` |
| `ride:watch` | Client -> Server | `{ rideId }` | Subscribes to live tracking room `ride_<id>` |
| `driver:location_update` | Driver -> Server | `{ rideId, lat, lng }` | Emits driver GPS update |
| `ride:driver_moved` | Server -> Rider | `{ rideId, lat, lng }` | Live driver movement stream |
| `ride:incoming_request`| Server -> Drivers | `{ ride }` | Broadcast to candidate drivers |
| `ride:accepted` | Server -> Rider | `{ ride, driver }` | Notifies rider that driver accepted |
| `ride:status_changed` | Server -> Both | `{ rideId, status }` | Live lifecycle state progression |
| `ride:cancelled` | Server -> Both | `{ rideId, reason }` | Cancellation broadcast |
