import {
  type Contact, type InsertContact,
  type EmailLog, type InsertEmailLog,
  type LoopsAccount, type InsertLoopsAccount,
  type ImportJob, type InsertImportJob,
  type AnalyticsEvent, type Webhook
} from "@shared/schema";
import { randomUUID } from "crypto";
import * as fs from 'fs/promises';
import * as path from 'path';
import objectHash from 'object-hash';

const ACCOUNTS_FILE_PATH = path.join(process.cwd(), 'server', 'accounts.json');

export interface IStorage {
  createAccount(account: InsertLoopsAccount): Promise<LoopsAccount>;
  getAllAccounts(): Promise<LoopsAccount[]>;
  getAccountById(id: string): Promise<LoopsAccount | undefined>;
  updateAccountStatus(id: string, isActive: string): Promise<void>;
  createContact(contact: InsertContact): Promise<Contact>;
  createContactsBulk(contacts: InsertContact[]): Promise<Contact[]>;
  getContactByEmail(email: string, accountId?: string): Promise<Contact | undefined>;
  getAllContacts(accountId?: string): Promise<Contact[]>;
  deleteContactByEmail(email: string, accountId: string): Promise<void>; // <-- ADDED THIS METHOD
  createEmailLog(emailLog: InsertEmailLog): Promise<EmailLog>;
  getAllEmailLogs(accountId?: string): Promise<EmailLog[]>;
  createImportJob(job: InsertImportJob): Promise<ImportJob>;
  updateImportJobStatus(id: string, status: string, processedEmails?: number, log?: ImportJob['logs'][0]): Promise<void>;
  getImportJob(id: string): Promise<ImportJob | undefined>;
  getAllImportJobs(accountId?: string): Promise<ImportJob[]>;
  // New methods for webhook and analytics storage
  createWebhook(webhook: Webhook): Promise<Webhook>;
  getWebhookByAccountId(accountId: string): Promise<Webhook | undefined>;
  createAnalyticsEvent(event: Partial<AnalyticsEvent>): Promise<AnalyticsEvent>;
  getAnalyticsEventsBySource(sourceId: string): Promise<AnalyticsEvent[]>;
  getUniqueLoops(accountId: string): Promise<{ loopId: string }[]>;
  getLoopAnalytics(loopId: string, accountId: string): Promise<{
    sends: number;
    opens: number;
    clicks: number;
    unsubscribes: number;
    events: AnalyticsEvent[];
    eventsOverTime: any[]; // Using `any` for now
  }>;
}

export class MemStorage implements IStorage {
  private accounts: Map<string, LoopsAccount>;
  private contacts: Map<string, Contact>;
  private emailLogs: Map<string, EmailLog>;
  private importJobs: Map<string, ImportJob>;
  private analyticsEvents: Map<string, AnalyticsEvent>;
  private webhooks: Map<string, Webhook>;

  constructor() {
    this.accounts = new Map();
    this.contacts = new Map();
    this.emailLogs = new Map();
    this.importJobs = new Map();
    this.analyticsEvents = new Map();
    this.webhooks = new Map();

    this._loadAccountsFromFile();
  }

  private async _loadAccountsFromFile() {
    try {
      const dir = path.dirname(ACCOUNTS_FILE_PATH);
      await fs.mkdir(dir, { recursive: true });

      const data = await fs.readFile(ACCOUNTS_FILE_PATH, { encoding: 'utf8' });
      const parsedAccounts: { name: string; apiKey: string; organizationId?: string }[] = JSON.parse(data);
      
      parsedAccounts.forEach(accountData => {
        const id = objectHash({ name: accountData.name, apiKey: accountData.apiKey });
        const account: LoopsAccount = {
          id,
          name: accountData.name,
          apiKey: accountData.apiKey,
          organizationId: accountData.organizationId || null,
          isActive: "true",
          createdAt: new Date()
        };
        this.accounts.set(id, account);
      });
      console.log(`Loaded ${this.accounts.size} accounts from ${ACCOUNTS_FILE_PATH}`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        await fs.writeFile(ACCOUNTS_FILE_PATH, '[]', { encoding: 'utf8' });
        console.log(`Created empty accounts file at ${ACCOUNTS_FILE_PATH}`);
      } else {
        console.error(`Error loading accounts from file: ${error.message}`);
      }
    }
  }

