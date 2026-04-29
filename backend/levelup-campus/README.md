# 🎮 LevelUp Campus — Backend

A gamified student dashboard backend built with Node.js, Express, MongoDB, JWT, Nodemailer, and Socket.IO.

---

## 📁 Folder Structure

```
levelup-campus/
├── src/
│   ├── server.js                  # Entry point, HTTP + Socket.IO server
│   ├── app.js                     # Express app, middleware, routes
│   ├── config/
│   │   ├── db.js                  # MongoDB connection
│   │   └── levels.js              # Level config & XP calculator
│   ├── models/
│   │   ├── User.js                # User schema (XP, level, streak, badges)
│   │   ├── OTP.js                 # OTP with TTL index
│   │   ├── Badge.js               # Badge definitions
│   │   ├── Achievement.js         # Achievement definitions
│   │   └── Community.js           # ChatMessage + DiscussionPost + Comment
│   ├── controllers/
│   │   ├── auth.controller.js     # sendOTP, verifyOTP, getMe
│   │   ├── dashboard.controller.js
│   │   ├── xp.controller.js       # addXP, getXPHistory
│   │   ├── leaderboard.controller.js
│   │   ├── community.controller.js
│   │   └── rewards.controller.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── dashboard.routes.js
│   │   ├── xp.routes.js
│   │   ├── leaderboard.routes.js
│   │   ├── community.routes.js
│   │   └── rewards.routes.js
│   ├── middleware/
│   │   ├── auth.middleware.js      # JWT protect + generateToken
│   │   ├── emailDomain.middleware.js # College email domain validation
│   │   ├── validate.middleware.js  # express-validator rules
│   │   └── rateLimiter.middleware.js
│   ├── services/
│   │   ├── email.service.js        # Nodemailer OTP + badge emails
│   │   ├── otp.service.js          # OTP generate, store, verify
│   │   └── xp.service.js           # awardXP, updateStreak, badge checks
│   └── sockets/
│       └── index.js               # Socket.IO real-time chat
├── scripts/
│   └── seed.js                    # DB seeder (users, badges, achievements)
├── .env.example
├── package.json
└── README.md
```

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your MongoDB URI, email credentials, JWT secret

# 3. Seed the database
npm run seed

# 4. Start development server
npm run dev

# 5. Start production server
npm start
```

---

## 🔐 Environment Variables

| Variable | Description | Example |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/levelup_campus` |
| `JWT_SECRET` | JWT signing secret | `super_secret_key` |
| `JWT_EXPIRES_IN` | Token expiry | `7d` |
| `EMAIL_HOST` | SMTP host | `smtp.gmail.com` |
| `EMAIL_USER` | SMTP username | `your@gmail.com` |
| `EMAIL_PASS` | SMTP password/app password | `xxxx xxxx xxxx xxxx` |
| `OTP_EXPIRY_MINUTES` | OTP validity duration | `10` |
| `OTP_COOLDOWN_SECONDS` | Minimum wait between OTP sends | `60` |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated allowed domains | `college.edu,iit.ac.in` |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:3000` |

---

## 🌐 REST API Reference

### Authentication

#### `POST /api/auth/send-otp`
Send 6-digit OTP to a college email.

**Request:**
```json
{
  "email": "student@college.edu",
  "name": "Arjun Sharma"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "OTP sent to student@heritageit.edu.in Valid for 10 minutes.",
  "cooldownSeconds": 60
}
```

**Error — Invalid Domain (400):**
```json
{
  "success": false,
  "message": "Only college email addresses are allowed. Accepted domains: college.edu, iit.ac.in"
}
```

**Error — Cooldown (429):**
```json
{
  "success": false,
  "message": "Please wait 42s before requesting a new OTP.",
  "waitSeconds": 42
}
```

---

#### `POST /api/auth/verify-otp`
Verify OTP and get JWT token. Creates user if new.

**Request:**
```json
{
  "email": "student@college.edu",
  "otp": "482931",
  "name": "Arjun Sharma"
}
```

**Response — New User (200):**
```json
{
  "success": true,
  "message": "Account created successfully! Welcome to LevelUp Campus 🎮",
  "isNewUser": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "664abc123def456",
    "name": "Arjun Sharma",
    "collegeEmail": "student@college.edu",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun Sharma",
    "currentLevel": 1,
    "levelTitle": "Freshman",
    "totalXP": 0,
    "dailyStreak": 1
  }
}
```

---

#### `GET /api/auth/me` 🔒
Returns authenticated user profile.

**Headers:** `Authorization: Bearer <token>`

```json
{
  "success": true,
  "user": {
    "_id": "664abc123def456",
    "name": "Arjun Sharma",
    "collegeEmail": "student@college.edu",
    "currentLevel": 5,
    "levelTitle": "Specialist",
    "totalXP": 1500,
    "dailyStreak": 12
  }
}
```

---

### Dashboard

#### `GET /api/dashboard` 🔒

**Response (200):**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "664abc123def456",
      "name": "Arjun Sharma",
      "collegeEmail": "student@college.edu",
      "avatar": "https://api.dicebear.com/...",
      "createdAt": "2024-05-15T08:30:00Z"
    },
    "level": {
      "current": 5,
      "title": "Specialist",
      "totalXP": 1500,
      "currentXP": 150,
      "requiredXP": 900,
      "progressPercent": 16,
      "nextLevel": {
        "level": 6,
        "title": "Expert",
        "xpNeeded": 750
      },
      "upcomingLevels": [
        { "level": 6, "title": "Expert",      "requiredXP": 2250, "xpNeeded": 750  },
        { "level": 7, "title": "Master",       "requiredXP": 3450, "xpNeeded": 1950 },
        { "level": 8, "title": "Grandmaster",  "requiredXP": 5050, "xpNeeded": 3550 }
      ],
      "isMaxLevel": false
    },
    "streak": {
      "current": 12,
      "longest": 15,
      "lastActiveDate": "2024-05-22T00:00:00Z"
    },
    "rank": {
      "position": 3,
      "totalUsers": 142,
      "percentile": 98
    },
    "badges": [
      {
        "badge": {
          "_id": "664badge1",
          "name": "Week Warrior",
          "description": "Maintained a 7-day streak",
          "icon": "🔥",
          "category": "streak",
          "rarity": "common",
          "xpReward": 50
        },
        "earnedAt": "2024-05-18T10:00:00Z"
      }
    ],
    "recentAchievements": [
      {
        "achievement": {
          "name": "On a Roll",
          "description": "Earn 1000 XP in total",
          "icon": "🎳"
        },
        "earnedAt": "2024-05-20T14:22:00Z"
      }
    ],
    "communityStats": {
      "posts": 4,
      "comments": 17,
      "upvotesReceived": 23
    }
  }
}
```

