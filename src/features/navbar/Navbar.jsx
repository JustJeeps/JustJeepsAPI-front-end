import { Login, Logout } from '../../icons';
import { SettingOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Space, Button, Dropdown } from 'antd';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import logo_jeeps from './logo_jeeps.png';
import { useAuth } from '../../context/AuthContext';
import LoginModal from '../../components/auth/LoginModal';
import { fetchRequestsMetaCached } from '../requests/requestsApi';

const ALLOWED_USERS = ['tess', 'paula', 'karoline'];
const CRON_JOBS_ALLOWED_USERS = ['tess'];
const Navbar = () => {
	const { authEnabled, isAuthenticated, user, logout } = useAuth();
	const [showLoginModal, setShowLoginModal] = useState(false);
	// Rollout gate da feature Requests: o item de menu so aparece para quem o
	// back liberou (meta.requestsEnabled); a validacao real e nas rotas.
	const [requestsEnabled, setRequestsEnabled] = useState(false);
	const normalizedUsername = (user?.username || user?.name || '').toLowerCase();

	useEffect(() => {
		if (!user) {
			setRequestsEnabled(false);
			return;
		}
		let cancelled = false;
		fetchRequestsMetaCached(normalizedUsername)
			.then((meta) => {
				if (!cancelled) setRequestsEnabled(Boolean(meta?.requestsEnabled));
			})
			.catch(() => {});
		return () => { cancelled = true; };
	}, [user, normalizedUsername]);

	const handleLogout = async () => {
		await logout();
	};

	const userMenuItems = [
		{
			key: 'profile',
			label: (
				<div>
					<strong>{user?.firstname} {user?.lastname}</strong>
					<br />
					<small>{user?.email}</small>
				</div>
			),
		},
		{
			type: 'divider',
		},
		{
			key: 'logout',
			label: 'Sign Out',
			onClick: handleLogout,
			icon: <Logout />,
		},
	];

	return (
		<nav className='navbar navbar-expand-lg'>
			<div className='container'>
				<Link className='nav-link active fs-5 mx-4' to='/'>
					<img src={logo_jeeps} alt='logo'/>
				</Link>
				<button
					className='navbar-toggler'
					type='button'
					data-bs-toggle='collapse'
					data-bs-target='#navbarSupportedContent'
					aria-controls='navbarSupportedContent'
					aria-expanded='false'
					aria-label='Toggle navigation'
				>
					<span className='navbar-toggler-icon' />
				</button>
				<div className='collapse navbar-collapse' id='navbarSupportedContent'>
					<ul className='navbar-nav me-auto mb-2 mb-lg-0'>
						<li className='nav-item'>
							<Link
								className='nav-link active fs-5 mx-4'
								aria-current='page'
								to='/orders'
							>
								Orders
							</Link>
						</li>
						{/* Only show Purchaser Report for allowed users */}
						{user && ALLOWED_USERS.includes((user.username || user.name || '').toLowerCase()) && (
						  <li className='nav-item'>
						    <Link
						      className='nav-link active fs-5 mx-4'
						      to='/purchaser-report'
						    >
						      Purchaser Report
						    </Link>
						  </li>
						)}
						<li className='nav-item'>
							<Link
								className='aria-current nav-link active fs-5 mx-4'
								to='/items'
							>
								Search by SKU or Brand
							</Link>
						</li>
						{user && (
							<li className='nav-item'>
								<Link
									className='aria-current nav-link active fs-5 mx-4'
									to='/quickbooks-customer-lookup'
								>
									QuickBooks Customer Lookup
								</Link>
							</li>
						)}
						{user && requestsEnabled && (
							<li className='nav-item'>
								<Link
									className='aria-current nav-link active fs-5 mx-4'
									to='/requests'
								>
									Requests
								</Link>
							</li>
						)}
						{user && CRON_JOBS_ALLOWED_USERS.includes(normalizedUsername) && (
							<li className='nav-item'>
								<Link
									className='aria-current nav-link active fs-5 mx-4'
									to='/cron-jobs'
								>
									Cron Jobs
								</Link>
							</li>
						)}
					</ul>
					
					<div className='nav-right'>
						{/* Settings gear: the single entry point for configuration (Trello,
						    imports). Visible to every logged in user; each section gates
						    itself and the backend enforces the real permissions.
						    A Link on purpose: the global "nav button" rule would deform a
						    <button>. */}
						{user && (
							<Link
								to='/settings'
								className='nav-settings-gear'
								title='Settings'
								aria-label='Settings'
							>
								<SettingOutlined style={{ fontSize: 20, color: '#145DA0' }} />
							</Link>
						)}
						{/* Show authentication controls only if auth is enabled */}
						{authEnabled && (
							<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
								{isAuthenticated ? (
									<Dropdown
										menu={{ items: userMenuItems }}
										trigger={['click']}
										placement="bottomRight"
									>
										<Space style={{ cursor: 'pointer' }}>
											<Avatar 
												style={{ backgroundColor: '#145DA0', color: '#D4F1F4' }}
												icon={<UserOutlined />}
											>
												{user?.firstname?.[0]}{user?.lastname?.[0]}
											</Avatar>
											<span style={{ color: '#145DA0' }}>
												{user?.firstname}
											</span>
										</Space>
									</Dropdown>
								) : (
									<Button
										type="primary"
										icon={<Login />}
										onClick={() => setShowLoginModal(true)}
									>
										Sign In
									</Button>
								)}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Login Modal */}
			<LoginModal
				visible={showLoginModal}
				onCancel={() => setShowLoginModal(false)}
				onLoginSuccess={() => setShowLoginModal(false)}
			/>
		</nav>
	);
};
export default Navbar;
