import helper_black from '../../assets/helper_black_transparent.png';
import { Login, Logout, ImageAvatars } from '../../icons';
import { UserOutlined } from '@ant-design/icons';
import { Avatar, Space, Button, Dropdown } from 'antd';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import logo_jeeps from './logo_jeeps.png';
import { useAuth } from '../../context/AuthContext';
import LoginModal from '../../components/auth/LoginModal';

const Navbar = () => {
	const { authEnabled, isAuthenticated, user, logout } = useAuth();
	const [showLoginModal, setShowLoginModal] = useState(false);

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
		<nav className='navbar navbar-expand-lg bg-body-tertiary'>
			<div className='container'>
				<Link className='nav-link active fs-5 mx-4' to='/'>
					<img src={logo_jeeps} alt='logo'/>
				</Link>
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

						<li className='nav-item'>
							<Link
								className='aria-current nav-link active fs-5 mx-4'
								to='/items'
							>
								Search by SKU or Brand
							</Link>
						</li>
					</ul>
					
					<div className='nav-right'>
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
