"use client";

interface LoadingStateProps {
  variant?: "default" | "large";
}

export function LoadingState({ variant = "default" }: LoadingStateProps) {
  if (variant === "large") {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-2 h-8 bg-blue-500 rounded-full animate-pulse"
              style={{ animationDelay: `${i * 150}ms`, animationDuration: "1s" }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-1 items-center py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}
