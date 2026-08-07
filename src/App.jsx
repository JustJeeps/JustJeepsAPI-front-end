import Navbar from './features/navbar/Navbar.jsx';
import { useState, useEffect } from 'react';
import axios from 'axios';
import OrderTable from './features/order/OrderTable.jsx';
import { Navigate, Route, Routes } from 'react-router-dom';
import PurchaserReport from './features/report/PurchaserReport.jsx';
import { SupplierTable } from './features/supplier/SupplierTable.jsx';
import { DashBoard } from './features/dashboard/DashBoard.jsx';
import { DashBoardPO } from './features/dashboard/DashBoardPO.jsx';
import CronJobsDashboard from './features/cron/CronJobsDashboard.jsx';
import QuickBooksCustomerLookup from './features/quickbooks/QuickBooksCustomerLookup.jsx';
import RequestsPage from './features/requests/RequestsPage.jsx';
import SettingsPage from './features/settings/SettingsPage.jsx';
import { PoForm } from './features/po/PoForm.jsx';
import { Items } from './features/items/Items.jsx';
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
// AuthTestPage removed for security: do not expose a test page in production
import LoginPage from "./pages/LoginPage";

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

function App() {
	// Orders state for PurchaserReport
	const [orders, setOrders] = useState([]);
	// Fetch orders once for the report page
	useEffect(() => {
		axios.get(`${API_BASE_URL}/api/orders`).then(res => {
			setOrders(res.data.data || res.data);
		});
	}, []);

	return (
		<AuthProvider>
			<Navbar />
			<ErrorBoundary>
			<Routes>
				{/* Public route: Login */}
				<Route path='/login' element={<LoginPage />} />

				{/* Protected routes */}
				<Route path='/' element={
					<ProtectedRoute>
						<OrderTable />
					</ProtectedRoute>
				} />
				<Route path='/orders' element={
					<ProtectedRoute>
						<OrderTable />
					</ProtectedRoute>
				} />
				<Route path='/suppliers' element={
					<ProtectedRoute>
						<SupplierTable />
					</ProtectedRoute>
				} />
				<Route path='/dashboard'>
					<Route index element={
						<ProtectedRoute>
							<DashBoard />
						</ProtectedRoute>
					} />
					<Route path='po' element={
						<ProtectedRoute>
							<DashBoardPO />
						</ProtectedRoute>
					} />
				</Route>
				<Route path='/po' element={
					<ProtectedRoute>
						<PoForm />
					</ProtectedRoute>
				} />
				<Route path='/items' element={
					<ProtectedRoute>
						<Items />
					</ProtectedRoute>
				} />
				<Route path='/purchaser-report' element={
					<ProtectedRoute>
						<PurchaserReport orders={orders} />
					</ProtectedRoute>
				} />
				<Route path='/cron-jobs' element={
					<ProtectedRoute allowedUsers={['tess']}>
						<CronJobsDashboard />
					</ProtectedRoute>
				} />
				<Route path='/quickbooks-customer-lookup' element={
					<ProtectedRoute>
						<QuickBooksCustomerLookup />
					</ProtectedRoute>
				} />
				{/* Feeds moved into Settings (Imports tab); keep old links working */}
				<Route path='/feeds' element={<Navigate to='/settings?tab=imports' replace />} />
				<Route path='/requests' element={
					<ProtectedRoute>
						<RequestsPage />
					</ProtectedRoute>
				} />
				<Route path='/settings' element={
					<ProtectedRoute>
						<SettingsPage />
					</ProtectedRoute>
				} />
			</Routes>
			</ErrorBoundary>
		</AuthProvider>
	);
}

export default App;
