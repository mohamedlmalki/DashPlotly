// src/components/SingleImportAudience.tsx

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AccountSelector from '@/components/account-selector';
import { SubscriberSearch } from "@/components/SubscriberSearch";
import { api } from '@/lib/api';

const SingleImportAudience: React.FC = () => {
  const [email, setEmail] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [response, setResponse] = useState<string>('');

  const mutation = useMutation({
    mutationFn: (data: { email: string; accountId: string }) => api.addSingleContact(data.accountId, data.email),
    onSuccess: (data) => {
      setResponse(JSON.stringify(data, null, 2));
      setEmail('');
    },
    onError: (error) => {
      setResponse(`Error: ${error.message}`);
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedAccount) {
      setResponse('Error: Please select an account.');
      return;
    }
    mutation.mutate({ email, accountId: selectedAccount });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-8"> {/* <-- UPDATED THIS LINE */}
      {/* MOVED THE SEARCH CARD TO THE TOP */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Search & Delete Contact</CardTitle>
          <CardDescription>Find and remove a single contact from your Loops.so audience.</CardDescription>
        </CardHeader>
        <CardContent>
          <SubscriberSearch selectedAccountId={selectedAccount} />
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Import Single Contact</CardTitle>
          <CardDescription>Add a single email to your Loops.so audience.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <AccountSelector
              selectedAccountId={selectedAccount}
              onAccountChange={setSelectedAccount}
            />
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="test@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={!selectedAccount || mutation.isPending}>
              {mutation.isPending ? 'Adding...' : 'Add Contact'}
            </Button>
          </form>
          <div className="mt-6 space-y-2">
            <Label>Server Response</Label>
            <Textarea
              className="min-h-[150px] font-mono text-xs"
              value={response}
              readOnly
              placeholder="Server response will appear here..."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SingleImportAudience;