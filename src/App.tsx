import { Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import { Join, Loading, SignIn } from './auth/Gate'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Places } from './pages/Places'
import { PlaceDetail } from './pages/PlaceDetail'
import { Polls } from './pages/Polls'
import { PollDetail } from './pages/PollDetail'
import { OrderSession } from './pages/OrderSession'
import { OrderSummary } from './pages/OrderSummary'
import { Members } from './pages/Members'

export default function App() {
  const { status } = useAuth()

  if (status === 'loading') return <Loading />
  if (status === 'signedOut') return <SignIn />
  if (status === 'needsJoin') return <Join />

  return (
    <Routes>
      <Route path="/order/:orderId/summary" element={<OrderSummary />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/places" element={<Places />} />
        <Route path="/places/:placeId" element={<PlaceDetail />} />
        <Route path="/polls" element={<Polls />} />
        <Route path="/polls/:pollId" element={<PollDetail />} />
        <Route path="/order/:orderId" element={<OrderSession />} />
        <Route path="/members" element={<Members />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}
