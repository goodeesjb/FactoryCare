import { createBrowserRouter } from 'react-router-dom'
import LandingPage from '../pages/LandingPage'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import EquipmentListPage from '../pages/equipment/EquipmentListPage'
import EquipmentFormPage from '../pages/equipment/EquipmentFormPage'
import EquipmentDetailPage from '../pages/equipment/EquipmentDetailPage'

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
    element: <EquipmentFormPage />,
  },
  {
    path: '/equipments/:id',
    element: <EquipmentDetailPage />,
  },
  {
    path: '/equipments/:id/edit',
    element: <EquipmentFormPage />,
  },
])

export default router
