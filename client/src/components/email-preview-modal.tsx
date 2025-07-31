import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye } from "lucide-react";

interface EmailPreviewModalProps {
  subject: string;
  content: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function EmailPreviewModal({ subject, content, isOpen, onClose }: EmailPreviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5 text-primary" />
            <span>Email Preview</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <strong>Subject:</strong>
                  <span>{subject || 'No Subject'}</span>
                </div>
              </div>
              <div className="p-6">
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: content || '<p>No content</p>' 
                  }}
                  className="prose prose-sm max-w-none"
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
