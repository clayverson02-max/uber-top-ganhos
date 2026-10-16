import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout, AdminOnly, ClientsAccess, MemberAccess } from "@/components/crm/AppLayout";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import NewClient from "./pages/NewClient";
import ClientDetail from "./pages/ClientDetail";
import Remarketing from "./pages/Remarketing";
import Finance from "./pages/Finance";
import UsersPage from "./pages/Users";
import Trash from "./pages/Trash";
import NotFound from "./pages/NotFound";
import PublicRegistration from "./pages/PublicRegistration";
import PublicLeads from "./pages/PublicLeads";
import Consultants from "./pages/Consultants";
import WhatsApp from "./pages/WhatsApp";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } } });

const Home = () => {
  const { isAdmin, isInternal } = useAuth();
  if (isAdmin) return <Dashboard />;
  return <Navigate to={isInternal ? "/clientes" : "/novo"} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner richColors position="top-center" />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="/cadastro" element={<PublicRegistration />} />
            <Route path="/signup" element={<Navigate to="/login" replace />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />

            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/clientes" element={<ClientsAccess><Clients /></ClientsAccess>} />
              <Route path="/captacoes" element={<ClientsAccess><PublicLeads /></ClientsAccess>} />
              <Route path="/whatsapp" element={<ClientsAccess><WhatsApp /></ClientsAccess>} />
              <Route path="/consultores" element={<AdminOnly><Consultants /></AdminOnly>} />
              <Route path="/clientes/:id" element={<MemberAccess><ClientDetail /></MemberAccess>} />
              <Route path="/novo" element={<NewClient />} />
              <Route path="/remarketing" element={<AdminOnly><Remarketing /></AdminOnly>} />
              <Route path="/financeiro" element={<AdminOnly><Finance /></AdminOnly>} />
              <Route path="/lixeira" element={<AdminOnly><Trash /></AdminOnly>} />
              <Route path="/usuarios" element={<AdminOnly><UsersPage /></AdminOnly>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
