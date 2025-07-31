import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Loader2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import FileUpload from "@/components/ui/file-upload";
import AccountSelector from "@/components/account-selector";
import JobControl from "@/components/job-control";
import ImportStatusTable from "@/components/ImportStatusTable";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ImportJob } from "@shared/schema";

export default function BulkImportAudience() {
  const [emails, setEmails] = useState("");
  const [delay, setDelay] = useState(1); // Delay in seconds
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("completed");
  const [jobData, setJobData] = useState<ImportJob | null>(null);
  const [countdown, setCountdown] = useState(delay);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: (data: { emails: string[]; accountId: string; delay: number }) => api.importContacts(data),
    onSuccess: (data) => {
      toast({
        title: "Import Started",
        description: data.message,
      });
      setCurrentJobId(data.jobId || null);
      setJobStatus("running");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start import job",
        variant: "destructive",
      });
      setCurrentJobId(null);
      setJobStatus("completed");
    }
  });

  const { data: fetchedJobInfo, refetch } = useQuery({
    queryKey: ['/api/import-jobs', currentJobId],
    queryFn: () => currentJobId ? api.getImportJob(currentJobId) : Promise.resolve(null),
    enabled: !!currentJobId,
  });

  useEffect(() => {
    if (fetchedJobInfo) {
      setJobData(fetchedJobInfo);
      setJobStatus(fetchedJobInfo.status);

      if (fetchedJobInfo.status === "completed" || fetchedJobInfo.status === "stopped") {
        setCurrentJobId(null);
        queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      }
    }
  }, [fetchedJobInfo, queryClient]);

  const isJobRunning = currentJobId || importMutation.isPending;

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    if (jobStatus === "running" || jobStatus === "pending") {
      intervalId = setInterval(() => {
        refetch();
      }, 1000);
    }
    return () => {
        if (intervalId) {
            clearInterval(intervalId);
        }
    };
  }, [jobStatus, refetch]);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (isJobRunning && jobData?.processedEmails && jobData.processedEmails !== jobData.totalEmails) {
      setCountdown(delay);
      timer = setInterval(() => {
        setCountdown((prevCountdown) => (prevCountdown > 0 ? prevCountdown - 1 : delay));
      }, 1000);
    }
    return () => {
        if (timer) {
            clearInterval(timer);
        }
    };
  }, [jobData?.processedEmails, isJobRunning, delay, jobData?.totalEmails]);

  const showStatusSection = currentJobId || jobData;
  const recipientCount = emails.trim().split('\n').filter(email => email.trim() !== '').length;

  const handleFileUpload = (content: string, filename: string) => {
    setEmails(content);
    toast({
      title: "File imported",
      description: `File "${filename}" imported successfully!`,
    });
  };

  const handleImport = () => {
    if (!selectedAccountId) {
      toast({
        title: "Error",
        description: "Please select an account first.",
        variant: "destructive",
      });
      return;
    }

    const emailList = emails
      .trim()
      .split('\n')
      .map(email => email.trim())
      .filter(email => email !== '');

    if (emailList.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one email address.",
        variant: "destructive",
      });
      return;
    }

    importMutation.mutate({ 
      emails: emailList,
      accountId: selectedAccountId,
      delay: delay * 1000 // Convert seconds to milliseconds
    });
  };

  const handleClearEmails = () => {
    setEmails("");
  };

  const progress = jobData?.totalEmails ? (Number(jobData.processedEmails) / Number(jobData.totalEmails)) * 100 : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Bulk Import Audience</h2>
        <p className="text-slate-600">Import multiple email addresses to your audience list</p>
      </div>

      <AccountSelector
        selectedAccountId={selectedAccountId}
        onAccountChange={setSelectedAccountId}
      />

      <Card className="glass-card">
        <CardContent className="p-8">
          <div className="space-y-6">
            {/* Input Form Section */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-slate-700">Recipient Emails</Label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-slate-600">
                      {recipientCount} Recipient{recipientCount !== 1 ? 's' : ''}
                    </span>
                    {recipientCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearEmails}
                        className="text-red-500 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Clear Emails</span>
                      </Button>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <Textarea
                    value={emails}
                    onChange={(e) => setEmails(e.target.value)}
                    placeholder="Enter email addresses, one per line..."
                    className="textarea-premium h-40 text-sm placeholder-slate-400"
                    disabled={isJobRunning}
                  />
                  {!isJobRunning && (
                    <div className="absolute top-3 right-3">
                      <FileUpload
                        onFileSelect={handleFileUpload}
                        disabled={importMutation.isPending}
                      />
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Enter one email address per line, or import from a .csv/.txt file.
                </p>
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700">Delay between imports (seconds)</Label>
                <Input
                  type="number"
                  value={delay}
                  onChange={(e) => setDelay(Number(e.target.value))}
                  placeholder="e.g., 1"
                  className="input-premium"
                  disabled={isJobRunning}
                />
                <p className="text-xs text-slate-500">
                  Set a delay to avoid rate-limiting issues with the Loops.so API.
                </p>
              </div>

              <div className="flex items-center justify-end pt-4">
                <Button
                  onClick={handleImport}
                  disabled={isJobRunning || recipientCount === 0 || !selectedAccountId}
                  className="btn-primary px-6 py-2.5 rounded-xl"
                >
                  {isJobRunning ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4 mr-2" />
                  )}
                  Import Audience
                </Button>
              </div>
            </div>

            {/* Status Log Section */}
            {showStatusSection && (
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                    <Loader2 className={cn("h-5 w-5 text-primary", isJobRunning && "animate-spin")} />
                    <span>Import {isJobRunning ? "in Progress" : "Complete"}</span>
                  </h3>
                  <JobControl
                    jobId={currentJobId}
                    status={jobStatus}
                    onStatusChange={setJobStatus}
                    variant="import"
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <Progress value={progress} className="h-2 flex-1" />
                  <span className="text-sm font-medium text-slate-600">
                    {isJobRunning ? `Next in ${countdown}s` : `${Math.round(progress)}%`}
                  </span>
                </div>
                <div className="text-sm text-slate-600">
                  Processed: {jobData?.processedEmails} / {jobData?.totalEmails}
                </div>

                <ImportStatusTable jobInfo={jobData} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}