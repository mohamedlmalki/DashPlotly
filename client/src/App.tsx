import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster"; // <-- CORRECTED IMPORT
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import BulkImportAudience from "@/pages/bulk-import-audience";
import SendTransactionalEmail from "@/pages/send-transactional-email";
import AnalyticsDashboard from "@/pages/analytics-dashboard"; 
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import SingleImportAudience from './components/SingleImportAudience';


function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <Switch>
          <Route path="/" component={BulkImportAudience} />
          <Route path="/bulk-import-audience" component={BulkImportAudience} />
          <Route path="/single-import" component={SingleImportAudience} /> {/* <-- ADDED THIS LINE */}
          <Route path="/send-transactional-email" component={SendTransactionalEmail} />
          <Route path="/analytics" component={AnalyticsDashboard} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster /> {/* <-- CORRECTED COMPONENT */}
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;