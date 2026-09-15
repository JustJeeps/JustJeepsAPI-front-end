import { Tag, Tooltip } from "antd";
import { getOtherOpenOrders, hasMultipleOpenOrders } from "./openOrdersRules";

// Red "N OPEN ORDERS" tag next to the customer name, same look as the Fraud
// tags. Hover lists the other order numbers; click searches the customer
// email so all their orders show together.
const OpenOrdersFlag = ({ order, onSelectCustomer }) => {
  if (!hasMultipleOpenOrders(order)) return null;

  const total = order.open_orders_same_customer.length;
  const others = getOtherOpenOrders(order).map((open) => open.increment_id).join(", ");

  return (
    <Tooltip title={`Other open orders: ${others}`}>
      <Tag
        color="red"
        style={{ margin: 0, fontSize: 11, cursor: "pointer" }}
        onClick={() => onSelectCustomer?.(order.customer_email)}
      >
        {total} OPEN ORDERS
      </Tag>
    </Tooltip>
  );
};

export default OpenOrdersFlag;
