import AlignerTable from "@/components/aligner/AlignerTable";
import UserDict from "@/components/aligner/UserDict";
import UserGuides from "@/components/features/UserGuides";

export function DashboardPage() {
  return (
    <div className="px-8">
      <AlignerTable title="Add Files" homepage />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 my-4 py-8">
        <div className="col-span-4">
          <UserDict />
        </div>
        <div className="col-span-4 col-start-9">
          <UserGuides>
            <h3 className="text-lg font-bold text-center mb-0">User Guides</h3>
          </UserGuides>
        </div>
      </div>
    </div>
  );
}
