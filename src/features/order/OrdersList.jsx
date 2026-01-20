import Order from './Order';

const OrdersList = () => {
	const { orders } = useSelector(store => store.order);

	return (
		<div className='container-fluid mt-3'>
			<table className='table table-hover table-striped'>
				<thead>
					<tr>
						<th scope='col'>Order_id</th>
						<th scope='col'>Created_Date</th>
						//creaste a new one for base_total_due
						<th scope='col'>base_total_due</th>
						//create a new one shipping_description and shipping_amount
						<th scope='col'>Shipping Description</th>
						<th scope='col'>Shipping Amount</th>
						<th scope='col'>Email</th>
						<th scope='col'>Firstname</th>
						<th scope='col'>Lastname</th>
						<th scope='col'>Total</th>
						<th scope='col'>increment_id</th>
						<th scope='col'>Total_Qty</th>
						<th scope='col'>View</th>
						//weltpixel_fraud_score
						<th scope='col'>Fraud Score</th>
						//custom_po_number
						<th scope='col'>Custom PO Number</th>
						//add a column for method_title, that it is payment method
						<th scope='col'>Payment Method</th>
						//add region
						<th scope='col'>Region</th>
					</tr>
				</thead>
				<tbody>
					{orders.map(order => {
						return <Order key={order.entity_id} {...order} />;
					})}
				</tbody>
			</table>
		</div>
	);
};

export default OrdersList;
