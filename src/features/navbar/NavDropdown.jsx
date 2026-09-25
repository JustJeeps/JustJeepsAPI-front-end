import { DownOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { isGroupActive } from './navbarMenu';

// One navbar dropdown (Products, More). The trigger looks exactly like a
// jj-nav-link, with a small caret; the panel is the antd Dropdown already used
// by the user menu. The trigger gets the active underline when the current page
// is one of its children.
const toMenuItems = (children) => children.map((child, index) => {
	if (child.type === 'divider') return { type: 'divider', key: `divider-${index}` };
	if (child.type === 'group') return { type: 'group', key: `group-${index}`, label: child.label };
	return { key: child.key, label: <Link to={child.to}>{child.label}</Link> };
});

const selectedKeys = (children, pathname) => children
	.filter((child) => !child.type && child.to && (pathname === child.to || pathname.startsWith(`${child.to}/`)))
	.map((child) => child.key);

const NavDropdown = ({ item }) => {
	const { pathname } = useLocation();
	const active = isGroupActive(item, pathname);
	return (
		<li className='nav-item'>
			<Dropdown
				menu={{ items: toMenuItems(item.children), selectedKeys: selectedKeys(item.children, pathname) }}
				trigger={['hover', 'click']}
				placement='bottomLeft'
				rootClassName='jj-nav-dropdown-menu'
			>
				<a
					href='#'
					onClick={(event) => event.preventDefault()}
					className={`nav-link jj-nav-link jj-nav-dropdown${active ? ' active' : ''}`}
					aria-haspopup='menu'
				>
					{item.label}
					<DownOutlined className='jj-nav-dropdown-caret' />
				</a>
			</Dropdown>
		</li>
	);
};

export default NavDropdown;
