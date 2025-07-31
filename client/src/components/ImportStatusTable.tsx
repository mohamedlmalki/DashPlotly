import { useEffect, useRef, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ImportJob } from "@shared/schema";
import FullResponseModal from "./FullResponseModal";

interface ImportStatusTableProps {
  jobInfo: ImportJob | null | undefined;
}

export default function ImportStatusTable({ jobInfo }: ImportStatusTableProps) {
  const tableRef = useRef<HTMLTableSectionElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  useEffect(() => {
    if (tableRef.current) {
      tableRef.current.scrollTop = tableRef.current.scrollHeight;
    }
  }, [jobInfo?.logs]);

  const handleViewResponse = (log: ImportJob['logs'][0]) => {
    setModalTitle(`Full Response for: ${log.email}`);
    setModalContent(log.message);
    setModalOpen(true);
  };

  const getStatusMessage = (log: ImportJob['logs'][0]) => {
    if (log.status === 'success') {
      return "Subscriber added successfully.";
    }
    const message = log.message;
    if (message.includes("already on list")) {
      return "Failed: Email already on list.";
    }
    return "Failed: " + (message || "Unknown error.");
  };

  return (
    <>
      <div className="mt-6">
        <div className="text-sm font-semibold text-slate-700 mb-2">Import Status Log</div>
        <ScrollArea className="border border-slate-200 rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead className="w-[180px]">Email</TableHead>
                <TableHead className="w-[80px]">Status</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-[120px]">Full Response</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody key={jobInfo?.processedEmails} ref={tableRef}>
              {jobInfo?.logs && jobInfo.logs.length > 0 ? (
                jobInfo.logs.map((log, index) => (
                  <TableRow
                    key={`${log.email}-${log.timestamp}`}
                    className={cn(
                      log.status === 'success' ? "bg-green-50/50" : "bg-red-50/50"
                    )}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium text-slate-800">
                      {log.email}
                    </TableCell>
                    <TableCell>
                      {log.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell className={cn(
                      "text-xs",
                      log.status === 'success' ? "text-green-700" : "text-red-700"
                    )}>
                      {getStatusMessage(log)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button onClick={() => handleViewResponse(log)} variant="secondary" size="sm">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500">
                    Awaiting results...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
      <FullResponseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        content={modalContent}
      />
    </>
  );
}