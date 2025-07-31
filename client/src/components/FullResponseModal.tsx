import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText } from "lucide-react";
import React from "react";

interface FullResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export default function FullResponseModal({ isOpen, onClose, title, content }: FullResponseModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            <span>{title}</span>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 rounded-md border border-slate-200">
          <pre className="p-4 text-xs bg-slate-50 text-slate-700 whitespace-pre-wrap">
            {content}
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}