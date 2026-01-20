import Navbar from './features/navbar/Navbar.jsx';
import { useState, useEffect } from 'react';
import axios from 'axios';
import OrderTable from './features/order/OrderTable.jsx';
import { Route, Routes } from 'react-router-dom';
import { SupplierTable } from './features/supplier/SupplierTable.jsx';
import { DashBoard } from './features/dashboard/DashBoard.jsx';
import { DashBoardPO } from './features/dashboard/DashBoardPO.jsx';
import { PoForm } from './features/po/PoForm.jsx';
import { Items } from './features/items/Items.jsx';
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AuthTestPage from "./components/AuthTestPage";
import LoginPage from "./pages/LoginPage";

function App() {
	return (
		<AuthProvider>
			<Navbar />
			<Routes>
				<Route path='/' element={<OrderTable />} />
				<Route path='/orders' element={<OrderTable />} />
				<Route path='/suppliers' element={<SupplierTable />} />
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
				<Route path='/items' element={<Items />} />
				<Route path='/auth-test' element={<AuthTestPage />} />
				<Route path='/login' element={<LoginPage />} />
			</Routes>
		</AuthProvider>
	);
}

export default App;
