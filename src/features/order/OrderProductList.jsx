import OrderProduct from './OrderProduct';
import { useEffect, useState } from 'react';
import { Space, Switch, Table, Popconfirm, Input, Button, Badge } from 'antd';
import Highlighter from 'react-highlight-words';
import axios from 'axios';
import orderProducts from '../../../orderProducts';

const rowSelection = {
	onChange: (selectedRowKeys, selectedRows) => {
		console.log(
			`selectedRowKeys: ${selectedRowKeys}`,
			'selectedRows: ',
			selectedRows
		);
	},
	getCheckboxProps: record => ({
		disabled: record.entity_id === 'Disabled User', // Column configuration not to be checked
		entity_id: record.entity_id,
	}),
};

const OrderProductList = () => {
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(false);
	const [sortedInfo, setSortedInfo] = useState({});
	const [searchColumnText, setSearchColumnText] = useState('');
	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		setLoading(true);
		const response = await axios.get('orderProductsJoin.json');
		console.log('response: ', response);

		setOrders(response.data);
		setLoading(false);
	};

	console.log('orders: ', orders);
	// const modifiedData =
	// 	orders.length > 0 &&
	// 	orders.map(({ items, ...orders }) => ({
	// 		...orders,
	// 		children: items,
	// 	}));

	const prepareData = arr => {
		if (arr.length < 1) {
			return [];
		}
		return arr.map(order => ({ ...order, children: order.items }));
	};

	const modifiedData = prepareData(orders);

	const handleDelete = value => {
		const dataSource = [...modifiedData]; //modifiedData
		const filteredOrders = dataSource.filter(
			order => order.entity_id !== value.id
		);
		setOrders(filteredOrders);
	};

	const handleChange = (...sorter) => {
		const { order, field } = sorter[2];
		setSortedInfo({ columnKey: field, order });
	};

	const expandedRowRender = () => {
		const columns = [
			{
				title: 'ID',
				dataIndex: 'id',
				key: 'id',
			},
			{
				title: 'Product',
				dataIndex: 'name',
				key: 'name',
			},
			{
				title: 'SKU',
				dataIndex: 'sku',
				key: 'sku',
			},
			{
				title: 'Price',
				dataIndex: 'price',
				key: 'price',
			},
			{
				title: 'Product_id',
				dataIndex: 'product_id',
				key: 'product_id',
			},
			{
				title: 'Quantity',
				dataIndex: 'qty_ordered',
				key: 'qty_ordered',
			},
			{
				title: 'Action',
				dataIndex: 'operation',
				key: 'operation',
				render: () => (
					<Space size='middle'>
						<a>Edit</a>
						<a>Delete</a>
					</Space>
				),
			},
		];

		const data = [];
		for (let i = 0; i < modifiedData.length; i++) {
			data.push({
				key: i.toString(),
				id: i + 1,
				name: modifiedData[i].items[i].name,
				sku: modifiedData[i].items[i].sku,
				price: modifiedData[i].items[i].price,
				product_id: modifiedData[i].items[i].product_id,
				qty_ordered: modifiedData[i].items[i].qty_ordered,
			});
		}

		return <Table columns={columns} dataSource={data} pagination={false} />;
	};

	const columns = [
		//add a column for method_title, that it is payment method
		{
			title: 'Payment Method',
			dataIndex: 'method_title',
			key: 'method_title',
			sorter: (a, b) => a.method_title?.localeCompare(b.method_title),
			sortOrder: sortedInfo.columnKey === 'method_title' && sortedInfo.order,
		},
		
		//add a column for shipping_description and shipping_amount
		{
			title: 'Shipping Description',
			dataIndex: 'shipping_description',
			key: 'shipping_description',
			sorter: (a, b) =>
				a.shipping_description?.localeCompare(b.shipping_description),
			sortOrder:
				sortedInfo.columnKey === 'shipping_description' && sortedInfo.order,
		},
		{
			title: 'Shipping Amount',
			dataIndex: 'shipping_amount',
			key: 'shipping_amount',
			sorter: (a, b) => a.shipping_amount - b.shipping_amount,
			sortOrder: sortedInfo.columnKey === 'shipping_amount' && sortedInfo.order,
		},
		//add a column for base_total_due
		{
			title: 'base_total_due',
			dataIndex: 'base_total_due',
			key: 'base_total_due',
			sorter: (a, b) => a.base_total_due - b.base_total_due,
			sortOrder: sortedInfo.columnKey === 'base_total_due' && sortedInfo.order,

		},
		{
			title: 'Order_id',
			dataIndex: 'entity_id',
			key: 'entity_id',
			sorter: (a, b) => a.entity_id - b.entity_id,
			sortOrder: sortedInfo.columnKey === 'entity_id' && sortedInfo.order,
		},
		{
			title: 'Created_Date',
			dataIndex: 'created_at',
			key: 'created_at',
			sorter: (a, b) => a.created_at?.localeCompare(b.created_at),
			sortOrder: sortedInfo.
			columnKey === 'created_at' && sortedInfo.order,
		},
		//add region
		{
			title: 'Region',
			dataIndex: 'region',
			key: 'region',
			sorter: (a, b) => a.region?.localeCompare(b.region),
			sortOrder: sortedInfo.columnKey === 'region' && sortedInfo.order,
		
			
		},
		{
			title: 'Email',
			dataIndex: 'customer_email',
			key: 'customer_email',
			editTable: true,
			sorter: (a, b) => a.customer_email?.localeCompare(b.customer_email),
			sortOrder: sortedInfo.columnKey === 'customer_mail' && sortedInfo.order,
		},
		{
			title: 'First Name',
			dataIndex: 'customer_firstname',
			key: 'customer_firstname',
			sorter: (a, b) =>
				a.customer_firstname?.localeCompare(b.customer_firstname),
			sortOrder:
				sortedInfo.columnKey === 'customer_firstname' && sortedInfo.order,
		},
		{
			title: 'Last Name',
			dataIndex: 'customer_lastname',
			key: 'customer_lastname',
			sorter: (a, b) => a.customer_lastname?.localeCompare(b.customer_lastname),
			sortOrder:
				sortedInfo.columnKey === 'customer_lastname' && sortedInfo.order,
		},
		{
			title: 'Total',
			dataIndex: 'grand_total',
			key: 'grand_total',
			editTable: true,
			sorter: (a, b) => a.grand_total - b.grand_total,
			sortOrder: sortedInfo.columnKey === 'grand_total' && sortedInfo.order,
		},
		{
			title: 'Increment_id',
			dataIndex: 'increment_id',
			key: 'increment_id',
			sorter: (a, b) => a.increment_id - b.increment_id,
			sortOrder: sortedInfo.columnKey === 'increment_id' && sortedInfo.order,
		},
		{
			title: 'Total Qty',
			dataIndex: 'total_qty_ordered',
			key: 'total_qty_ordered',
			editTable: true,
			sorter: (a, b) => a.total_qty_ordered - b.total_qty_ordered,
			sortOrder:
				sortedInfo.columnKey === 'total_qty_ordered' && sortedInfo.order,
		},
		{
			title: 'Action',
			key: 'operation',
			render: () => (
				<Space size='middle'>
					<a>Edit</a>
					<a>Delete</a>
				</Space>
			),
		},
	];

	const data = modifiedData.map(order => ({
		key: order.entity_id.toString(),
		...order,
	}));

	return (
		<>
			<Table
				columns={columns}
				expandable={{
					expandedRowRender,
					defaultExpandedRowKeys: ['0'],
				}}
				dataSource={data}
				size='middle'
			/>
		</>
	);
};

export default OrderProductList;
