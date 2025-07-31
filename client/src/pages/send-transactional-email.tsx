import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Users, Edit, FlaskConical, Eye, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import FileUpload from "@/components/ui/file-upload";
import LoadingSpinner from "@/components/ui/loading-spinner";
import NotificationToast from "@/components/ui/notification-toast";
import EmailPreviewModal from "@/components/email-preview-modal";
import AccountSelector from "@/components/account-selector";
import JobControl from "@/components/job-control";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function SendTransactionalEmail() {
  const [recipients, setRecipients] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("completed");
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ visible: false, message: "", type: 'success' });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sendEmailMutation = useMutation({
    mutationFn: api.sendEmail,
    onSuccess: (data) => {
      setNotification({
        visible: true,
        message: data.message,
        type: 'success'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email-logs'] });
    },
    onError: (error: any) => {
      setNotification({
        visible: true,
        message: error.message || "Failed to send email",
        type: 'error'
      });
    }
  });

  const testEmailMutation = useMutation({
    mutationFn: api.sendEmail,
    onSuccess: () => {
      setNotification({
        visible: true,
        message: `Test email sent to ${testEmail}!`,
        type: 'success'
      });
    },
    onError: (error: any) => {
      setNotification({
        visible: true,
        message: error.message || "Failed to send test email",
        type: 'error'
      });
    }
  });

  const handleFileUpload = (content: string, filename: string) => {
    setRecipients(content);
    toast({
      title: "File imported",
      description: `File "${filename}" imported successfully!`,
    });
  };

  const handleSendEmail = () => {
    if (!selectedAccountId) {
      setNotification({
        visible: true,
        message: "Please select an account first.",
        type: 'error'
      });
      return;
    }

    const recipientList = recipients
      .trim()
      .split('\n')
      .map(email => email.trim())
      .filter(email => email !== '');

    if (recipientList.length === 0 || !subject.trim() || !content.trim()) {
      setNotification({
        visible: true,
        message: "Please fill in all required fields.",
        type: 'error'
      });
      return;
    }

    sendEmailMutation.mutate({
      recipients: recipientList,
      subject: subject.trim(),
      htmlContent: content.trim(),
      accountId: selectedAccountId
    });
  };

  const handleTestEmail = () => {
    if (!testEmail.trim() || !subject.trim() || !content.trim()) {
      setNotification({
        visible: true,
        message: "Please fill in all required fields for the test email.",
        type: 'error'
      });
      return;
    }

    testEmailMutation.mutate({
      recipients: [testEmail.trim()],
      subject: subject.trim(),
      htmlContent: content.trim()
    });
  };

  const recipientCount = recipients
    .trim()
    .split('\n')
    .filter(email => email.trim() !== '').length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Send Transactional Email</h2>
        <p className="text-slate-600">Send personalized emails to your audience</p>
      </div>

      <AccountSelector
        selectedAccountId={selectedAccountId}
        onAccountChange={setSelectedAccountId}
      />

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recipients Section */}
        <div>
          <Card className="glass-card">
            <CardContent className="p-8 space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <span>Recipients</span>
              </h3>
              
              {/* Main Recipients */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700">Recipient Emails</Label>
                <div className="relative">
                  <Textarea
                    value={recipients}
                    onChange={(e) => setRecipients(e.target.value)}
                    placeholder="Enter recipient email addresses..."
                    className="textarea-premium h-40 text-sm placeholder-slate-400"
                  />
                  <div className="absolute top-3 right-3">
                    <FileUpload
                      onFileSelect={handleFileUpload}
                      disabled={sendEmailMutation.isPending}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Enter one email address per line, or import from a .csv/.txt file.
                </p>
              </div>

              {/* Test Email */}
              <div className="border-t border-slate-200 pt-6">
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <Input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="Enter test email address..."
                      className="input-premium"
                    />
                  </div>
                  <Button
                    onClick={handleTestEmail}
                    disabled={testEmailMutation.isPending}
                    className="px-4 py-2.5 bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium rounded-xl transition-all duration-200"
                  >
                    <FlaskConical className="h-4 w-4 mr-2" />
                    Test
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Send a single test email to verify your content
                </p>
              </div>

              {/* Recipient Counter */}
              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-primary to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-slate-800 mb-1">{recipientCount}</div>
                    <div className="text-sm text-slate-600">Recipients</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email Content Section */}
        <div>
          <Card className="glass-card">
            <CardContent className="p-8 space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                <Edit className="h-5 w-5 text-primary" />
                <span>Email Content</span>
              </h3>

              {/* Subject */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700">Email Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  className="input-premium"
                />
              </div>

              {/* Email Body */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-slate-700">
                    Email Content (HTML supported)
                  </Label>
                  <Button
                    onClick={() => setShowPreview(true)}
                    variant="secondary"
                    size="sm"
                    className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium rounded-lg text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1.5" />
                    Preview
                  </Button>
                </div>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter your email content here..."
                  className="textarea-premium h-48 text-sm placeholder-slate-400 font-mono"
                />
                <p className="text-xs text-slate-500">
                  HTML formatting is supported. Use the preview button to see how your email will look.
                </p>
              </div>

              {/* Send Button */}
              <div className="border-t border-slate-200 pt-6">
                <Button
                  onClick={handleSendEmail}
                  disabled={sendEmailMutation.isPending || recipientCount === 0 || !subject.trim() || !content.trim() || !selectedAccountId}
                  className="w-full btn-primary px-6 py-4 rounded-xl"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </Button>

                {/* Loading State */}
                {sendEmailMutation.isPending && (
                  <div className="mt-4">
                    <LoadingSpinner message="Sending emails..." />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <EmailPreviewModal
        subject={subject}
        content={content}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
      />

      <NotificationToast
        {...notification}
        onClose={() => setNotification({ ...notification, visible: false })}
      />
    </div>
  );
}
