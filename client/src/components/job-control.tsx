import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface JobControlProps {
  jobId: string | null;
  status: string;
  onStatusChange?: (newStatus: string) => void;
  variant?: "import" | "email";
}

export default function JobControl({ jobId, status, onStatusChange, variant = "import" }: JobControlProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const jobControlMutation = useMutation({
    mutationFn: api.controlJob,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/import-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/email-logs'] });
      onStatusChange?.(response.status);
      toast({
        title: "Job Updated",
        description: response.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to control job",
        variant: "destructive",
      });
    }
  });

  const handleControl = (action: "pause" | "resume" | "stop") => {
    if (!jobId) return;

    // Prevent redundant actions
    if (status === "paused" && action === "pause") {
      return;
    }
    if (status === "running" && action === "resume") {
      return;
    }
    
    jobControlMutation.mutate({
      jobId,
      action
    });
  };

  if (!jobId || status === "completed" || status === "stopped") {
    return null;
  }

  const isLoading = jobControlMutation.isPending;

  return (
    <div className="flex items-center space-x-2">
      {status === "running" ? (
        <Button
          onClick={() => handleControl("pause")}
          disabled={isLoading}
          size="sm"
          className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-xs font-medium"
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
          ) : (
            <Pause className="h-3 w-3 mr-1.5" />
          )}
          Pause
        </Button>
      ) : status === "paused" ? (
        <Button
          onClick={() => handleControl("resume")}
          disabled={isLoading}
          size="sm"
          className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-medium"
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
          ) : (
            <Play className="h-3 w-3 mr-1.5" />
          )}
          Resume
        </Button>
      ) : null}

      <Button
        onClick={() => handleControl("stop")}
        disabled={isLoading}
        size="sm"
        className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-medium"
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
        ) : (
          <Square className="h-3 w-3 mr-1.5" />
        )}
        Stop
      </Button>
    </div>
  );
}