  private async _saveAccountsToFile() {
    try {
      const accountsArray = Array.from(this.accounts.values()).map(acc => ({
        name: acc.name,
        apiKey: acc.apiKey,
        organizationId: acc.organizationId,
      }));
      const data = JSON.stringify(accountsArray, null, 2);
      await fs.writeFile(ACCOUNTS_FILE_PATH, data, { encoding: 'utf8' });
      console.log(`Saved ${this.accounts.size} accounts to ${ACCOUNTS_FILE_PATH}`);
    } catch (error: any) {
      console.error(`Error saving accounts to file: ${error.message}`);
    }
  }

  async createAccount(insertAccount: InsertLoopsAccount): Promise<LoopsAccount> {
    const id = objectHash({ name: insertAccount.name, apiKey: insertAccount.apiKey });
    const account: LoopsAccount = {
      id,
      name: insertAccount.name,
      apiKey: insertAccount.apiKey,
      organizationId: insertAccount.organizationId || null,
      isActive: insertAccount.isActive || "true",
      createdAt: new Date()
    };
    this.accounts.set(id, account);
    await this._saveAccountsToFile();
    return account;
  }

  async getAllAccounts(): Promise<LoopsAccount[]> {
    return Array.from(this.accounts.values());
  }

  async getAccountById(id: string): Promise<LoopsAccount | undefined> {
    return this.accounts.get(id);
  }

  async updateAccountStatus(id: string, isActive: string): Promise<void> {
    const account = this.accounts.get(id);
    if (account) {
      account.isActive = isActive;
      this.accounts.set(id, account);
    }
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = randomUUID();
    const contact: Contact = {
      id,
      email: insertContact.email,
      accountId: insertContact.accountId || null,
      createdAt: new Date()
    };
    this.contacts.set(id, contact);
    return contact;
  }

  async createContactsBulk(insertContacts: InsertContact[]): Promise<Contact[]> {
    const contacts: Contact[] = [];
    for (const insertContact of insertContacts) {
      const existingContact = await this.getContactByEmail(insertContact.email, insertContact.accountId);
      if (!existingContact) {
        const contact = await this.createContact(insertContact);
        contacts.push(contact);
      }
    }
    return contacts;
  }

  async getContactByEmail(email: string, accountId?: string): Promise<Contact | undefined> {
    return Array.from(this.contacts.values()).find(
      (contact) => contact.email === email && (!accountId || contact.accountId === accountId)
    );
  }

  async getAllContacts(accountId?: string): Promise<Contact[]> {
    const allContacts = Array.from(this.contacts.values());
    return accountId ? allContacts.filter(contact => contact.accountId === accountId) : allContacts;
  }

  async deleteContactByEmail(email: string, accountId: string): Promise<void> {
    let contactIdToDelete: string | undefined;
    for (const [id, contact] of this.contacts.entries()) {
      if (contact.email === email && contact.accountId === accountId) {
        contactIdToDelete = id;
        break;
      }
    }
    if (contactIdToDelete) {
      this.contacts.delete(contactIdToDelete);
    }
  }

  async createEmailLog(insertEmailLog: InsertEmailLog): Promise<EmailLog> {
    const id = randomUUID();
    const emailLog: EmailLog = {
      id,
      recipients: [...insertEmailLog.recipients] as string[],
      subject: insertEmailLog.subject,
      htmlContent: insertEmailLog.htmlContent,
      fromName: insertEmailLog.fromName || null,
      replyTo: insertEmailLog.replyTo || null,
      accountId: insertEmailLog.accountId || null,
      jobId: insertEmailLog.jobId || null,
      status: insertEmailLog.status || "completed",
      sentAt: new Date()
    };
    this.emailLogs.set(id, emailLog);
    return emailLog;
  }

  async getAllEmailLogs(accountId?: string): Promise<EmailLog[]> {
    const allLogs = Array.from(this.emailLogs.values());
    return accountId ? allLogs.filter(log => log.accountId === accountId) : allLogs;
  }

