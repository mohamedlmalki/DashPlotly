import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Zap } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { ImportJob } from "@shared/schema";

interface JobSelectorProps {
  selectedAccountId: string | null;
  selectedJobId: string | null;
  onJobSelect: (jobId: string) => void;
}

export const JobSelector: React.FC<JobSelectorProps> = ({ selectedAccountId, selectedJobId, onJobSelect }) => {
  const { data: jobs = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/import-jobs', selectedAccountId],
    queryFn: () => selectedAccountId ? api.getImportJobs(selectedAccountId) : Promise.resolve([]),
    enabled: !!selectedAccountId,
    refetchInterval: 5000, // Refetch every 5 seconds to keep job list updated
  });

  useEffect(() => {
    // If no job is currently selected but there are jobs available, select the first one
    if (!selectedJobId && jobs.length > 0) {
      onJobSelect(jobs[0].id);
    }
  }, [jobs, selectedJobId, onJobSelect]);
  
  const getJobLabel = (job: ImportJob) => {
    const total = job.totalEmails;
    const processed = job.processedEmails;
    const status = job.status;
    const progress = total ? Math.round((Number(processed) / Number(total)) * 100) : 0;
    
    return `${progress}% ${status}`;
  };

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-slate-500" />;
  }

  if (jobs.length === 0) {
    return <span className="text-sm text-slate-500">No active import jobs.</span>;
  }

  return (
    <div className="flex items-center space-x-2">
      <Label className="text-sm font-medium text-slate-700">Active Job:</Label>
      <Select value={selectedJobId || ''} onValueChange={onJobSelect}>
        <SelectTrigger className="w-[200px] h-8 text-sm">
          <SelectValue placeholder="Select a job" />
        </SelectTrigger>
        <SelectContent>
          {jobs.map((job) => (
            <SelectItem key={job.id} value={job.id}>
              <div className="flex items-center justify-between w-full">
                <span className="font-medium">Job #{job.id.substring(0, 4)}</span>
                <span className="text-xs text-slate-500">{getJobLabel(job)}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};