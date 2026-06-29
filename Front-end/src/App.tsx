import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { StudyPlannerProvider } from "@/context/StudyPlannerContext";
import Dashboard from "./pages/Dashboard";
import ProgressPage from "./pages/ProgressPage";
import AdaptivePlanPage from "./pages/AdaptivePlanPage";
import InsightsPage from "./pages/InsightsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <StudyPlannerProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/adaptive" element={<AdaptivePlanPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </TooltipProvider>
    </StudyPlannerProvider>
  </QueryClientProvider>
);

export default App;