---

### XP System

#### `POST /api/xp/add` 🔒

**Request:**
```json
{
  "amount": 150,
  "source": "task",
  "description": "Completed Data Structures Assignment 3"
}
```

**Response — Level Up (200):**
```json
{
  "success": true,
  "message": "🎉 Level up! You're now level 6 — Expert!",
  "data": {
    "xpAwarded": 150,
    "totalXP": 2300,
    "currentLevel": 6,
    "levelTitle": "Expert",
    "currentXP": 50,
    "requiredXP": 1200,
    "progressPercent": 4,
    "leveledUp": true,
    "previousLevel": 5,
    "nextLevel": { "level": 7, "title": "Master", "xpNeeded": 1150 },
    "upcomingLevels": [...],
    "newlyEarned": {
      "badges": [
        { "name": "Level 5 Reached", "icon": "🚀", "xpReward": 75 }
      ],
      "achievements": []
    }
  }
}
```

#### `GET /api/xp/history?page=1&limit=20` 🔒

```json
{
  "success": true,
  "data": {
    "history": [
      {
        "amount": 150,
        "source": "task",
        "description": "Completed Data Structures Assignment 3",
        "earnedAt": "2024-05-22T11:30:00Z"
      }
    ],
    "totalXP": 2300,
    "pagination": { "page": 1, "limit": 20, "total": 47, "pages": 3 }
  }
}
```

---

### Leaderboard

#### `GET /api/leaderboard/weekly` 🔒

```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "_id": "664abc1",
        "name": "Ananya Iyer",
        "avatar": "https://api.dicebear.com/...",
        "currentLevel": 9,
        "levelTitle": "Legend",
        "totalXP": 7100,
        "dailyStreak": 45,
        "weeklyXP": 820
      },
      {
        "rank": 2,
        "_id": "664abc2",
        "name": "Sneha Gupta",
        "avatar": "https://api.dicebear.com/...",
        "currentLevel": 7,
        "levelTitle": "Master",
        "totalXP": 5200,
        "dailyStreak": 30,
        "weeklyXP": 650
      }
    ],
    "myRank": 5,
    "period": "weekly"
  }
}
```

#### `GET /api/leaderboard/fastest-progress` 🔒
Ranked by total XP.

#### `GET /api/leaderboard/streak-holders` 🔒
Ranked by current daily streak.

---

### Community

#### `POST /api/community/posts` 🔒

**Request:**
```json
{
  "title": "How to crack OS interview questions?",
  "content": "I have interviews coming up and need advice on Operating Systems concepts...",
  "category": "peer-help",
  "tags": ["os", "interview", "tips"]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Post created! +20 XP earned 🎯",
  "data": {
    "_id": "664post1",
    "author": {
      "_id": "664abc1",
      "name": "Arjun Sharma",
      "avatar": "https://...",
      "currentLevel": 5,
      "levelTitle": "Specialist"
    },
    "title": "How to crack OS interview questions?",
    "content": "I have interviews coming up...",
    "category": "peer-help",
    "tags": ["os", "interview", "tips"],
    "upvotes": [],
    "comments": [],
    "views": 0,
    "createdAt": "2024-05-22T12:00:00Z"
  }
}
```

#### `GET /api/community/posts?category=peer-help&sort=top&page=1` 🔒

