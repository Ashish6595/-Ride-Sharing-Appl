# Ride-Sharing Application Backend System

A scalable, reliable, and production-ready RESTful backend system and real-time event engine for an urban ride-sharing platform. Built using **Node.js**, **Express.js**, **SQLite (via Sequelize ORM)**, **Socket.io**, and **Mapbox API integration**.

Includes an interactive browser-based simulator dashboard, automated Jest test suite, dynamic CSV/PDF export generators, and interactive Swagger/OpenAPI documentation.

---

## 🚀 Key Features Implemented

### 1. User Authentication & Role-Based Access Control (RBAC)
- Multi-role support: **Riders**, **Drivers**, and **Administrators**.
- Password hashing with **Bcrypt** (salt rounds: 10).
- Stateless authentication using **JSON Web Tokens (JWT)**.
- Granular authorization middleware (`protect` and `authorize('rider', 'driver', 'admin')`).

### 2. Ride Request & Lifecycle Management
- Upfront route planning and transparent fare estimation without requiring immediate booking.
- Ride request creation with pickup & drop-off locations, GPS coordinates, and vehicle tier selection (`economy`, `comfort`, `xl`).
- State machine lifecycle:
  `requested` ➔ `accepted` ➔ `arrived` ➔ `in_progress` ➔ `completed` (or `cancelled`).
- Concurrency protection: Prevents a rider or driver from having duplicate simultaneous active trips.

### 3. Nearest Driver Matching Algorithm (Haversine Formula)
- Computes Great-Circle spherical distance between the rider's pickup coordinates and all online, available drivers.
- Automatically filters drivers within a configurable search radius (default: 10 km).
- Multi-factor candidate sorting: nearest distance first, with driver rating as secondary tie-breaker.

### 4. Integration with 3rd-Party Mapbox API
- Route planning and driving distance calculation via Mapbox Directions API.
- Geocoding and reverse geocoding support.
- **Intelligent Offline Fallback:** If `MAPBOX_ACCESS_TOKEN` is omitted or network is offline, the backend gracefully falls back to an internal high-precision mathematical routing engine with road curvature factors (1.25x) and urban traffic speed estimates. Zero crashes out of the box!

### 5. Dynamic Fare Calculation & Surge Pricing
- Transparent pricing breakdown:
  $$\text{Subtotal} = \text{Base Fare} + (\text{Distance} \times \text{Rate/km}) + (\text{Duration} \times \text{Rate/min})$$
- Multipliers for vehicle tiers (`economy`: 1.0x, `comfort`: 1.25x, `xl`: 1.55x).
- Dynamic surge algorithm:
  - **Peak Hours:** Morning rush (08:00–10:30) and evening rush (17:00–20:30) apply a 1.4x–1.5x multiplier.
  - **Demand/Supply Ratio:** Real-time surge triggered when pending ride requests outnumber active drivers in the zone.
  - Surge multiplier is capped between 1.0x and 2.5x to prevent extreme gouging.
- Transparent tax (5% GST) and 80/20 driver earnings vs platform fee split.

### 6. Real-Time WebSockets (Socket.io)
- Real-time ride request broadcasting to candidate drivers.
- Instant acceptance notification delivered to the rider with driver vehicle model, license plate, and rating.
- Live GPS tracking updates: Driver emits coordinate updates, broadcast directly to the rider's live tracking room.
- Real-time ride cancellation and status transitions.

### 7. Search & Filter Capabilities
- Riders can search and filter their trip history by status, destination, and date ranges.
- Drivers can query and filter pending ride requests by proximity (distance to pickup in km) and location keywords.

### 8. Driver Ratings & Quality Assurance
- Post-trip review submission (1–5 star rating and feedback comment).
- Verification checks: Only riders who took that specific completed trip can review it, and only once per ride.
- Automatically recalculates driver's aggregate score (`averageRating` and `totalRatings`).

### 9. Data Visualization & Analytics APIs
- **Platform Overview:** High-level executive dashboard showing total users, active drivers, completion rate, platform profit, and average trip metrics.
- **7-Day Ride Trends:** Time-series dataset of completed vs. cancelled trips formatted for **Chart.js**.
- **Driver Performance:** Ranks top drivers by earnings, completed trips, and completion percentages.
- **Financial Breakdown:** Daily revenue, driver payouts, and net platform profit.

### 10. Dynamic Export of Ride History
- Dynamic **CSV Export** using `json2csv` with detailed trip metrics.
- Dynamic **PDF Statement Generation** using `pdfkit` featuring official header, trip statistics, and paginated trip table.

---

## 📂 Project Architecture

