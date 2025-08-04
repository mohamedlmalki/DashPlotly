// src/hooks/use-job-manager.ts

import { useState, useCallback } from 'react';
import type { ImportJob } from '@shared/schema';

// This is a simple in-memory store. In a real-world app, you might use
// a more persistent solution like LocalStorage or a state management library.
const activeJobs = new Map<string, ImportJob>();

export const useJobManager = () => {
  const [_, setUpdate] = useState({});

  const getJobByAccountId = useCallback((accountId: string) => {
    let job: ImportJob | null = null;
    for (const job of activeJobs.values()) {
      if (job.accountId === accountId) {
        return job;
      }
    }
    return null;
  }, []);

  const setJob = useCallback((job: ImportJob) => {
    activeJobs.set(job.id, job);
    setUpdate({}); // Force a re-render
  }, []);

  const clearJob = useCallback((jobId: string) => {
    activeJobs.delete(jobId);
    setUpdate({}); // Force a re-render
  }, []);

  return { getJobByAccountId, setJob, clearJob };
};