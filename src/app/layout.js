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
export const metadata = {
  title: {
    default: "Your Brand Name",
    template: "%s | Your Brand Name",
  },
  description: "A concise, keyword-rich description of your app (150-160 characters).",
  keywords: ["Next.js", "React", "Web Development", "Your Specific Niche"],
  authors: [{ name: "Gouder Hicham" }],
  creator: "Gouder Hicham",
  metadataBase: new URL("https://your-domain.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Your Brand Name",
    description: "Catchy description for social media shares.",
    url: "https://your-domain.com",
    siteName: "Your Brand Name",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Brand Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Your Brand Name",
    description: "Catchy description for Twitter/X.",
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
      <body suppressHydrationWarning className="min-h-screen bg-background font-sans">
        <Navbar session={latestSession} />
        {children}
      </body>
    </html>
  );
}