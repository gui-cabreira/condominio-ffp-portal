
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/AuthGuard";
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
import BackofficeManagement from "./pages/BackofficeManagement";
import AcceptInvitation from "./pages/AcceptInvitation";
import UserManagement from "./pages/UserManagement";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
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
            <Route path="/portal/corporativo/dashboard" element={
              <AuthGuard requiredRole="admin">
                <CorporateDashboard />
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/condominio/:id" element={
              <AuthGuard requiredRole="admin">
                <CondominiumDetails />
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/workflow" element={
              <AuthGuard requiredRole="admin">
                <WorkflowConfig />
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/importar" element={
              <AuthGuard requiredRole="admin">
                <ImportCharges />
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/cadastrar-inadimplente" element={
              <AuthGuard requiredRole="admin">
                <RegisterDefaulter />
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/backoffice" element={
              <AuthGuard requiredRole="admin">
                <BackofficeManagement />
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/usuarios" element={
              <AuthGuard requiredRole="admin">
                <UserManagement />
              </AuthGuard>
            } />
            <Route path="/aceitar-convite" element={<AcceptInvitation />} />
            <Route path="/cadastro" element={<Signup />} />
            <Route path="/portal/cliente/dashboard" element={
              <AuthGuard>
                <ClientDashboard />
              </AuthGuard>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
