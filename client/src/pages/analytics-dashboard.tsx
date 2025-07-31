import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import AccountSelector from "@/components/account-selector";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { Label } from "@/components/ui/label";

export default function AnalyticsDashboard() {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedLoopId, setSelectedLoopId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: loops, isLoading: isLoadingLoops } = useQuery({
    queryKey: ['/api/loops/analytics/loops', selectedAccountId],
    queryFn: () => selectedAccountId ? api.getAnalyticsLoops(selectedAccountId) : Promise.resolve([]),
    enabled: !!selectedAccountId,
  });

  const { data: loopAnalytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['/api/loops/analytics/loops', selectedAccountId, selectedLoopId],
    queryFn: () => selectedLoopId && selectedAccountId ? api.getLoopAnalytics(selectedLoopId, selectedAccountId) : Promise.resolve(null),
    enabled: !!selectedLoopId && !!selectedAccountId,
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Loops Analytics Dashboard</h2>
        <p className="text-slate-600">Track the performance of your automated email sequences.</p>
      </div>

      <AccountSelector
        selectedAccountId={selectedAccountId}
        onAccountChange={setSelectedAccountId}
      />
      
      <Card className="glass-card mb-6">
        <CardContent className="p-4">
          <Label className="text-sm font-semibold text-slate-700">Select a Loop</Label>
          {isLoadingLoops ? (
             <div className="flex items-center space-x-2">
               <Loader2 className="h-4 w-4 animate-spin" />
               <span className="text-sm text-slate-500">Loading loops...</span>
             </div>
          ) : (
            <Select onValueChange={setSelectedLoopId} value={selectedLoopId || ""}>
              <SelectTrigger className="input-premium mt-2">
                <SelectValue placeholder="Choose a loop" />
              </SelectTrigger>
              <SelectContent>
                {loops?.map((loop: any) => (
                  <SelectItem key={loop.loopId} value={loop.loopId}>
                    {`Loop: ${loop.loopId}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedLoopId && isLoadingAnalytics && (
         <div className="text-center py-8">
            <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
            <p className="text-sm text-slate-500 mt-2">Loading analytics...</p>
         </div>
      )}

      {loopAnalytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-600">Sends</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loopAnalytics.sends}</div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-600">Opens</CardTitle>
                <div className="h-4 w-4 rounded-full bg-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loopAnalytics.opens}</div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-600">Clicks</CardTitle>
                <div className="h-4 w-4 rounded-full bg-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loopAnalytics.clicks}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Opens & Clicks Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  sends: { label: "Sends", color: "hsl(var(--primary))" },
                  opens: { label: "Opens", color: "hsl(var(--success))" },
                  clicks: { label: "Clicks", color: "hsl(215, 83%, 65%)" },
                }}
                className="w-full h-[300px]"
              >
                <BarChart data={loopAnalytics.eventsOverTime}>
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="sends" fill="var(--color-sends)" radius={4} />
                  <Bar dataKey="opens" fill="var(--color-opens)" radius={4} />
                  <Bar dataKey="clicks" fill="var(--color-clicks)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Recent Events</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loopAnalytics.events.map((event: any) => (
                    <TableRow key={event.id}>
                      <TableCell>{event.eventName}</TableCell>
                      <TableCell>{event.contactEmail}</TableCell>
                      <TableCell>{new Date(event.eventTime).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}