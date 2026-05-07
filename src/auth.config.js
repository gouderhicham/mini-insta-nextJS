import CredentialsProvider from "next-auth/providers/credentials";

export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        idToken: { label: "ID Token", type: "text" }
      },
      async authorize(credentials) {
        // Note: In production, store FIREBASE_API_KEY in .env.local
        const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAbSPdccVRsKMTRCCcAWy4ihcFWCdsSipI";

        try {
          // Handle Google Sign In (via ID Token)
          if (credentials?.idToken) {
            const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken: credentials.idToken })
            });

            const data = await res.json();

            if (res.ok && data.users && data.users.length > 0) {
              const user = data.users[0];
              return {
                id: user.localId,
                email: user.email,
                name: user.displayName || "",
                image: user.photoUrl || ""
              };
            }
            console.error("Firebase ID token verification error:", data.error?.message);
            return null;
          }

          // Handle Email/Password Sign In
          if (!credentials?.email || !credentials?.password) return null;
          
          const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
              returnSecureToken: true
            })
          });

          const data = await res.json();

          if (res.ok && data.localId) {
            return {
              id: data.localId,
              email: data.email,
              name: data.displayName || "",
              image: data.profilePicture || ""
            };
          }
          
          console.error("Firebase auth error:", data.error?.message);
          return null;
        } catch (error) {
          console.error("Fetch error:", error);
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        session.user.id = token.uid;
        // You could fetch more user details from Firestore here if needed
      }
      return session;
    }
  }
};
