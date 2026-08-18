import { createBrowserRouter } from 'react-router-dom'
import LandingPage from '../pages/LandingPage'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import DashboardPage from '../pages/DashboardPage'
import NotFoundPage from '../pages/NotFoundPage'
import EquipmentListPage from '../pages/equipment/EquipmentListPage'
import EquipmentFormPage from '../pages/equipment/EquipmentFormPage'
import EquipmentDetailPage from '../pages/equipment/EquipmentDetailPage'
import InspectionChecklistPage from '../pages/inspection/InspectionChecklistPage'
import InspectionScheduleListPage from '../pages/inspection/InspectionScheduleListPage'
import InspectionScheduleFormPage from '../pages/inspection/InspectionScheduleFormPage'
import InspectionDetailPage from '../pages/inspection/InspectionDetailPage'
import FaultListPage from '../pages/fault/FaultListPage'
import FaultCreatePage from '../pages/fault/FaultCreatePage'
import FaultDetailPage from '../pages/fault/FaultDetailPage'
import MaintenanceListPage from '../pages/maintenance/MaintenanceListPage'
import MaintenanceCreatePage from '../pages/maintenance/MaintenanceCreatePage'
import MaintenanceDetailPage from '../pages/maintenance/MaintenanceDetailPage'

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
    path: '/inspection-checklists',
    element: <InspectionChecklistPage />,
  },
  {
    path: '/inspection-schedules',
    element: <InspectionScheduleListPage />,
  },
  {
    path: '/inspection-schedules/new',
    element: <InspectionScheduleFormPage />,
  },
  {
    path: '/inspections/:id',
    element: <InspectionDetailPage />,
  },
  {
    path: '/faults',
    element: <FaultListPage />,
  },
  {
    path: '/faults/new',
    element: <FaultCreatePage />,
  },
  {
    path: '/faults/:id',
    element: <FaultDetailPage />,
  },
  {
    path: '/maintenance',
    element: <MaintenanceListPage />,
  },
  {
    path: '/maintenance/new',
    element: <MaintenanceCreatePage />,
  },
  {
    path: '/maintenance/:id',
    element: <MaintenanceDetailPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

export default router
