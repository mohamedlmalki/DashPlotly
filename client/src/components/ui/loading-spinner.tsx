import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  message?: string;
}

export default function LoadingSpinner({ className, message }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center py-8", className)}>
      <div className="flex items-center space-x-3">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
        {message && <span className="text-slate-600 font-medium">{message}</span>}
      </div>
    </div>
  );
}
