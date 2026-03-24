import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store'
import Splash from './pages/Splash'
import Onboarding from './pages/Onboarding'
import CreatorRegister from './pages/creator/Register'
import CreatorHome from './pages/creator/Home'
import CreatorOffers from './pages/creator/Offers'
import CreatorProjects from './pages/creator/Projects'
import CreatorProfile from './pages/creator/Profile'
import BusinessRegister from './pages/business/Register'
import BusinessHome from './pages/business/Home'
import BusinessCreateOffer from './pages/business/CreateOffer'
import BusinessProjects from './pages/business/Projects'
import BusinessProfile from './pages/business/Profile'
import AdminDashboard from './pages/admin/Dashboard'
import AdminCreators from './pages/admin/Creators'
import AdminBusinesses from './pages/admin/Businesses'
import AdminOffers from './pages/admin/Offers'
import AdminReferrals from './pages/admin/Referrals'

export default function App() {
  const { init, loading, user } = useStore()

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor('#08080f'); tg.setBackgroundColor('#08080f') }
    init()
  }, [])

  if (loading) return <Splash />

  const role = user?.role

  return (
    <BrowserRouter>
      <Routes>
        {(!user || role === 'pending') && <>
          <Route path="/" element={<Onboarding />} />
          <Route path="/creator/register" element={<CreatorRegister />} />
          <Route path="/business/register" element={<BusinessRegister />} />
          <Route path="*" element={<Navigate to="/" />} />
        </>}

        {role === 'creator' && <>
          <Route path="/" element={<CreatorHome />} />
          <Route path="/offers" element={<CreatorOffers />} />
          <Route path="/projects" element={<CreatorProjects />} />
          <Route path="/profile" element={<CreatorProfile />} />
          <Route path="*" element={<Navigate to="/" />} />
        </>}

        {role === 'business' && <>
          <Route path="/" element={<BusinessHome />} />
          <Route path="/create-offer" element={<BusinessCreateOffer />} />
          <Route path="/projects" element={<BusinessProjects />} />
          <Route path="/profile" element={<BusinessProfile />} />
          <Route path="*" element={<Navigate to="/" />} />
        </>}

        {role === 'admin' && <>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/creators" element={<AdminCreators />} />
          <Route path="/businesses" element={<AdminBusinesses />} />
          <Route path="/offers" element={<AdminOffers />} />
          <Route path="/referrals" element={<AdminReferrals />} />
          <Route path="*" element={<Navigate to="/" />} />
        </>}
      </Routes>
    </BrowserRouter>
  )
}
