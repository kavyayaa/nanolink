# NanoLink 🚀

NanoLink is a production-ready URL shortener and analytics platform built using Node.js, Express.js, MongoDB, Redis, and Chart.js.

It provides fast URL shortening, real-time analytics, caching, rate limiting, and a modern dashboard UI.

---

## 🌐 Live Demo

[https://nanolink-74tm.onrender.com](https://nanolink-74tm.onrender.com)

---

## ✨ Features

* 🔗 URL shortening with optional custom aliases
* ⚡ Redis caching for ultra-fast redirects
* 🚦 Rate limiting (10 requests/hour per IP)
* 📊 Analytics dashboard with charts
* 📍 Click tracking (country, device, browser)
* ⏳ Expiring links support
* 🔐 Collision-safe Base62 short codes
* 📱 Mobile-responsive UI

---

## 🧠 Tech Stack

### Backend

* Node.js
* Express.js
* MongoDB + Mongoose
* Redis (ioredis)

### Frontend

* HTML
* CSS
* Vanilla JavaScript
* Chart.js

### Libraries

* nanoid
* ua-parser-js
* geoip-lite
* cors
* dotenv

---

## 📁 Folder Structure

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

## ⚙️ Environment Variables

Create a `.env` file:

```env
PORT=10000

MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/nanolink

REDIS_URL=rediss://default:<password>@<endpoint>.upstash.io:6379

BASE_URL=https://nanolink-74tm.onrender.com
```

---

## ▶️ Running Locally

```bash
npm install
node server.js
```

Visit:

```
http://localhost:10000
```

---

## 🔌 API Endpoints

### Create Short URL

```
POST /shorten
```

Body:

```json
{
  "originalUrl": "https://google.com",
  "customAlias": "google",
  "expiresIn": 7
}
```

---

### Redirect

```
GET /:code
```

---

### Analytics

```
GET /analytics/:code
```

Returns:

* total clicks
* clicks per day
* top countries
* browsers
* devices

---

## 📊 Analytics System

NanoLink tracks:

* Total clicks
* Countries
* Device types
* Browsers
* Referrers
* Daily click trends

---

## ⚡ Redis Usage

* URL caching for fast redirects
* Rate limiting per IP
* Reduces MongoDB load

---

## 🔐 Security Features

* URL validation using native URL API
* HTTPS/HTTP filtering
* Reserved alias protection
* Rate limiting middleware
* Collision-safe short code generation

---

## 🚀 Deployment

* Frontend + Backend: Render
* Database: MongoDB Atlas
* Cache: Upstash Redis

---

## 🛣️ Future Improvements

* JWT Authentication
* QR code generation
* Password-protected links
* Custom analytics date range
* Docker support
* Kubernetes scaling

---

## 👨‍💻 Author

Built by Kavya

---

## 🟢 Status

Live & Production Ready 🚀
