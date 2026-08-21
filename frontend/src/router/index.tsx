import { createBrowserRouter } from 'react-router-dom'
import Layout from '../components/Layout'
import LandingPage from '../pages/LandingPage'
import LoginPage from '../pages/LoginPage'
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
import PartListPage from '../pages/parts/PartListPage'
import PartFormPage from '../pages/parts/PartFormPage'
import PartDetailPage from '../pages/parts/PartDetailPage'
import UserListPage from '../pages/user/UserListPage'

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/dashboard', element: <Layout><DashboardPage /></Layout> },
  { path: '/equipments', element: <Layout><EquipmentListPage /></Layout> },
  { path: '/equipments/new', element: <Layout><EquipmentFormPage /></Layout> },
  { path: '/equipments/:id', element: <Layout><EquipmentDetailPage /></Layout> },
  { path: '/equipments/:id/edit', element: <Layout><EquipmentFormPage /></Layout> },
  { path: '/inspection-checklists', element: <Layout><InspectionChecklistPage /></Layout> },
  { path: '/inspection-schedules', element: <Layout><InspectionScheduleListPage /></Layout> },
  { path: '/inspection-schedules/new', element: <Layout><InspectionScheduleFormPage /></Layout> },
  { path: '/inspections/:id', element: <Layout><InspectionDetailPage /></Layout> },
  { path: '/faults', element: <Layout><FaultListPage /></Layout> },
  { path: '/faults/new', element: <Layout><FaultCreatePage /></Layout> },
  { path: '/faults/:id', element: <Layout><FaultDetailPage /></Layout> },
  { path: '/maintenance', element: <Layout><MaintenanceListPage /></Layout> },
  { path: '/maintenance/new', element: <Layout><MaintenanceCreatePage /></Layout> },
  { path: '/maintenance/:id', element: <Layout><MaintenanceDetailPage /></Layout> },
  { path: '/parts', element: <Layout><PartListPage /></Layout> },
  { path: '/parts/new', element: <Layout><PartFormPage /></Layout> },
  { path: '/parts/:id', element: <Layout><PartDetailPage /></Layout> },
  { path: '/parts/:id/edit', element: <Layout><PartFormPage /></Layout> },
  { path: '/users', element: <Layout><UserListPage /></Layout> },
  { path: '*', element: <NotFoundPage /> },
])

export default router
