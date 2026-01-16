// App principal do sistema FFP
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
import CondominiumsPage from "./pages/CondominiumsPage";
import ChargesPage from "./pages/ChargesPage";
import ClientDashboard from "./pages/ClientDashboard";
import CondominiumDetails from "./pages/CondominiumDetails";
import WorkflowConfig from "./pages/WorkflowConfig";
import ImportCharges from "./pages/ImportCharges";
import RegisterDefaulter from "./pages/RegisterDefaulter";
import BackofficeManagement from "./pages/BackofficeManagement";
import AcceptInvitation from "./pages/AcceptInvitation";
import UserManagement from "./pages/UserManagement";
import NegotiationParameters from "./pages/NegotiationParameters";
import AnalyticsPage from "./pages/AnalyticsPage";
import AutomationPage from "./pages/AutomationPage";
import CoachAgentsPage from "./pages/CoachAgentsPage";
import EmployeeCoachPage from "./pages/EmployeeCoachPage";
import WhatsAppCentralPage from "./pages/WhatsAppCentralPage";
import WorkflowSettings from "./pages/WorkflowSettings";
import ReportsPage from "./pages/ReportsPage";
import AdministratorsPage from "./pages/AdministratorsPage";
import AdministratorSync from "./pages/AdministratorSync";
import AutomationWorkflows from "./pages/AutomationWorkflows";
import SystemAdminPage from "./pages/SystemAdminPage";
import ApproveUsers from "./pages/ApproveUsers";
import AguardandoAprovacao from "./pages/AguardandoAprovacao";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import ProfileCompletion from "./pages/ProfileCompletion";
import SetupAdmin from "./pages/SetupAdmin";
import { CorporateLayout } from "./components/CorporateLayout";
import AtendimentoPage from "./pages/AtendimentoPage";
import CRMPipelinePage from "./pages/CRMPipelinePage";

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
                <CorporateLayout>
                  <CorporateDashboard />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/condominios" element={
              <AuthGuard requiredRole="admin">
                <CorporateLayout>
                  <CondominiumsPage />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/cobrancas" element={
              <AuthGuard requiredRole="admin">
                <CorporateLayout>
                  <ChargesPage />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/condominio/:id" element={
              <AuthGuard requiredRole="admin">
                <CorporateLayout>
                  <CondominiumDetails />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/workflow" element={
              <AuthGuard requiredRole="admin">
                <CorporateLayout>
                  <WorkflowConfig />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/importar" element={
              <AuthGuard requiredRole="admin">
                <CorporateLayout>
                  <ImportCharges />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/administradoras" element={
              <AuthGuard requiredRole="admin">
                <CorporateLayout>
                  <AdministratorsPage />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/sincronizacao" element={
              <AuthGuard requiredRole="admin">
                <CorporateLayout>
                  <AdministratorSync />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/workflows" element={
              <AuthGuard requiredRole="admin">
                <CorporateLayout>
                  <AutomationWorkflows />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/cadastrar-inadimplente" element={
              <AuthGuard requiredRole="admin">
                <CorporateLayout>
                  <RegisterDefaulter />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/backoffice" element={
              <AuthGuard requiredRole="admin">
                <CorporateLayout>
                  <BackofficeManagement />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/usuarios" element={
              <AuthGuard requiredRole="admin">
                <CorporateLayout>
                  <UserManagement />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/parametros" element={
              <AuthGuard requiredRole="admin">
                <CorporateLayout>
                  <NegotiationParameters />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/analytics" element={
              <AuthGuard requiredRole="admin">
                <CorporateLayout>
                  <AnalyticsPage />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/automacao" element={
              <AuthGuard requiredRole="admin">
                <CorporateLayout>
                  <AutomationPage />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/coach" element={
              <AuthGuard requiredRole="admin">
                <CorporateLayout>
                  <CoachAgentsPage />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/coach-painel" element={
              <AuthGuard>
                <EmployeeCoachPage />
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/whatsapp" element={
              <AuthGuard>
                <WhatsAppCentralPage />
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/configuracoes" element={
              <AuthGuard requiredRole="admin">
                <CorporateLayout>
                  <WorkflowSettings />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/relatorios" element={
              <AuthGuard requiredRole="admin">
                <CorporateLayout>
                  <ReportsPage />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/sistema" element={
              <AuthGuard requiredRole="admin">
                <CorporateLayout>
                  <SystemAdminPage />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/aprovar-usuarios" element={
              <AuthGuard requiredRole="admin">
                <CorporateLayout>
                  <ApproveUsers />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/atendimento" element={
              <AuthGuard requiredRole="admin">
                <CorporateLayout>
                  <AtendimentoPage />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/portal/corporativo/crm" element={
              <AuthGuard requiredRole="admin">
                <CorporateLayout>
                  <CRMPipelinePage />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/aceitar-convite" element={<AcceptInvitation />} />
            <Route path="/completar-perfil" element={<ProfileCompletion />} />
            <Route path="/portal/corporativo/completar-perfil" element={
              <AuthGuard>
                <ProfileCompletion />
              </AuthGuard>
            } />
            <Route path="/aguardando-aprovacao" element={<AguardandoAprovacao />} />
            <Route path="/cadastro" element={<Signup />} />
            <Route path="/esqueci-senha" element={<ForgotPassword />} />
            <Route path="/redefinir-senha" element={<ResetPassword />} />
            <Route path="/setup-admin" element={<SetupAdmin />} />
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
