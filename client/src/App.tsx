import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import Splash from './pages/Splash';
import IOSInstallBanner from './components/IOSInstallBanner';

const Onboarding          = lazy(() => import('./pages/Onboarding'));
const CreatorRegister     = lazy(() => import('./pages/creator/Register'));
const CreatorHome         = lazy(() => import('./pages/creator/Home'));
const CreatorOffers       = lazy(() => import('./pages/creator/Offers'));
const CreatorProjects     = lazy(() => import('./pages/creator/Projects'));
const CreatorProfile      = lazy(() => import('./pages/creator/Profile'));
const CreatorEditProfile  = lazy(() => import('./pages/creator/EditProfile'));
const Bonuses             = lazy(() => import('./pages/creator/Bonuses'));
const BusinessRegister    = lazy(() => import('./pages/business/Register'));
const BusinessHome        = lazy(() => import('./pages/business/Home'));
const BusinessCreateOffer = lazy(() => import('./pages/business/CreateOffer'));
const BusinessProjects    = lazy(() => import('./pages/business/Projects'));
const BusinessProfile     = lazy(() => import('./pages/business/Profile'));
const AdminDashboard      = lazy(() => import('./pages/admin/Dashboard'));
const AdminCreators       = lazy(() => import('./pages/admin/Creators'));
const AdminBusinesses     = lazy(() => import('./pages/admin/Businesses'));
const AdminOffers         = lazy(() => import('./pages/admin/Offers'));
const AdminReferrals      = lazy(() => import('./pages/admin/Referrals'));
const AdminBalance        = lazy(() => import('./pages/admin/Balance'));
const AdminProjects       = lazy(() => import('./pages/admin/AdminProjects'));
const AdminCreatorDetail  = lazy(() => import('./pages/admin/AdminCreatorDetail'));
const AdminBusinessDetail = lazy(() => import('./pages/admin/AdminBusinessDetail'));
const AdminProjectDetail  = lazy(() => import('./pages/admin/AdminProjectDetail'));
const AdminSupportInbox   = lazy(() => import('./pages/admin/AdminSupportInbox'));
const Balance             = lazy(() => import('./pages/shared/Balance'));
const AISupport           = lazy(() => import('./pages/shared/AISupport'));
const Support             = lazy(() => import('./pages/shared/Support'));
const Notifications       = lazy(() => import('./pages/shared/Notifications'));
const Community           = lazy(() => import('./pages/shared/Community'));
const News                = lazy(() => import('./pages/shared/News'));
const UserSupportChat     = lazy(() => import('./pages/shared/UserSupportChat'));

// Fallback для Suspense
function PageFallback() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#08080f' }}>
      <div style={{ width: 34, height: 34, border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
    </div>
  );
}

// Для пользователей вне Telegram
function NoTelegram() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#08080f', padding: '32px 24px', textAlign: 'center' }}>
      <div style={{ width: 90, height: 90, borderRadius: 26, background: 'linear-gradient(135deg,#7C3AED,#1A6BFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, marginBottom: 28, boxShadow: '0 0 60px rgba(124,58,237,.4)' }}>✦</div>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 12, letterSpacing: -0.8 }}>CONCEPT ADS</h1>
      <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, maxWidth: 300, marginBottom: 32 }}>
        Пожалуйста, откройте приложение через Telegram бота
      </p>
      <a href="https://t.me/Concept_ads_bot" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg,#7C3AED,#1A6BFF)', color: '#fff', fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 14, textDecoration: 'none', boxShadow: '0 4px 24px rgba(124,58,237,.35)' }}>
        <span style={{ fontSize: 20 }}>✈️</span>@Concept_ads_bot
      </a>
      <IOSInstallBanner />
    </div>
  );
}

// Основные маршруты
function AppRoutes() {
  const { loading, user } = useStore();
  const tg = (window as any).Telegram?.WebApp;
  const inTelegram = tg && (tg.initData || tg.initDataUnsafe?.user);
  if (!inTelegram) return <NoTelegram />;
  if (loading) return <Splash />;

  const role = user?.role;

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {(!user || role === 'pending') && (
          <>
            <Route path="/" element={<Onboarding />} />
            <Route path="/creator/register" element={<CreatorRegister />} />
            <Route path="/business/register" element={<BusinessRegister />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
        {role === 'creator' && (
          <>
            <Route path="/" element={<CreatorHome />} />
            <Route path="/offers" element={<CreatorOffers />} />
            <Route path="/bonuses" element={<Bonuses />} />
            <Route path="/projects" element={<CreatorProjects />} />
            <Route path="/profile" element={<CreatorProfile />} />
            <Route path="/edit-profile" element={<CreatorEditProfile />} />
            <Route path="/balance" element={<Balance />} />
            <Route path="/ai-support" element={<AISupport />} />
            <Route path="/support" element={<Support />} />
            <Route path="/support/:type" element={<UserSupportChat />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/community" element={<Community />} />
            <Route path="/news" element={<News />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
        {role === 'business' && (
          <>
            <Route path="/" element={<BusinessHome />} />
            <Route path="/create-offer" element={<BusinessCreateOffer />} />
            <Route path="/projects" element={<BusinessProjects />} />
            <Route path="/profile" element={<BusinessProfile />} />
            <Route path="/balance" element={<Balance />} />
            <Route path="/ai-support" element={<AISupport />} />
            <Route path="/support" element={<Support />} />
            <Route path="/support/:type" element={<UserSupportChat />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/community" element={<Community />} />
            <Route path="/news" element={<News />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
        {role === 'admin' && (
          <>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/creators" element={<AdminCreators />} />
            <Route path="/creators/:id" element={<AdminCreatorDetail />} />
            <Route path="/businesses" element={<AdminBusinesses />} />
            <Route path="/businesses/:id" element={<AdminBusinessDetail />} />
            <Route path="/projects" element={<AdminProjects />} />
            <Route path="/projects/:id" element={<AdminProjectDetail />} />
            <Route path="/offers" element={<AdminOffers />} />
            <Route path="/referrals" element={<AdminReferrals />} />
            <Route path="/balance" element={<AdminBalance />} />
            <Route path="/admin-support" element={<AdminSupportInbox />} />
            <Route path="/ai-support" element={<AISupport />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/community" element={<Community />} />
            <Route path="/news" element={<News />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </Suspense>
  );
}

export default function App() {
  const { init } = useStore();

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#08080f');
      tg.setBackgroundColor('#08080f');
    }
    init();
  }, []);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
