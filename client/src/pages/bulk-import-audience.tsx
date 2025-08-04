import { useState, useEffect } from "react";
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
import { SubscriberSearch } from "@/components/SubscriberSearch";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useJobManager } from "@/hooks/use-job-manager";
import { cn } from "@/lib/utils";
import type { ImportJob } from "@shared/schema";

export default function BulkImportAudience() {
  const [emailsByAccount, setEmailsByAccount] = useState<Map<string, string>>(new Map());
  const [delay, setDelay] = useState(1); // Delay in seconds
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getJobByAccountId, setJob, clearJob } = useJobManager();

  const jobData = getJobByAccountId(selectedAccountId || '');
  const currentJobId = jobData?.id || null;
  const jobStatus = jobData?.status || "completed";

  const currentEmails = selectedAccountId ? emailsByAccount.get(selectedAccountId) || '' : '';
  const recipientCount = currentEmails.trim().split('\n').filter(email => email.trim() !== '').length;

  const importMutation = useMutation({
    mutationFn: (data: { emails: string[]; accountId: string; delay: number }) => api.importContacts(data),
    onSuccess: (data) => {
      toast({
        title: "Import Started",
        description: data.message,
      });
      setJob({
        id: data.jobId,
        accountId: selectedAccountId,
        totalEmails: recipientCount.toString(),
        processedEmails: "0",
        status: "pending",
        createdAt: new Date(),
        completedAt: null,
        logs: []
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start import job",
        variant: "destructive",
      });
    }
  });

  const { data: fetchedJobInfo } = useQuery({
    queryKey: ['/api/import-jobs', currentJobId],
    queryFn: () => currentJobId ? api.getImportJob(currentJobId) : Promise.resolve(null),
    enabled: !!currentJobId,
    refetchInterval: (query) => {
      const job = query.state.data;
      if (job?.status === "running" || job?.status === "pending") {
        return 1000;
      }
      return false;
    },
  });

  useEffect(() => {
    if (fetchedJobInfo) {
      setJob(fetchedJobInfo);
    }
  }, [fetchedJobInfo, setJob]);

  useEffect(() => {
    if (jobData?.status === "completed" || jobData?.status === "stopped") {
      const timer = setTimeout(() => {
        clearJob(jobData.id);
        queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [jobData, clearJob, queryClient]);

  const isJobRunning = jobStatus !== "completed" && jobStatus !== "stopped";

  const handleFileUpload = (content: string, filename: string) => {
    setEmailsByAccount(prev => {
        const newMap = new Map(prev);
        newMap.set(selectedAccountId!, content);
        return newMap;
    });
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
    
    const emailList = currentEmails
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

    if (isJobRunning) {
      toast({
        title: "Error",
        description: "An import job is already running for this account.",
        variant: "destructive",
      });
      return;
    }

    importMutation.mutate({ 
      emails: emailList,
      accountId: selectedAccountId,
      delay: delay * 1000
    });
  };

  const handleClearEmails = () => {
    if (selectedAccountId) {
      setEmailsByAccount(prev => {
        const newMap = new Map(prev);
        newMap.set(selectedAccountId, '');
        return newMap;
      });
    }
  };
  
  const handleEmailsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (selectedAccountId) {
      setEmailsByAccount(prev => {
        const newMap = new Map(prev);
        newMap.set(selectedAccountId, e.target.value);
        return newMap;
      });
    }
  };
  
  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId);
  };

  const progress = jobData?.totalEmails ? (Number(jobData.processedEmails) / Number(jobData.totalEmails)) * 100 : 0;

  const getCountdown = () => {
    if (jobData?.status === 'running') {
      const lastLog = jobData.logs[jobData.logs.length - 1];
      const lastUpdate = lastLog ? new Date(lastLog.timestamp).getTime() : new Date(jobData.createdAt).getTime();
      const timeElapsed = (Date.now() - lastUpdate) / 1000;
      const timeLeft = Math.max(0, delay - timeElapsed);
      return Math.round(timeLeft);
    }
    return delay;
  };

  const showStatusSection = isJobRunning || (jobData && (jobData.status === 'completed' || jobData.status === 'stopped'));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Bulk Import Audience</h2>
        <p className="text-slate-600">Import multiple email addresses to your audience list</p>
      </div>

      <AccountSelector
        selectedAccountId={selectedAccountId}
        onAccountChange={handleAccountChange}
      />
      
      <Card className="glass-card mb-8">
        <CardContent className="p-8">
          <SubscriberSearch selectedAccountId={selectedAccountId} />
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-8">
          <div className="space-y-6">
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-slate-700">Recipient Emails</Label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-slate-600">
                      {recipientCount} Recipient
                      {recipientCount !== 1 ? 's' : ''}
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
                    value={currentEmails}
                    onChange={handleEmailsChange}
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
                  disabled={isJobRunning || currentEmails.trim().length === 0 || !selectedAccountId}
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

            {showStatusSection && (
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                    <Loader2 className={cn("h-5 w-5 text-primary", isJobRunning && "animate-spin")} />
                    <span>Import in Progress</span>
                  </h3>
                  <JobControl
                    jobId={jobData?.id}
                    status={jobData?.status || "completed"}
                    variant="import"
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <Progress value={progress} className="h-2 flex-1" />
                  <span className="text-sm font-medium text-slate-600">
                    {isJobRunning ? `Next in ${getCountdown()}s` : `${Math.round(progress)}%`}
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