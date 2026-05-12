# 📸 Mini Instagram

A modern, high-performance social media web application built with **Next.js 15**, **Firebase**, and **Auth.js (NextAuth)**. Experience real-time interactions, seamless notifications, and a premium UI.

🚀 **Live Demo:** [https://mininsta-gh.vercel.app](https://mininsta-gh.vercel.app/)

---

## ✨ Key Features

- **🔐 Robust Authentication**: Secure login and signup with NextAuth, including Google OAuth and Email/Password credentials.
- **📝 Content Sharing**: Create posts with image uploads (via ImgBB) and text content.
- **❤️ Real-time Interactions**: Like and comment on posts with optimistic UI updates for a snappy feel.
- **🔔 Notification System**: Real-time Firebase-powered notifications for likes, comments, and new followers.
- **👤 User Profiles**: Personalized profile pages with bio, profile pictures, and post history.
- **🤝 Social Graph**: Follow/unfollow system with real-time count updates.
- **🔍 User Search**: Quickly find and connect with other users.
- **⚡ Performance Optimized**: Server-side rendering (SSR), dynamic metadata for SEO, and React caching for efficient data fetching.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Styling**: [Vanilla CSS Modules](https://nextjs.org/docs/app/building-your-application/styling/css-modules) (Premium aesthetics)
- **Database & Auth**: [Firebase](https://firebase.google.com/) (Firestore & Admin SDK)
- **Authentication**: [NextAuth.js v5](https://authjs.dev/)
- **State Management**: [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)
- **Fonts**: [Geist](https://vercel.com/font)

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/gouderhicham/mini-insta-nextJS.git
cd mini-insta-nextJS
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory and add your credentials:

```env
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_client_email
FIREBASE_ADMIN_PRIVATE_KEY="your_private_key"

# NextAuth
AUTH_SECRET=your_auth_secret

# ImgBB (For image uploads)
NEXT_PUBLIC_IMGBB_API_KEY=your_imgbb_key
```

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🎨 Design Philosophy

Mini Instagram focuses on **Premium Visual Excellence**:
- **Modern Typography**: Using Geist for a clean, readable interface.
- **Smooth Transitions**: Subtle micro-animations and hover effects.
- **Glassmorphism**: Elegant translucent UI elements.
- **Mobile First**: Fully responsive design that feels native on any device.

---

## 👤 Author

**Gouder Hicham**
- Website: [https://mini-insta-next-js.vercel.app/](https://mini-insta-next-js.vercel.app/)
- Project: Mini Instagram Clone

---

*This project is for educational purposes, demonstrating the power of Next.js and Firebase integration.*
