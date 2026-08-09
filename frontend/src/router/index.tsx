import { createBrowserRouter } from 'react-router-dom'
import LandingPage from '../pages/LandingPage'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import EquipmentListPage from '../pages/equipment/EquipmentListPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/dashboard',
    element: <DashboardPage />,
  },
  {
    path: '/equipments',
    element: <EquipmentListPage />,
  },
  {
    path: '/equipments/new',
    element: <div>Coming soon</div>,
  },
  {
    path: '/equipments/:id',
    element: <div>Coming soon</div>,
  },
  {
    path: '/equipments/:id/edit',
    element: <div>Coming soon</div>,
  },
])

export default router
