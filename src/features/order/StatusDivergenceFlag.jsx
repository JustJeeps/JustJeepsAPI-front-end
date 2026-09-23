import { Tooltip } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { describeStatusDivergence } from "./statusDivergence";

// Red exclamation next to the order number when our ship status and the
// Magento status disagree (same icon the Region column already uses).
const StatusDivergenceFlag = ({ order }) => {
  const text = describeStatusDivergence(order);
  if (!text) return null;
  return (
    <Tooltip title={<span style={{ whiteSpace: "pre-line" }}>{text}</span>}>
      <ExclamationCircleOutlined style={{ color: "#cf1322", fontSize: 14, cursor: "help" }} aria-label={text} />
    </Tooltip>
  );
};

export default StatusDivergenceFlag;
