import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  bulkImportSchema,
  sendEmailSchema,
  createAccountSchema,
  jobControlSchema,
  loopsEventSchema,
  BulkImportRequest,
  singleContactSchema
} from "@shared/schema";
import { z } from "zod";
import fetch from 'node-fetch';
import crypto from 'crypto';

const LOOPS_API_BASE_URL = "https://app.loops.so/api/v1";

const activeJobs = new Map();

async function callLoopsApi(
  endpoint: string,
  apiKey: string,
  data: object = {},
  method: "POST" | "GET" = "POST"
): Promise<any> {
  const url = `${LOOPS_API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: method === "POST" ? JSON.stringify(data) : undefined,
    });

    const responseBody = await response.json().catch(() => ({ message: response.statusText || "Unknown error from Loops.so" }));

    if (!response.ok) {
      const errorMessage = responseBody.message || JSON.stringify(responseBody);
      throw new Error(`Loops.so API Error ${response.status} (${url}): ${errorMessage}`);
    }

    return responseBody;
  } catch (error) {
    console.error(`Error calling Loops.so API (${endpoint}):`, error);
    throw error;
  }
}

async function processJob(jobId: string, emails: string[], loopsApiKey: string, jobDelay: number) {
  let job = await storage.getImportJob(jobId);
  if (!job) return;

  await storage.updateImportJobStatus(jobId, "running");
  let processedCount = Number(job.processedEmails);

  const jobContext = activeJobs.get(jobId);
  if (!jobContext) return;

  for (let i = processedCount; i < emails.length; i++) {
    if (jobContext.status === "paused" || jobContext.status === "stopped") {
      await storage.updateImportJobStatus(jobId, jobContext.status, i);
      return;
    }
    
    const email = emails[i];
    let logEntry = {
      email,
      status: 'success' as 'success' | 'failed',
      message: '',
      timestamp: new Date()
    };
    
    try {
      await callLoopsApi("/contacts/create", loopsApiKey, { email: email });
      await storage.createContact({ email, accountId: job.accountId });
      logEntry.message = `Subscriber ${email} has been successfully added.`;
      processedCount++;
    } catch (loopsError: any) {
      console.warn(`Failed to import contact "${email}" for job ${jobId}: ${loopsError.message}`);
      logEntry.status = 'failed';
      logEntry.message = loopsError.message || `Failed to add subscriber ${email}.`;
      processedCount++;
    }

    await storage.updateImportJobStatus(jobId, "running", processedCount, logEntry);
    await new Promise(resolve => setTimeout(resolve, jobDelay));
  }
  
  await storage.updateImportJobStatus(jobId, "completed", emails.length);
  activeJobs.delete(jobId);
}

export async function registerRoutes(app: Express): Promise<Server> {

  app.get("/api/accounts", async (req, res) => {
    try {
      const accounts = await storage.getAllAccounts();
      res.json(accounts);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch accounts",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/accounts", async (req, res) => {
    try {
      const accountData = createAccountSchema.parse(req.body);
      const account = await storage.createAccount(accountData);
      res.json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Invalid request data",
          errors: error.errors
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to create account",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  app.get("/api/accounts/:id/test-connection", async (req, res) => {
    try {
      const { id: accountId } = req.params;
      const account = await storage.getAccountById(accountId);

      if (!account) {
        return res.status(404).json({ success: false, message: "Account not found." });
      }

      const loopsResponse = await callLoopsApi(
        "/api-key",
        account.apiKey,
        {},
        "GET"
      );

      if (loopsResponse.success) {
        res.json({ success: true, message: "Connection successful!", data: loopsResponse });
      } else {
        res.status(500).json({ success: false, message: loopsResponse.message || "Loops.so API key validation failed with an unexpected response." });
      }

    } catch (error) {
      console.error(`Error testing connection for account ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: "Failed to connect to Loops.so: " + (error instanceof Error ? error.message : "Unknown error"),
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/import-jobs/:jobId", async (req, res) => {
    try {
      const job = await storage.getImportJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ success: false, message: "Job not found." });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch job status." });
    }
  });

  app.post("/api/loops/import-contacts", async (req, res) => {
    try {
      const { emails, accountId, delay } = bulkImportSchema.parse(req.body) as BulkImportRequest & { delay: number };

      const account = await storage.getAccountById(accountId);
      if (!account) {
        return res.status(400).json({ success: false, message: "Invalid Loops.so account selected." });
      }
      const loopsApiKey = account.apiKey;

      const importJob = await storage.createImportJob({
        accountId,
        totalEmails: emails.length.toString(),
        processedEmails: "0",
        status: "pending"
      });

      res.status(202).json({
        success: true,
        message: "Import job started successfully.",
        jobId: importJob.id,
      });

      // Store the job details to be able to restart it
      const jobContext = { emails, loopsApiKey, delay, status: "running" };
      activeJobs.set(importJob.id, jobContext);

      processJob(importJob.id, emails, loopsApiKey, delay);

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Invalid request data",
          errors: error.errors
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to start import job: " + (error instanceof Error ? error.message : "Unknown error"),
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  app.post("/api/jobs/control", async (req, res) => {
    try {
      const { jobId, action } = jobControlSchema.parse(req.body);
      const job = await storage.getImportJob(jobId);

      if (!job) {
          return res.status(404).json({ success: false, message: "Job not found." });
      }

      let newStatus = job.status;
      let message = `Job status updated to ${newStatus}.`;
      const activeJob = activeJobs.get(jobId);

      switch (action) {
        case "pause":
          if (job.status === "running") {
            newStatus = "paused";
            message = "Job paused successfully.";
            if (activeJob) activeJob.status = "paused";
          }
          break;
        case "resume":
          if (job.status === "paused") {
            newStatus = "running";
            message = "Job resumed successfully.";
            if (activeJob) {
                activeJob.status = "running";
                // Rerun the function that processes the job
                processJob(jobId, activeJob.emails, activeJob.loopsApiKey, activeJob.delay);
            }
          }
          break;
        case "stop":
          newStatus = "stopped";
          message = "Job stopped successfully.";
          if (activeJob) {
              activeJob.status = "stopped";
              activeJobs.delete(jobId);
          }
          break;
      }

      await storage.updateImportJobStatus(jobId, newStatus);
      res.json({ success: true, message, status: newStatus });

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ success: false, message: `Failed to ${req.body.action} job`, error: error instanceof Error ? error.message : "Unknown error" });
      }
    }
  });

  app.get("/api/import-jobs", async (req, res) => {
    try {
      const accountId = req.query.accountId as string;
      const jobs = await storage.getAllImportJobs(accountId);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch import jobs", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/loops/send-email", async (req, res) => {
    try {
      const emailData = sendEmailSchema.parse(req.body);
      const account = await storage.getAccountById(emailData.accountId);
      if (!account || account.isActive !== "true") {
        return res.status(400).json({ success: false, message: "Invalid or inactive Loops.so account selected." });
      }
      const loopsApiKey = account.apiKey;
      let sentCount = 0;
      let failedCount = 0;
      const errors: { recipient: string; error: string }[] = [];
      let finalStatus = "completed";

      for (const recipient of emailData.recipients) {
        try {
          await callLoopsApi("/transactional/send", loopsApiKey, {
            to: recipient,
            subject: emailData.subject,
            body: emailData.htmlContent,
            from: emailData.fromName,
            replyTo: emailData.replyTo,
          });
          sentCount++;
          // Log the sent event to our local database
          await storage.createAnalyticsEvent({
            accountId: emailData.accountId,
            eventName: "transactional.email.sent",
            sourceType: "transactional",
            sourceId: null, // As there is no transactionalId in this flow
            contactEmail: recipient,
            payload: { subject: emailData.subject, htmlContent: emailData.htmlContent }
          });
        } catch (loopsError: any) {
          console.warn(`Failed to send email to "${recipient}" via Loops.so: ${loopsError.message}`);
          errors.push({ recipient, error: loopsError.message });
          failedCount++;
        }
      }

      if (failedCount > 0 && sentCount === 0) {
          finalStatus = "failed";
      } else if (failedCount > 0) {
          finalStatus = "failed_partial";
      }

      await storage.createEmailLog({
        recipients: emailData.recipients,
        subject: emailData.subject,
        htmlContent: emailData.htmlContent,
        fromName: emailData.fromName,
        replyTo: emailData.replyTo,
        accountId: emailData.accountId,
        status: finalStatus
      });

      if (failedCount === 0) {
        res.json({
          success: true,
          message: `Email sent successfully to ${sentCount} recipient${sentCount !== 1 ? 's' : ''}.`,
          recipients: sentCount,
        });
      } else if (sentCount > 0) {
        res.status(200).json({
          success: true,
          message: `Email sent to ${sentCount} recipients, but ${failedCount} failed.`,
          recipients: sentCount,
          failed: failedCount,
          errors: errors
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to send email to any recipients.",
          failed: failedCount,
          errors: errors
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Invalid request data",
          errors: error.errors
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to send email: " + (error instanceof Error ? error.message : "Unknown error"),
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  app.get("/api/contacts", async (req, res) => {
    try {
      const accountId = req.query.accountId as string;
      const contacts = await storage.getAllContacts(accountId);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch contacts",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/email-logs", async (req, res) => {
    try {
      const accountId = req.query.accountId as string;
      const emailLogs = await storage.getAllEmailLogs(accountId);
      res.json(emailLogs);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch email logs",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // NEW ENDPOINT TO FIND A CONTACT
  app.get("/api/loops/contacts/find", async (req, res) => {
    const { accountId, email } = req.query;

    if (!accountId || typeof accountId !== 'string' || !email || typeof email !== 'string') {
      return res.status(400).json({ message: "accountId and email are required." });
    }

    const account = await storage.getAccountById(accountId);
    if (!account) {
      return res.status(404).json({ message: "Account not found." });
    }

    try {
      const loopsResponse = await callLoopsApi(
        `/contacts/find?email=${encodeURIComponent(email)}`,
        account.apiKey,
        {},
        "GET"
      );
      res.json(loopsResponse);
    } catch (error) {
      res.status(500).json({ message: "Failed to find contact.", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  
  // NEW ENDPOINT TO DELETE A CONTACT
  app.post("/api/loops/contacts/delete", async (req, res) => {
    const { accountId, email } = req.body;

    if (!accountId || !email) {
      return res.status(400).json({ message: "accountId and email are required." });
    }

    const account = await storage.getAccountById(accountId);
    if (!account) {
      return res.status(404).json({ message: "Account not found." });
    }

    try {
      const loopsResponse = await callLoopsApi(
        "/contacts/delete",
        account.apiKey,
        { email },
        "POST"
      );
      // Delete the contact from the local database as well
      await storage.deleteContactByEmail(email, accountId);
      res.json(loopsResponse);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete contact.", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/loops/analytics/loops", async (req, res) => {
    try {
      const accountId = req.query.accountId as string;
      const loops = await storage.getUniqueLoops(accountId);
      res.json(loops);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch loops",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/loops/analytics/loops/:loopId", async (req, res) => {
    try {
      const { loopId } = req.params;
      const accountId = req.query.accountId as string;
      const analytics = await storage.getLoopAnalytics(loopId, accountId);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch loop analytics",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/webhooks/loops", async (req, res) => {
    try {
      // 1. Get headers for verification
      const eventId = req.get('webhook-id');
      const timestamp = req.get('webhook-timestamp');
      const webhookSignature = req.get('webhook-signature');
      const accountId = req.get('loops-account-id');

      // 2. Load the signing secret from storage
      if (!accountId) {
        return res.status(400).json({ success: false, message: "Missing Loops account ID." });
      }
      const webhook = await storage.getWebhookByAccountId(accountId);
      const secret = webhook?.signingSecret;
      
      if (!eventId || !timestamp || !webhookSignature || !secret) {
        return res.status(400).json({ success: false, message: "Missing required webhook header or secret." });
      }

      // 3. Reconstruct and verify the signature
      const rawBody = JSON.stringify(req.body); // Use the raw body as a string
      const signedContent = `${eventId}.${timestamp}.${rawBody}`;
      
      const secretBytes = Buffer.from(secret.split('_')[1], 'base64');
      const signature = crypto
        .createHmac('sha256', secretBytes)
        .update(signedContent)
        .digest('base64');

      const signatureFound = webhookSignature
        .split(' ')
        .some((sig) => sig.includes(`,${signature}`));

      if (!signatureFound) {
        return res.status(401).json({ success: false, message: "Invalid signature." });
      }

      // 4. Handle the event
      const eventData = loopsEventSchema.parse(req.body);
      await storage.createAnalyticsEvent({
        accountId,
        eventName: eventData.eventName,
        sourceType: eventData.sourceType || "unknown",
        sourceId: eventData.campaignId || eventData.loopId || eventData.transactionalId,
        contactEmail: eventData.contactIdentity.email,
        eventTime: new Date(eventData.eventTime * 1000), // Convert to milliseconds
        payload: req.body
      });
      
      res.status(200).json({ success: true, received: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: "Invalid event data.", errors: error.errors });
      } else {
        console.error("Webhook processing error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
      }
    }
  });

  // NEW ROUTE FOR SINGLE CONTACT IMPORT
  app.post("/api/loops/import-contact", async (req, res) => {
    try {
      const { email, accountId } = singleContactSchema.parse(req.body);

      const account = await storage.getAccountById(accountId);
      if (!account || account.isActive !== "true") {
        return res.status(400).json({ success: false, message: "Invalid or inactive Loops.so account selected." });
      }
      const loopsApiKey = account.apiKey;

      const loopsResponse = await callLoopsApi(
        "/contacts/create",
        loopsApiKey,
        { email: email }
      );
      
      // Also store the new contact in our local database
      await storage.createContact({ email, accountId: accountId });
      
      res.status(200).json({
        success: true,
        message: `Contact ${email} successfully added.`,
        data: loopsResponse
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Invalid request data",
          errors: error.errors
        });
      } else {
        console.error('Error adding single contact:', error);
        res.status(500).json({
          success: false,
          message: "Failed to add contact to Loops.so.",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}