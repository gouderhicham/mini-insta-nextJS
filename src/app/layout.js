import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import { auth } from "../auth";
import { getUserProfile } from "./actions/users";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// --- SEO & METADATA CONFIGURATION ---
export const viewport = {
  themeColor: "#1E2128",
};
export const metadata = {
  title: {
    default: "Mini Instagram | Gouder Hicham",
    template: "%s | Mini Insta",
  },
  description: "A mini social media application featuring Instagram-like functionalities such as posts, likes, comments, and real-time notifications.",
  keywords: ["Next.js", "React", "Social Media", "Instagram Clone", "Firebase", "Web Development", "Gouder Hicham"],
  authors: [{ name: "Gouder Hicham" }],
  creator: "Gouder Hicham",
  metadataBase: new URL("https://mini-insta-next-js.vercel.app/"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Mini Instagram | Gouder Hicham",
    description: "Join our mini social network. Share posts, follow friends, and interact in real-time.",
    url: "https://mini-insta-next-js.vercel.app/",
    siteName: "Mini Insta",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Mini Instagram App Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mini Instagram | Gouder Hicham",
    description: "Join our mini social network. Share posts, follow friends, and interact in real-time.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({ children }) {
  const session = await auth();
  
  // Fetch latest user info from Firestore so Navbar gets the newest profile picture
  let latestSession = session;
  if (session?.user?.id) {
    const { user } = await getUserProfile(session.user.id);
    if (user) {
      latestSession = {
        ...session,
        user: {
          ...session.user,
          name: user.fullName || user.username || session.user.name,
          image: user.profilePic || session.user.image,
        }
      };
    }
  }

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body suppressHydrationWarning className="appBody">
        <Navbar session={latestSession} />
        <div className={`${session?.user ? 'mainContent' : 'mainContent-no-margin'}`}>
          {children}
        </div>
      </body>
    </html>
  );
}