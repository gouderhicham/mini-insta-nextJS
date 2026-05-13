import { auth } from "../../auth";
import { redirect } from "next/navigation";
import MessagesClient from "./MessagesClient";

export const metadata = {
  title: "Messages",
  description: "View and send real-time messages on Mini Insta.",
};

export default async function MessagesPage() {
  const session = await auth();

  // Protect the route
  if (!session?.user) {
    redirect("/login");
  }

  return <MessagesClient currentUser={session.user} />;
}
