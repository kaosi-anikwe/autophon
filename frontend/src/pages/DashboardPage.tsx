import Aligner from "@/components/aligner/Aligner";
import UserDict from "@/components/aligner/UserDict";
import UserGuides from "@/components/features/UserGuides";
import { useAppSelector } from "@/hooks/useAppDispatch";

export function DashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  return (
    <div className="px-8">
      <Aligner title="Add Files" homepage={false} />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 my-4 py-8">
        <UserDict user={user!} />
        <div className="col-span-4 col-start-9">
          <UserGuides>
            <h3 className="text-lg font-bold text-center mb-2">User Guides</h3>
          </UserGuides>
        </div>
      </div>
    </div>
  );
}
