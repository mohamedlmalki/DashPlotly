import { apiRequest } from "@/lib/queryClient";
import type { 
  BulkImportRequest, 
  SendEmailRequest, 
  CreateAccountRequest,
  JobControlRequest,
  LoopsAccount,
  ImportJob
} from "@shared/schema";

export interface BulkImportResponse {
  success: boolean;
  message: string;
  jobId?: string;
}

export interface SendEmailResponse {
  success: boolean;
  message: string;
  recipients: number;
  jobId?: string;
}

export interface JobControlResponse {
  success: boolean;
  message: string;
  status: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  data?: any;
}

export const api = {
  // Account management
  getAccounts: async (): Promise<LoopsAccount[]> => {
    const response = await apiRequest('GET', '/api/accounts');
    return response.json();
  },

  createAccount: async (data: CreateAccountRequest): Promise<LoopsAccount> => {
    const response = await apiRequest('POST', '/api/accounts', data);
    return response.json();
  },

  // Contact operations
  importContacts: async (data: BulkImportRequest): Promise<BulkImportResponse> => {
    const response = await apiRequest('POST', '/api/loops/import-contacts', data);
    return response.json();
  },

  getContacts: async (accountId?: string) => {
    const url = accountId ? `/api/contacts?accountId=${accountId}` : '/api/contacts';
    const response = await apiRequest('GET', url);
    return response.json();
  },

  // Email operations
  sendEmail: async (data: SendEmailRequest): Promise<SendEmailResponse> => {
    const response = await apiRequest('POST', '/api/loops/send-email', data);
    return response.json();
  },

  getEmailLogs: async (accountId?: string) => {
    const url = accountId ? `/api/email-logs?accountId=${accountId}` : '/api/email-logs';
    const response = await apiRequest('GET', url);
    return response.json();
  },

  // Job control
  controlJob: async (data: JobControlRequest): Promise<JobControlResponse> => {
    const response = await apiRequest('POST', '/api/jobs/control', data);
    return response.json();
  },

  getImportJobs: async (accountId?: string) => {
    const url = accountId ? `/api/import-jobs?accountId=${accountId}` : '/api/import-jobs';
    const response = await apiRequest('GET', url);
    return response.json();
  },

  getImportJob: async (jobId: string): Promise<ImportJob> => {
    const response = await apiRequest('GET', `/api/import-jobs/${jobId}`);
    return response.json();
  },

  // Test Loops.so API connection
  testLoopsConnection: async (accountId: string): Promise<TestConnectionResponse> => {
    const response = await apiRequest('GET', `/api/accounts/${accountId}/test-connection`);
    const data = await response.json();
    
    if (data.success) {
        return { success: true, message: data.message };
    } else {
        throw new Error(data.message || 'Unknown error during connection test.');
    }
  }
};