```
rideshare-backend/
├── .env.example                     # Sample environment configurations
├── .env                             # Local configuration file
├── package.json                     # Node.js dependencies & scripts
├── API_DOCUMENTATION.md             # In-depth REST endpoint reference
├── README.md                        # Project documentation
├── docs/
│   ├── swagger.json                 # OpenAPI 3.0 API specifications
│   └── rideshare-api.postman_collection.json # Ready-to-import Postman collection
├── src/
│   ├── app.js                       # Express application configuration
│   ├── server.js                    # HTTP & Socket.io server entrypoint
│   ├── config/
│   │   ├── config.js                # Environment settings & pricing defaults
│   │   └── database.js              # SQLite Sequelize configuration
│   ├── controllers/
│   │   ├── authController.js        # Authentication & profile logic
│   │   ├── rideController.js        # Booking, routing & status lifecycle
│   │   ├── driverController.js      # Availability, GPS updates & earnings
│   │   ├── reviewController.js      # Reviews & aggregate rating logic
│   │   ├── analyticsController.js   # Chart.js time-series & KPI analytics
│   │   └── exportController.js      # CSV and PDF dynamic file downloads
│   ├── middleware/
│   │   ├── auth.js                  # JWT token verification
│   │   ├── roleCheck.js             # Role-based access control (RBAC)
│   │   ├── validate.js              # Input validation rules
│   │   └── errorHandler.js          # Centralized error handler
│   ├── models/
│   │   ├── index.js                 # Database relationships
│   │   ├── User.js                  # User entity (rider, driver, admin)
│   │   ├── DriverProfile.js         # Driver vehicle & performance stats
│   │   ├── Ride.js                  # Ride booking entity
│   │   └── Review.js                # Ride review entity
│   ├── services/
│   │   ├── mapboxService.js         # Mapbox Directions API & offline fallback
│   │   ├── matchingService.js       # Nearest driver matching engine
│   │   ├── fareService.js           # Upfront pricing & surge engine
│   │   ├── exportService.js         # CSV & PDF generation service
│   │   └── socketService.js         # Socket.io real-time event router
│   ├── utils/
│   │   ├── haversine.js             # Great-Circle distance formula
│   │   ├── surgeCalculator.js       # Dynamic peak hours & demand surge
│   │   └── logger.js                # Custom logging helper
│   ├── database/
│   │   └── seed.js                  # Database seeder with realistic test data
│   └── public/                      # Interactive browser simulator UI
│       ├── index.html
│       ├── style.css
│       └── app.js
└── tests/
    ├── auth.test.js                 # Authentication & RBAC unit tests
    ├── fare.test.js                 # Haversine & pricing formula tests
    └── rides.test.js                # Ride lifecycle, reviews & export tests
```

---

## 🛠️ Quick Start Guide

### Prerequisites
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher

### 1. Installation
Clone or navigate to the repository directory and install dependencies:
```bash
npm install
```

### 2. Configure Environment Variables
A pre-configured `.env` is already created. You can customize settings if desired:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=rideshare_super_secure_jwt_secret_key_2026
MAPBOX_ACCESS_TOKEN=   # Optional: built-in intelligent fallback is active if omitted
BASE_FARE=50.00
PER_KM_RATE=12.00
PER_MINUTE_RATE=2.50
```

### 3. Seed Database with Realistic Demo Data
Run the database seed script to generate sample riders, drivers, historical trips, and reviews:
```bash
npm run seed
```

### 4. Start the Server
```bash
npm start
```
Or for auto-reload during development:
```bash
npm run dev
```

The server will be available at:
- **Interactive Live Simulator Dashboard:** [http://localhost:5000](http://localhost:5000)
- **Interactive Swagger API Docs:** [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
- **API Base URL:** `http://localhost:5000/api/v1`

---

## 🧪 Running Automated Tests

Run the full automated test suite using Jest:
```bash
npm test
```
All 22 test cases cover:
- Authentication & JWT token issuance
- Role-based route authorization
- Haversine Great-Circle distance math
- Surge pricing triggers (peak hours and demand/supply ratio)
- Upfront fare estimates and vehicle multipliers
- Ride booking, matching, and full lifecycle (`requested` ➔ `accepted` ➔ `arrived` ➔ `in_progress` ➔ `completed`)
- Driver rating recalculations
- CSV and PDF report generation

---

## 🔑 Default Seed Accounts

| Role | Email | Password | Details |
|---|---|---|---|
| **Admin** | `admin@rideshare.com` | `password123` | Full access to platform analytics and all rides |
| **Rider 1** | `aarav@rideshare.com` | `password123` | Regular rider in Mumbai |
| **Rider 2** | `priya@rideshare.com` | `password123` | Regular rider in Mumbai |
| **Driver 1** | `rajesh@rideshare.com` | `password123` | Maruti Dzire (`economy`), 4.85 ★ |
| **Driver 2** | `vikram@rideshare.com` | `password123` | Honda City (`comfort`), 4.90 ★ |
| **Driver 3** | `anita@rideshare.com` | `password123` | Innova Crysta (`xl`), 4.95 ★ |
| **Driver 4** | `sunil@rideshare.com` | `password123` | Hyundai Aura (`economy`), Offline |

---

## 📝 License
This project is open-source and developed for academic and educational evaluation.
