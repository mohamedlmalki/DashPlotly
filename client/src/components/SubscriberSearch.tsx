// src/components/SubscriberSearch.tsx

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Search, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast'; // <-- ADDED THIS IMPORT
import type { ContactInfo } from '@shared/schema';

interface SubscriberSearchProps {
  selectedAccountId: string | null;
}

export const SubscriberSearch: React.FC<SubscriberSearchProps> = ({ selectedAccountId }) => {
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [isSearched, setIsSearched] = useState(false);
  const { toast } = useToast(); // <-- ADDED THIS HOOK

  const findContactMutation = useMutation({
    mutationFn: (data: { accountId: string; email: string }) => api.findContactByEmail(data.accountId, data.email),
    onSuccess: (data: ContactInfo[]) => {
      setContact(data[0] || null);
    },
    onError: (error) => {
      console.error('Error finding contact:', error);
      setContact(null);
    },
    onSettled: () => {
      setIsSearched(true);
    }
  });

  const deleteContactMutation = useMutation({
    mutationFn: (data: { accountId: string; email: string }) => api.deleteContactByEmail(data.accountId, data.email),
    onSuccess: () => {
      setContact(null);
      setEmail('');
      setIsSearched(false);
      toast({ // <-- REPLACED alert() WITH toast()
        title: "Contact Deleted",
        description: "The contact was successfully deleted.",
      });
    },
    onError: (error) => {
      console.error('Error deleting contact:', error);
      toast({ // <-- REPLACED alert() WITH toast()
        title: "Deletion Failed",
        description: "There was an error deleting the contact.",
        variant: "destructive",
      });
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAccountId && email) {
      findContactMutation.mutate({ accountId: selectedAccountId, email });
    }
  };

  const handleDelete = () => {
    if (selectedAccountId && contact) {
      deleteContactMutation.mutate({ accountId: selectedAccountId, email: contact.email });
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex space-x-2">
        <Input
          type="email"
          placeholder="Search for a contact by email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={!selectedAccountId || findContactMutation.isPending}
        />
        <Button type="submit" disabled={!selectedAccountId || findContactMutation.isPending}>
          {findContactMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </form>

      {isSearched && !findContactMutation.isPending && (
        <div className="mt-4">
          {contact ? (
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <span className="font-medium text-green-700">{contact.email} found.</span>
              <Button onClick={handleDelete} variant="destructive" size="sm" disabled={deleteContactMutation.isPending}>
                {deleteContactMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <span className="font-medium text-red-700">No contact found with that email.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};