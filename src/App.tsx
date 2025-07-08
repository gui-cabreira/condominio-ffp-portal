
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import News from "./pages/News";
import NewsArticle from "./pages/NewsArticle";
import Portal from "./pages/Portal";
import CorporateLogin from "./pages/CorporateLogin";
import ClientLogin from "./pages/ClientLogin";
import CorporateDashboard from "./pages/CorporateDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import CondominiumDetails from "./pages/CondominiumDetails";
import WorkflowConfig from "./pages/WorkflowConfig";
import ImportCharges from "./pages/ImportCharges";
import RegisterDefaulter from "./pages/RegisterDefaulter";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/noticias" element={<News />} />
          <Route path="/noticias/:id" element={<NewsArticle />} />
          <Route path="/portal" element={<Portal />} />
          <Route path="/portal/corporativo" element={<CorporateLogin />} />
          <Route path="/portal/cliente" element={<ClientLogin />} />
          <Route path="/portal/corporativo/dashboard" element={<CorporateDashboard />} />
          <Route path="/portal/corporativo/condominio/:id" element={<CondominiumDetails />} />
          <Route path="/portal/corporativo/workflow" element={<WorkflowConfig />} />
          <Route path="/portal/corporativo/importar" element={<ImportCharges />} />
          <Route path="/portal/corporativo/cadastrar-inadimplente" element={<RegisterDefaulter />} />
          <Route path="/portal/cliente/dashboard" element={<ClientDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
