import { Tag, Typography } from "antd";
import { CheckCircleFilled, CloseCircleFilled, MinusCircleOutlined } from "@ant-design/icons";
import { RETURNING_CUSTOMER_COLORS, summarizeReturningCustomer } from "./returningCustomerRules";

const { Text } = Typography;

// Content of the bubble that opens over the returning customer check. Pure
// layout: every string comes from summarizeReturningCustomer, so wording and
// rules stay testable and this file is free to change its look.

const STATUS_ICONS = {
  match: <CheckCircleFilled style={{ color: RETURNING_CUSTOMER_COLORS.green }} />,
  different: <CloseCircleFilled style={{ color: "#cf1322" }} />,
  missing: <MinusCircleOutlined style={{ color: "#8c8c8c" }} />,
};

const cell = { padding: "4px 8px", verticalAlign: "top", fontSize: 12, lineHeight: "16px" };
const head = { ...cell, color: "#8c8c8c", fontWeight: 600, textTransform: "uppercase", fontSize: 10, letterSpacing: 0.4, borderBottom: "1px solid #f0f0f0" };

const ReturningCustomerCard = ({ flag }) => {
  const card = summarizeReturningCustomer(flag);
  const levelColor = card.level === "green" ? "success" : "warning";
  return (
    <div style={{ width: 460, fontSize: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Tag color={levelColor} style={{ margin: 0, fontWeight: 600 }}>{card.levelLabel}</Tag>
        <Text strong>{card.percent}% match</Text>
        <Text type="secondary" style={{ marginLeft: "auto" }}>QuickBooks: {card.customerName}</Text>
      </div>

      <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", background: "#fafafa", borderRadius: 6 }}>
        <colgroup>
          <col style={{ width: 64 }} />
          <col />
          <col />
          <col style={{ width: 132 }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...head, textAlign: "left" }}>Field</th>
            <th style={{ ...head, textAlign: "left" }}>Order</th>
            <th style={{ ...head, textAlign: "left" }}>QuickBooks</th>
            <th style={{ ...head, textAlign: "left" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {card.rows.map((row) => (
            <tr key={row.key}>
              <td style={{ ...cell, fontWeight: 600, whiteSpace: "nowrap" }}>{row.label}</td>
              <td style={{ ...cell, overflowWrap: "anywhere" }}>{row.order || <Text type="secondary">(none)</Text>}</td>
              <td style={{ ...cell, overflowWrap: "anywhere" }}>{row.quickbooks || <Text type="secondary">(none)</Text>}</td>
              <td style={{ ...cell, textAlign: "left" }} title={row.note}>
                {STATUS_ICONS[row.status]}
                <span style={{ marginLeft: 4, color: "#595959" }}>{row.note}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8, color: "#595959" }}>
        <span>{card.lastPurchase ? `Last purchase: ${card.lastPurchase}` : "No purchase date"}</span>
        <span>{card.snapshot}</span>
      </div>

      <div style={{ marginTop: 8 }}>
        <a href={card.lookupUrl} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>
          Open in QuickBooks Customer Lookup
        </a>
      </div>
    </div>
  );
};

export default ReturningCustomerCard;
