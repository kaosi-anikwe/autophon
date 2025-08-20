import UserProfile from "@/components/profile/UserProfile";
import { useAppSelector } from "../hooks/useAppDispatch";

export function ProfilePage() {
  const { user } = useAppSelector((state) => state.auth);
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <UserProfile user={user} />
      </div>
    </>
  );
}
