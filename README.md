# NanoLink

NanoLink is a production-ready URL shortener and analytics platform built using Node.js, Express.js, MongoDB, Redis, and Chart.js.

It allows users to generate short URLs, track traffic analytics, monitor clicks, and visualize usage trends through an interactive dashboard.

---

# Features

* URL shortening with custom aliases
* Redis-based caching for fast redirects
* Redis-powered rate limiting
* MongoDB analytics aggregation
* Asynchronous click tracking
* Device, browser, and country analytics
* Clicks-per-day charts using Chart.js
* Expiring links support
* Collision-safe Base62 short code generation
* Mobile-responsive glassmorphic UI

---

# Tech Stack

## Backend

* Node.js
* Express.js
* MongoDB + Mongoose
* Redis + ioredis

## Frontend

* HTML
* CSS
* Vanilla JavaScript
* Chart.js

## Packages

* express
* mongoose
* ioredis
* dotenv
* nanoid
* ua-parser-js
* geoip-lite
* cors

---

# Folder Structure

```bash
url-shortener/
├── server.js
├── .env.example
├── config/
│   ├── db.js
│   └── redis.js
├── models/
│   ├── Url.js
│   └── Click.js
├── routes/
│   ├── url.js
│   └── analytics.js
├── middleware/
│   └── rateLimiter.js
├── utils/
│   └── encode.js
└── public/
    └── index.html
```

---

# Installation

## Clone Repository

```bash
git clone <your-github-repo-url>
cd url-shortener
```

## Install Dependencies

```bash
npm install
```

---

# Environment Variables

Create a `.env` file in the root directory.

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/url_shortener
REDIS_URL=redis://localhost:6379
BASE_URL=http://localhost:5000
```

---

# Running the Project

## Start MongoDB

Make sure MongoDB is running locally.

## Start Redis

Make sure Redis server is running locally.

## Start Server

```bash
node server.js
```

or using nodemon:

```bash
npx nodemon server.js
```

---

# API Endpoints

## Create Short URL

### POST `/shorten`

Request Body:

```json
{
  "originalUrl": "https://google.com",
  "customAlias": "google",
  "expiresIn": 7
}
```

---

## Redirect URL

### GET `/:code`

Example:

```bash
http://localhost:5000/abc123
```

Redirects user to the original URL.

---

## Analytics Endpoint

### GET `/analytics/:code`

Returns:

* Total clicks
* Clicks per day
* Top countries
* Device breakdown
* Browser breakdown

---

# Analytics Tracked

NanoLink tracks:

* Total clicks
* Visitor countries
* Browser usage
* Device types
* Referrer information
* Daily traffic trends

---

# Redis Usage

Redis is used for:

* High-speed URL caching
* Rate limiting
* Reducing MongoDB read traffic

---

# Security Features

* URL validation using `new URL()`
* HTTP/HTTPS protocol filtering
* Reserved custom alias protection
* Rate limiting (10 requests/hour)
* Collision-safe short code generation

---

# Future Improvements

* User authentication
* QR code generation
* Password-protected links
* Custom analytics date ranges
* Docker deployment
* Kubernetes scaling

---

# Deployment

Recommended deployment stack:

* Render / Railway
* MongoDB Atlas
* Upstash Redis

---

# Author

Built by Kavya.
