import { CirclePlus, Trash2 } from "lucide-react";
import { useState } from "react";
import TranscriptionSelect from "./TranscriptionSelect";
import TransChoices from "./TransChoices";

type AlignerTableProps = {
  title: string;
  homepage?: boolean;
};

type ModalState = {
  type: "closed" | "selectingFile" | "selectingTransChoice";
  uploading: boolean;
};

export default function AlignerTable({ title, homepage }: AlignerTableProps) {
  const [modalState, setModalState] = useState<ModalState>({
    type: "closed",
    uploading: false,
  });

  const openModal = modalState.type !== "closed";

  let modalContent = <></>;
  const size = modalState.type === "selectingFile" ? "sm" : "xl";
  const onModalClose = !modalState.uploading
    ? () => setModalState({ type: "closed", uploading: false })
    : () => {};

  if (modalState.type === "selectingFile") {
    modalContent = (
      <>
        <div className="card border border-base-200 p-4 w-60 mx-auto my-2">
          <p className="uppercase text-center">
            Transcription Mode: Computational Ling
          </p>
          <button
            type="button"
            className="btn btn-accent font-thin"
            onClick={() =>
              setModalState({ type: "selectingTransChoice", uploading: false })
            }
          >
            change transcription mode
          </button>
        </div>
        <input type="file" multiple className="file-input w-full font-thin" />
        <p className="text-xs leading-[1.5] text-base-300 text-left py-1">
          A single upload may be no larger than 750 MB. If your zip folder
          contains hundreds or thousands of small files, the progress bar will
          park itself at 100% for as long as 30 minutes. Do not refresh; rather,
          wait it out, and it will eventually load. We are currently working on
          a patch to fix this. If you need help, select change transcription
          mode for video guides.
        </p>
        <button
          type="button"
          className="btn btn-primary font-thin text-left mt-2"
          onClick={() => setModalState({ type: "closed", uploading: false })}
        >
          Cancel upload
        </button>
      </>
    );
  }
  if (modalState.type === "selectingTransChoice") {
    const handleContinue = () =>
      setModalState({ type: "selectingFile", uploading: false });
    modalContent = <TransChoices onContinue={handleContinue} />;
  }

  let titleClasses = "text-2xl font-bold flex items-center";
  if (homepage) titleClasses += " py-8";

  return (
    <>
      <TranscriptionSelect
        size={size}
        isOpen={openModal}
        onClose={onModalClose}
        closeOnBackdropClick={!modalState.uploading}
      >
        {modalContent}
      </TranscriptionSelect>

      <div className="card shadow-lg border-0 bg-base-100 pb-5">
        <div className="p-6">
          <div className="w-full flex justify-center">
            <button
              className="text-accent bg-transparent border-0 p-0 cursor-pointer"
              type="button"
            >
              <h4
                className={titleClasses}
                onClick={() =>
                  setModalState({ type: "selectingFile", uploading: false })
                }
              >
                <span className="text-2xl mr-2">
                  <CirclePlus className="w-6 h-6 text-base-100 fill-accent" />
                </span>
                {title}*
              </h4>
            </button>
          </div>

          <div className="max-h-[40rem] overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
            <table className="table table-zebra">
              <thead className="table-pin-rows text-center">
                <tr>
                  <th className="p-2">
                    <Trash2 className="w-4 h-4 text-accent cursor-pointer" />
                  </th>
                  <th className="text-center cursor-pointer p-2">
                    <label htmlFor="check-all">
                      <input
                        type="checkbox"
                        id="check-all"
                        className="checkbox checkbox-xs"
                      />
                    </label>
                  </th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Language</th>
                  <th className="p-2">Engine</th>
                  <th className="p-2">Tiers</th>
                  <th className="p-2">Size MB</th>
                  <th className="p-2">Words</th>
                  <th className="p-2 w-16">Missing Words</th>
                  <th className="p-2">Last status</th>
                  <th className="p-2">Download</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-0" colSpan={999}>
                    <p className="bg-base-200 text-center w-full border-t border-neutral">
                      No data available in table
                    </p>
                  </td>
                </tr>
                {/* Empty table body - data would be populated dynamically */}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
