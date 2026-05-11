import { auth } from "../../auth";
import { getNotifications } from "../actions/notifications";
import NotificationsClient from "../components/NotificationsClient";
import styles from "./notifications.module.css";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Notifications",
  description: "Stay updated with your latest likes, comments, and new followers.",
};

export default async function NotificationsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { notifications = [], error } = await getNotifications(session.user.id);

  return (
    <div className={styles.container}>
      <NotificationsClient 
        initialNotifications={notifications} 
        userId={session.user.id} 
      />
    </div>
  );
}
