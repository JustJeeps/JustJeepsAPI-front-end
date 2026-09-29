import { Popover } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";
import ReturningCustomerCard from "./ReturningCustomerCard";
import {
  buildLookupUrl,
  describeReturningCustomer,
  getReturningCustomer,
  getReturningCustomerColor,
} from "./returningCustomerRules";

// Check next to the customer name when the customer already paid in
// QuickBooks: green for a strong match, yellow for a partial one. Hovering
// opens a formatted bubble (ReturningCustomerCard) with the field by field
// comparison; clicking the icon opens the QuickBooks lookup on that customer
// in a new tab, and the click must not expand the order row.
const ReturningCustomerFlag = ({ order }) => {
  const flag = getReturningCustomer(order);
  if (!flag) return null;
  const label = describeReturningCustomer(flag).split("\n")[0];
  return (
    <Popover
      content={<ReturningCustomerCard flag={flag} />}
      placement="bottomLeft"
      mouseEnterDelay={0.2}
      styles={{ body: { padding: 12 } }}
    >
      <a
        href={buildLookupUrl(flag)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
        style={{ display: "inline-flex", lineHeight: 0 }}
      >
        <CheckCircleFilled style={{ color: getReturningCustomerColor(flag), fontSize: 14, cursor: "pointer" }} />
      </a>
    </Popover>
  );
};

export default ReturningCustomerFlag;
