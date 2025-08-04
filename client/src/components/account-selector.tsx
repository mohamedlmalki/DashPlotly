import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, XCircle, Globe, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { LoopsAccount, ImportJob } from "@shared/schema";

interface AccountSelectorProps {
  selectedAccountId: string | null;
  onAccountChange: (accountId: string) => void;
}

export default function AccountSelector({ selectedAccountId, onAccountChange }: AccountSelectorProps) {
  const { toast } = useToast();
  const [connectionStatus, setConnectionStatus] = useState<'pending' | 'connected' | 'disconnected'>('disconnected');

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['/api/accounts'],
    queryFn: api.getAccounts,
    onSuccess: (data: LoopsAccount[]) => {
      if (!selectedAccountId || !data.find(acc => acc.id === selectedAccountId)) {
        if (data.length > 0) {
          onAccountChange(data[0].id);
        } else {
          onAccountChange(null);
        }
      }
    },
  });

  const { data: jobs = [], isLoading: isLoadingJobs } = useQuery<ImportJob[]>({
    queryKey: ['/api/import-jobs'],
    queryFn: () => api.getImportJobs(),
    refetchInterval: 1000,
  });

  const testConnectionMutation = useMutation({
    mutationFn: (accountId: string) => api.testLoopsConnection(accountId),
    onSuccess: () => {
      setConnectionStatus('connected');
      toast({
        title: "Connection Test Successful",
        description: "Successfully connected to Loops.so.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      setConnectionStatus('disconnected');
      toast({
        title: "Connection Test Failed",
        description: error.message || "An unknown error occurred.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (selectedAccountId) {
      setConnectionStatus('pending');
      testConnectionMutation.mutate(selectedAccountId);
    } else {
      setConnectionStatus('disconnected');
    }
  }, [selectedAccountId]);

  const handleManualTestConnection = () => {
    if (!selectedAccountId) {
      toast({
        title: "Error",
        description: "Please select an account to test.",
        variant: "destructive",
      });
      return;
    }
    setConnectionStatus('pending');
    testConnectionMutation.mutate(selectedAccountId);
  };

  const selectedAccount = accounts.find((acc: LoopsAccount) => acc.id === selectedAccountId);

  const getJobStatus = (accountId: string) => {
    const job = jobs.find(j => j.accountId === accountId && (j.status === 'running' || j.status === 'pending' || j.status === 'paused'));
    if (job) {
        const processed = job.processedEmails;
        const total = job.totalEmails;
        const status = job.status;
        return `${processed}/${total} ${status.charAt(0).toUpperCase() + status.slice(1)}`;
    }
    return null;
  }
  
  if (isLoading || isLoadingJobs) {
    return (
      <Card className="glass-card mb-6">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
            <div className="h-8 bg-slate-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-semibold text-slate-700">Profile Selection</Label>
          {selectedAccountId && (
            <Button
              onClick={handleManualTestConnection}
              disabled={testConnectionMutation.isPending}
              size="sm"
              variant="outline"
              className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium rounded-lg text-xs"
            >
              {testConnectionMutation.isPending ? (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              ) : (
                <Globe className="h-3 w-3 mr-1.5" />
              )}
              Test Connection
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <Select value={selectedAccountId || ""} onValueChange={onAccountChange}>
            <SelectTrigger className="input-premium">
              <SelectValue placeholder="Choose a Loops.so profile for operations" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account: LoopsAccount) => (
                <SelectItem key={account.id} value={account.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{account.name}</span>
                    <span className="text-xs text-slate-500 ml-2">
                        {getJobStatus(account.id) || "No active jobs"}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedAccount && (
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-800">
                    Active Profile: {selectedAccount.name}
                  </div>
                  {selectedAccount.organizationId && (
                    <div className="text-xs text-slate-500">
                      Organization ID: {selectedAccount.organizationId}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {connectionStatus === 'pending' && <Loader2 className="h-3 w-3 animate-spin text-slate-500" />}
                  {connectionStatus === 'connected' && <CheckCircle className="h-3 w-3 text-green-500" />}
                  {connectionStatus === 'disconnected' && <XCircle className="h-3 w-3 text-red-500" />}
                  <span className="text-xs text-slate-600">
                    {connectionStatus === 'pending' ? 'Connecting...' : (connectionStatus === 'connected' ? 'Connected' : 'Disconnected')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}