#### `POST /api/community/posts/:id/comment` 🔒
```json
{ "content": "Great question! Start with scheduling algorithms and memory management." }
```

#### `POST /api/community/posts/:id/upvote` 🔒
Toggles upvote. Returns `{ upvoteCount, isUpvoted }`.

#### `GET /api/community/chat/history?room=general&limit=50` 🔒

---

### Rewards

#### `GET /api/rewards` 🔒

```json
{
  "success": true,
  "data": {
    "earned": { "badges": 4, "achievements": 6 },
    "total":  { "badges": 14, "achievements": 11 },
    "completionPercent": 40,
    "recentBadges": [...],
    "recentAchievements": [...]
  }
}
```

#### `GET /api/rewards/badges` 🔒

```json
{
  "success": true,
  "data": {
    "badges": [
      {
        "_id": "664badge1",
        "name": "Week Warrior",
        "description": "Maintained a 7-day streak",
        "icon": "🔥",
        "category": "streak",
        "rarity": "common",
        "xpReward": 50,
        "unlockCondition": { "type": "streak", "value": 7 },
        "isEarned": true,
        "earnedAt": "2024-05-18T10:00:00Z",
        "progress": 100
      },
      {
        "_id": "664badge2",
        "name": "Fortnight Fire",
        "description": "Maintained a 15-day streak",
        "icon": "⚡",
        "category": "streak",
        "rarity": "rare",
        "xpReward": 100,
        "unlockCondition": { "type": "streak", "value": 15 },
        "isEarned": false,
        "earnedAt": null,
        "progress": 80
      }
    ],
    "earned": 4,
    "total": 14
  }
}
```

#### `GET /api/rewards/achievements` 🔒

---

## 🔌 Socket.IO Events

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `join_room` | `{ room: "general" }` | Join a chat room |
| `send_message` | `{ content, room }` | Send a chat message |
| `typing_start` | `{ room }` | Start typing indicator |
| `typing_stop` | `{ room }` | Stop typing indicator |
| `leave_room` | `{ room }` | Leave a chat room |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `chat_history` | `{ room, messages[] }` | Last 30 messages on join |
| `new_message` | `{ id, sender, content, room, timestamp }` | New real-time message |
| `system_message` | `{ content, timestamp }` | User join/leave alerts |
| `user_typing` | `{ userId, name }` | Typing indicator |
| `user_stopped_typing` | `{ userId }` | Stop typing |
| `online_count` | `number` | Total connected users |
| `error` | `{ message }` | Error notification |

**Available rooms:** `general`, `peer-help`, `announcements`, `random`

**Authentication:** Pass JWT token in socket handshake:
```js
const socket = io("http://localhost:5000", {
  auth: { token: "Bearer eyJhbGci..." }
});
```

---

## 🏆 Level System

| Level | Title | Total XP Required | XP for This Level |
|---|---|---|---|
| 1 | Freshman | 0 | 100 |
| 2 | Explorer | 100 | 250 |
| 3 | Scholar | 350 | 400 |
| 4 | Achiever | 750 | 600 |
| 5 | Specialist | 1,350 | 900 |
| 6 | Expert | 2,250 | 1,200 |
| 7 | Master | 3,450 | 1,600 |
| 8 | Grandmaster | 5,050 | 2,000 |
| 9 | Legend | 7,050 | 2,500 |
| 10 | Campus Legend | 9,550 | — |

---

## 🏅 Badge & Achievement Unlock Conditions

### Streak Badges
| Badge | Condition | XP Reward | Rarity |
|---|---|---|---|
| Week Warrior | 7-day streak | 50 | Common |
| Fortnight Fire | 15-day streak | 100 | Rare |
| Monthly Maven | 30-day streak | 250 | Epic |
| Century Scholar | 100-day streak | 1000 | Legendary |

### XP Badges
| Badge | Condition | XP Reward |
|---|---|---|
| XP Initiate | 100 total XP | 10 |
| XP Hunter | 500 total XP | 25 |
| XP Master | 2000 total XP | 100 |
| XP Legend | 5000 total XP | 500 |

---

## 🔒 Security Features

- **Email domain validation** — Configurable via `ALLOWED_EMAIL_DOMAINS`
- **OTP rate limiting** — 3 requests per 15 minutes per IP + email
- **OTP cooldown** — Configurable cooldown between sends (default 60s)
- **OTP attempt limiting** — Max 5 failed attempts before OTP invalidation
- **OTP auto-expiry** — MongoDB TTL index auto-deletes expired OTPs
- **JWT protection** — All dashboard routes require valid JWT
- **Input validation** — All inputs validated via `express-validator`
- **Global rate limiting** — 200 requests per 15 minutes per IP
- **bcrypt ready** — Password hashing in place for future use

---

## 🛠️ XP Sources

| Source | XP Per Action |
|---|---|
| Task/Assignment | Custom (1–10000) |
| Community Post | 20 |
| Comment | 10 |
| Chat participation | 5 (per 10 messages) |
| Badge earned | Badge's `xpReward` |
| Achievement earned | Achievement's `xpReward` |
