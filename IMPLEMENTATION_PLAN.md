# Social Media App Implementation Plan

This plan outlines the steps to build a premium social media application using **Next.js 16 (App Router)** and **Firebase (Firestore, Auth, Storage)**, with **NextAuth (Auth.js)** handling server-side authentication.

## 1. Authentication & User Onboarding
- **NextAuth (Auth.js) Setup:** Configure `auth.ts` with a Credentials provider (linking to Firebase Auth) and/or Social providers.
- **JWT Strategy:** Ensure sessions are stateless and handled via JWT for optimal server-side performance.
- **Sign In / Sign Up Pages:** Create beautiful, responsive forms.
- **Username Registration:** Add a step during signup to choose a unique handle.
- **User Document Sync:** Use NextAuth callbacks (`signIn`, `session`) to ensure the Firestore `/users/{uid}` document is synchronized with the auth session.

## 2. Core Layout & Navigation
- **Responsive Navigation:** A persistent sidebar (desktop) or bottom-bar (mobile) for easy access to Feed, Search, Post, and Profile.
- **Theme Provider:** Implement a design system with CSS variables for a consistent premium look.

## 3. Post Management
- **Post Creation Modal:** A modern UI to compose posts with text and image uploads.
- **Firebase Storage Integration:** Handle image uploads and return public URLs for the `imageUrl` field.
- **Feed Logic:** Fetch posts from the `/posts` collection, ordered by `createdAt`.

## 4. Interactions (Likes & Comments)
- **Post Likes:** Implement a toggle button that updates `/posts/{id}/likes/{uid}` and increments the post's `likeCount`.
- **Comments System:** A sub-collection `/posts/{postId}/comments`. Each comment will support:
    - **Likes:** Updates `/posts/{id}/comments/{cid}/likes/{uid}` and increments comment `likeCount`.
- **Real-time Updates:** Use Firestore listeners for immediate feedback on interactions.

## 5. Social Graph & Profiles
- **User Profile Page (`/[username]`):** 
    - Display user metadata (bio, profile pic, counts).
    - Fetch and display only posts authored by this user.
- **Follow/Unfollow Logic:** 
    - Create/Delete documents in `/social_graph/{followerId_followingId}`.
    - Atomically update `followerCount` and `followingCount` in the respective user documents.

---

## Technical Stack
- **Framework:** Next.js 16 (App Router)
- **Database:** Firebase Firestore
- **Auth:** NextAuth (Auth.js) with JWT Strategy
- **Storage:** Firebase Storage
- **State:** Zustand (for UI state)
- **Styling:** Vanilla CSS (Modern CSS features: Nesting, Variables, Flex/Grid)

## Verification Plan

### Automated Tests
- Verify the Signup/Login flow and Post creation using browser tools.
- Check that liking/unliking correctly updates counters.

### Manual Verification
- Verify responsiveness on different screen sizes.
- Ensure transitions between pages are smooth.
