import { createBrowserRouter } from 'react-router-dom'
import LandingPage from '../pages/LandingPage'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import DashboardPage from '../pages/DashboardPage'
import NotFoundPage from '../pages/NotFoundPage'
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
    path: '/register',
    element: <RegisterPage />,
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
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

export default router
