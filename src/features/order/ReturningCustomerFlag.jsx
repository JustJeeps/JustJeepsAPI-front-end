import { Tooltip } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";
import {
  buildLookupUrl,
  describeReturningCustomer,
  getReturningCustomer,
  getReturningCustomerColor,
} from "./returningCustomerRules";

// Blue check next to the customer name when the customer already paid in
// QuickBooks. The shade follows the match percentage; the tooltip says what
// differs. Clicking opens the QuickBooks lookup on that customer in a new
// tab, and the click must not expand the order row.
const ReturningCustomerFlag = ({ order }) => {
  const flag = getReturningCustomer(order);
  if (!flag) return null;
  const text = describeReturningCustomer(flag);
  const label = text.split("\n")[0];
  return (
    <Tooltip title={<span style={{ whiteSpace: "pre-line" }}>{text}</span>}>
      <a
        href={buildLookupUrl(flag)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
        style={{ display: "inline-flex", lineHeight: 0 }}
      >
        <CheckCircleFilled style={{ color: getReturningCustomerColor(flag.percent), fontSize: 14, cursor: "pointer" }} />
      </a>
    </Tooltip>
  );
};

export default ReturningCustomerFlag;
