import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Modal } from "../ui/Modal";

type TransChoiceProps = {
  title: string;
  isActive: boolean;
  video?: string;
  instructions: string;
  onSelect: () => void;
  children: React.ReactNode;
};

export default function TransChoice({
  title,
  isActive,
  video,
  children,
  instructions,
  onSelect,
}: TransChoiceProps) {
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const cardClasses = `card ${
    isActive
      ? "bg-neutral shadow-secondary shadow-lg"
      : "bg-neutral/60 hover:bg-neutral/70"
  } text-neutral-content h-full cursor-pointer hover:shadow-secondary hover:shadow-lg duration-300 transition-all ease-in-out`;

  const handleVideoClick = () => {
    setShowVideo(true);
  };

  const handleCloseVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setShowVideo(false);
  };

  useEffect(() => {
    if (showVideo && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  }, [showVideo]);

  return (
    <>
      <Modal
        isOpen={showVideo}
        onClose={handleCloseVideo}
        title={`${title} video guide`}
        size="md"
        closeOnBackdropClick
      >
        <div className="flex justify-center">
          <video
            ref={videoRef}
            className="max-w-2xl h-auto"
            controls
            playsInline
            preload="metadata"
          >
            <source src={`/videos/${video}.mov`} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </Modal>
      <div className={cardClasses} onClick={onSelect}>
        <div className="card-body p-4 flex flex-col h-full">
          <div className="flex-none">
            <h2 className="font-bold text-xl text-center mx-auto">{title}</h2>
            <p
              id={video}
              onClick={handleVideoClick}
              className="text-sm text-neutral-content/80 mb-4 text-center"
            >
              (click to see video guide)
            </p>

            {/* Dividing line */}
            <div className="divider my-0"></div>
          </div>

          {/* File Structure - fixed spacing */}
          <div className="flex-none">
            <div className="font-cascadia bg-neutral-focus p-3 pt-0 rounded text-sm text-amber-50 space-y-1">
              {children}
            </div>
          </div>

          {/* Description - pushed to bottom */}
          <div className="flex-1 flex items-end">
            <p className="text-xs italic text-neutral-content/90">
              {instructions}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
