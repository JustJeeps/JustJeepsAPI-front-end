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
// AuthTestPage removido por segurança - não expor página de teste em produção
import LoginPage from "./pages/LoginPage";

function App() {
	return (
		<AuthProvider>
			<Navbar />
			<Routes>
				{/* Rota pública - Login */}
				<Route path='/login' element={<LoginPage />} />

				{/* Rotas protegidas */}
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
			</Routes>
		</AuthProvider>
	);
}

export default App;
