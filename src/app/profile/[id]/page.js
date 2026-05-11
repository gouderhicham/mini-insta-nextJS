import { auth } from "../../../auth";
import { getUserProfile } from "../../actions/users";
import { getUserPosts } from "../../actions/posts";
import { checkIsFollowing } from "../../actions/social";
import UserProfileClient from "../../components/UserProfileClient";
import { notFound } from "next/navigation";

export async function generateMetadata(props) {
  const params = await props.params;
  const { id } = params;
  const { user } = await getUserProfile(id);

  if (!user) {
    return {
      title: "Profile Not Found",
    };
  }

  const name = user.fullName || user.username || "User Profile";
  return {
    title: name,
    description: `Check out ${name}'s profile, posts, and updates on Mini Insta.`,
  };
}

export default async function ProfilePage(props) {
  const params = await props.params;
  const { id } = params;
  const session = await auth();

  let latestUser = session?.user || null;
  if (latestUser?.id) {
    // Only fetch if it's NOT the same as the profile we are viewing to save a read
    if (latestUser.id === id) {
      // Defer to profileResult later
    } else {
      const { user: currentUserData } = await getUserProfile(latestUser.id);
      if (currentUserData) {
        latestUser = {
          ...latestUser,
          name: currentUserData.fullName || currentUserData.username || latestUser.name,
          image: currentUserData.profilePic || latestUser.image,
        };
      }
    }
  }

  const [profileResult, postsResult, followingResult] = await Promise.all([
    getUserProfile(id),
    getUserPosts(id, latestUser?.id),
    latestUser?.id && latestUser.id !== id ? checkIsFollowing(latestUser.id, id) : Promise.resolve({ isFollowing: false }),
  ]);

  if (profileResult.error || !profileResult.user) {
    return notFound();
  }

  const userProfile = profileResult.user;
  const userPosts = postsResult.posts || [];
  const isOwner = session?.user?.id === id;

  if (isOwner) {
    latestUser = {
      ...latestUser,
      name: userProfile.fullName || userProfile.username || latestUser?.name,
      image: userProfile.profilePic || latestUser?.image,
    };
  }

  return (
    <UserProfileClient 
      userProfile={userProfile} 
      userPosts={userPosts} 
      isOwner={isOwner} 
      currentUser={latestUser}
      initialIsFollowing={followingResult.isFollowing}
    />
  );
}
