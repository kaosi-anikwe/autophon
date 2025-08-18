type ProgressBarProps = {
  title: string;
  progress: number;
  type?: string;
};

export default function ProgressBar({
  title,
  progress,
  type,
}: ProgressBarProps) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{title}</span>
        <span>{progress}%</span>
      </div>
      <progress
        className={`progress progress-${
          type ? type : "success"
        } w-full transition-all duration-300 ease-out`}
        value={progress}
        max="100"
      ></progress>
    </div>
  );
}
