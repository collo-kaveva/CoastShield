import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { Loading } from "@/components/common/States";
import { RedirectIfAuthed, RequireAuth, RequireBusiness } from "./guards";
import { PublicLayout } from "@/layouts/PublicLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { StorefrontLayout } from "@/layouts/StorefrontLayout";
import { FocusLayout } from "@/layouts/FocusLayout";
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const OnboardingPage = lazy(() => import("@/pages/OnboardingPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const BusinessPage = lazy(() => import("@/pages/BusinessPage"));
const CatalogPage = lazy(() => import("@/pages/CatalogPage"));
const StorefrontPage = lazy(() => import("@/pages/StorefrontPage"));
const DiscoverPage = lazy(() => import("@/pages/DiscoverPage"));
const OrdersPage = lazy(() => import("@/pages/OrdersPage"));
const OrderDetailPage = lazy(() => import("@/pages/OrderDetailPage"));
const SecurityPage = lazy(() => import("@/pages/SecurityPage"));
const ChecklistPage = lazy(() => import("@/pages/ChecklistPage"));
const IncidentsPage = lazy(() => import("@/pages/IncidentsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const AboutPage = lazy(() => import("@/pages/InfoPages").then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import("@/pages/InfoPages").then((m) => ({ default: m.ContactPage })));
const PrivacyPage = lazy(() => import("@/pages/InfoPages").then((m) => ({ default: m.PrivacyPage })));

export function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>
      <Route element={<StorefrontLayout />}><Route path="/store/:slug" element={<StorefrontPage />} /></Route>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<RedirectIfAuthed><LoginPage /></RedirectIfAuthed>} />
        <Route path="/register" element={<RedirectIfAuthed><RegisterPage /></RedirectIfAuthed>} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<FocusLayout />}><Route path="/onboarding" element={<OnboardingPage />} /></Route>
        <Route element={<OwnerLayout />}>
          <Route element={<RequireBusiness />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/business" element={<BusinessPage />} />
            <Route path="/business/catalog" element={<CatalogPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
          </Route>
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/security/checklist" element={<ChecklistPage />} />
          <Route path="/security/incidents" element={<IncidentsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<PublicLayout />}><Route path="*" element={<NotFoundPage />} /></Route>
    </Routes>
    </Suspense>
  );
}
