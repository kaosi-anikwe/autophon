import History from "@/components/history/History";

export function HistoryPage() {
  return (
    <>
      <div className="py-4">
        <h1 className="text-[3.5rem] leading-[1.1] text-center mb-4 pb-4">
          History
        </h1>
        <p className="italic text-base-300 text-center">
          This page is for you to track your past usage. This is also data that
          we keep in order to build a case for funders to keep autophon free and
          supported.
        </p>
      </div>
      <History />
    </>
  );
}