  async createImportJob(insertJob: InsertImportJob): Promise<ImportJob> {
    const id = randomUUID();
    const job: ImportJob = {
      id,
      accountId: insertJob.accountId,
      totalEmails: insertJob.totalEmails,
      processedEmails: insertJob.processedEmails || "0",
      status: insertJob.status || "pending",
      createdAt: new Date(),
      completedAt: null,
      logs: [] // Initialize new logs array
    };
    this.importJobs.set(id, job);
    return job;
  }

  async updateImportJobStatus(id: string, status: string, processedEmails?: number, log?: ImportJob['logs'][0]): Promise<void> {
    const job = this.importJobs.get(id);
    if (job) {
      job.status = status;
      if (processedEmails !== undefined) {
        job.processedEmails = processedEmails.toString();
      }
      if (log) {
          job.logs.push(log);
      }
      if (status === "completed" || status === "stopped") {
        job.completedAt = new Date();
      }
      this.importJobs.set(id, job);
    }
  }

  async getImportJob(id: string): Promise<ImportJob | undefined> {
    return this.importJobs.get(id);
  }

  async getAllImportJobs(accountId?: string): Promise<ImportJob[]> {
    const allJobs = Array.from(this.importJobs.values());
    return accountId ? allJobs.filter(job => job.accountId === accountId) : allJobs;
  }

  async createWebhook(webhook: Webhook): Promise<Webhook> {
    this.webhooks.set(webhook.accountId, webhook);
    return webhook;
  }

  async getWebhookByAccountId(accountId: string): Promise<Webhook | undefined> {
    return this.webhooks.get(accountId);
  }

  async createAnalyticsEvent(event: Partial<AnalyticsEvent>): Promise<AnalyticsEvent> {
    const id = randomUUID();
    const newEvent: AnalyticsEvent = {
      id,
      accountId: event.accountId || null,
      eventName: event.eventName || "unknown",
      sourceType: event.sourceType || "unknown",
      sourceId: event.sourceId || null,
      contactEmail: event.contactEmail || "unknown",
      eventTime: new Date(),
      payload: event.payload || {}
    };
    this.analyticsEvents.set(id, newEvent);
    return newEvent;
  }

  async getAnalyticsEventsBySource(sourceId: string): Promise<AnalyticsEvent[]> {
      const allEvents = Array.from(this.analyticsEvents.values());
      return allEvents.filter(event => event.sourceId === sourceId);
  }

  async getUniqueLoops(accountId: string): Promise<{ loopId: string }[]> {
    const loops = new Map();
    Array.from(this.analyticsEvents.values())
      .filter(event => event.accountId === accountId && event.sourceType === "loop")
      .forEach(event => {
        if (event.sourceId) {
          loops.set(event.sourceId, { loopId: event.sourceId });
        }
      });
    return Array.from(loops.values());
  }

  async getLoopAnalytics(loopId: string, accountId: string): Promise<{
    sends: number;
    opens: number;
    clicks: number;
    unsubscribes: number;
    events: AnalyticsEvent[];
    eventsOverTime: any[]; // Using `any` for now
  }> {
    const allEvents = Array.from(this.analyticsEvents.values())
      .filter(event => event.accountId === accountId && event.sourceId === loopId);

    const sends = allEvents.filter(event => event.eventName === "loop.email.sent").length;
    const opens = allEvents.filter(event => event.eventName === "email.opened").length;
    const clicks = allEvents.filter(event => event.eventName === "email.clicked").length;
    const unsubscribes = allEvents.filter(event => event.eventName === "email.unsubscribed").length;
    
    // Simple grouping by day for chart data
    const eventsOverTime = allEvents.reduce((acc: any, event) => {
        const date = new Date(event.eventTime).toISOString().split('T')[0];
        if (!acc[date]) {
            acc[date] = { date, sends: 0, opens: 0, clicks: 0 };
        }
        if (event.eventName === "loop.email.sent") acc[date].sends++;
        if (event.eventName === "email.opened") acc[date].opens++;
        if (event.eventName === "email.clicked") acc[date].clicks++;
        return acc;
    }, {});

    const eventsOverTimeArray = Object.values(eventsOverTime).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      sends,
      opens,
      clicks,
      unsubscribes,
      events: allEvents,
      eventsOverTime: eventsOverTimeArray,
    };
  }
}

export const storage = new MemStorage();