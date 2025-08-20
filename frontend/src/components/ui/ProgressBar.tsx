import { motion } from "framer-motion";

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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between text-sm mb-1">
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {title}
        </motion.span>
        <span>{progress}%</span>
      </div>

      {/* Custom progress bar with Framer Motion */}
      <div className="relative w-full h-2 bg-base-200 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            type === "secondary" ? "bg-secondary" : "bg-success"
          }`}
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{
            duration: 0.8,
            ease: "easeOut",
            type: "spring",
            stiffness: 100,
            damping: 20,
          }}
          style={{
            boxShadow:
              progress > 0
                ? `0 0 8px ${
                    type === "secondary"
                      ? "rgb(51 102 153 / 0.4)"
                      : "rgb(90 138 58 / 0.4)"
                  }`
                : "none",
          }}
        />

        {/* Animated shine effect */}
        {progress > 0 && progress < 100 && (
          <motion.div
            className="absolute top-0 left-0 h-full w-6 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{
              x: ["-24px", "100%"],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}

        {/* Completion celebration effect */}
        {progress === 100 && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        )}
      </div>
    </motion.div>
  );
}
