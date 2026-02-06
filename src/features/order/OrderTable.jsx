import {
  SearchOutlined,
  EditOutlined,
  SaveOutlined,
  GlobalOutlined,
  ShoppingCartOutlined,
  SendOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import {
  Space,
  Table,
  Input,
  Button,
  Modal,
  Form,
  Tooltip,
  Select,
  Badge,
  Tag,
  Row,
  Col,
  Card,
  Segmented,
} from "antd";
import { FilterOutlined, ClearOutlined, ReloadOutlined } from "@ant-design/icons";
import Highlighter from "react-highlight-words";
import { Edit, Trash, Save, Reload } from "../../icons";
import Popup from "./Popup";
import TableTop from "../tabletop/TableTop";
import "./order.scss";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import {
  QuestionCircleOutlined,
  IssuesCloseOutlined,
  CheckCircleOutlined,
  StopOutlined
} from "@ant-design/icons";


const OrderTable = () => {
  const [orders, setOrders] = useState([]);
  const [originalOrders, setOriginalOrders] = useState([]);
  const [sortedInfo, setSortedInfo] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInput = useRef(null);
  const [editingRow, setEditingRow] = useState(null);
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState("top");
  const [currentSku, setCurrentSku] = useState(null);
  const [currentOrderProductID, setCurrentOrderProductID] = useState(null);
  const [currentOrderProductPrice, setCurrentOrderProductPrice] =
    useState(null);
  const { Option } = Select;
  const [selectedOrder, setSelectedOrder] = useState(null);

  // State to manage the current order's currency
  const [currentCurrency, setCurrentCurrency] = useState(null);
  const [showNotSetOnly, setShowNotSetOnly] = useState(false);
  const [showPmOnly, setShowPmOnly] = useState(false);

  // Pagination state for server-side pagination
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 25,
    total: 0,
  });

  // Filter states
  const [filters, setFilters] = useState({
    filterMode: 'order', // 'order' or 'items'
    status: '', // No default filter - show all statuses
    search: '',
    poStatus: '',
    region: '',
    vendor: '', // vendor filter (only for items mode)
    dateFilter: '', // 'today', 'yesterday', 'last7days', or ''
  });

  // Vendors list for dropdown
  const [vendors, setVendors] = useState([]);

  // Metrics state (independent of pagination)
  const [metrics, setMetrics] = useState({
    notSetCount: 0,
    todayCount: 0,
    yesterdayCount: 0,
    last7DaysCount: 0,
    pmNotSetCount: 0,
    gwCount: 0,
    totalCount: 0,
  });
  const [metricsLoading, setMetricsLoading] = useState(true);




  const API_URL = import.meta.env.VITE_API_URL;

  // const BACKEND_URL = "https://jj-api-backend.herokuapp.com";
  
    // const BACKEND_URL = "  https://fbc3-2607-fea8-58df-feb0-242d-ae03-2e-322c.ngrok-free.app";

  // const BACKEND_URL = "http://localhost:8080";

  console.log("🌍 API_URL from env:", API_URL);

  // cache so we don't re-hit the server for the same SKU
const brandCacheRef = useRef({});

const getBrandForSku = async (sku) => {
  if (!sku) return "";
  if (brandCacheRef.current[sku]) return brandCacheRef.current[sku];
  try {
    const { data } = await axios.get(`${API_URL}/api/products/${encodeURIComponent(sku)}/brand`);
    const brand = data?.brand || "";
    brandCacheRef.current[sku] = brand;
    return brand;
  } catch {
    return "";
  }
};

// Pull weight from wherever your backend puts it (adjust the fallbacks if needed)
const getWeight = (item) => {
  const raw =
    item?.product?.weight ??          // typical
    item?.product?.weight_lbs ??      // if you named it like this
    item?.weight ??                   // fallback if item has it at top level
    null;

  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
};


 // map vendor "labels" you use on orders → their email (edit as needed)
const vendorEmailMap = {
  keystone: "purchasing@keystone.com",
  meyer: "orders@meyerdistributing.com",
  omix: "orders@omix-ada.com",
  quadratec: "purchasing@quadratec.com",
};

const DEFAULT_PURCHASING_EMAIL = "purchasing@justjeeps.com";


// "QTC-92806-9022" -> "92806-9022"
// "KEN-30477"      -> "30477"
const formatSkuForEmail = (sku) => {
  if (!sku) return "";
  const s = String(sku).trim();
  const i = s.indexOf("-");
  return i >= 0 ? s.slice(i + 1) : s;
};


 // Pretty country label from 2-letter code
const countryLabel = (code) => {
  const map = { CA: "Canada", US: "United States" };
  return map[code?.toUpperCase?.()] || code || "";
};

// Builds the ship-to block from your new inline shipping_* columns
const buildShipToBlock = (order) => {
  const fullName =
    [order?.shipping_firstname, order?.shipping_lastname]
      .filter(Boolean)
      .join(" ")
    || [order?.customer_firstname, order?.customer_lastname]
      .filter(Boolean)
      .join(" ")
    || "Customer";

  const lines = [
    fullName,
    order?.shipping_company,                 // 👈 added company here
    order?.shipping_street1,
    order?.shipping_street2,
    order?.shipping_street3,
    [order?.shipping_city || order?.city, order?.shipping_region || order?.region, order?.shipping_postcode]
      .filter(Boolean)
      .join(", "),
    countryLabel(order?.shipping_country_id) || "Canada",
    order?.shipping_telephone ? `T: ${order.shipping_telephone}` : null,
  ].filter(Boolean);

  return lines.join("\n");
};

// Subject unchanged
const buildEmailSubject = (order) =>
  `Order ${order?.increment_id || ""} `;

// Underline text in plain text emails using Unicode combining low line
const underline = (s) => s.split("").map(ch => ch + "\u0332").join("");

// One product line: "qty x BRAND 92806-9022"
const buildItemLine = (item, brand = "") => {
  const qty = Number(item?.qty_ordered ?? 1);
  const formattedSku = formatSkuForEmail(item?.sku);
  return `${qty} x ${brand ? brand + " " : ""}${formattedSku}`;
};



// Then in your body builder:
const buildEmailBody = (order, item, brand = "") => {
  const qty   = Number(item?.qty_ordered ?? 1);
  const sku   = formatSkuForEmail(item?.sku);
  const line  = `${qty} x ${brand ? brand + " " : ""}${sku}`;
  const emph  = underline("ETA, cost, and shipping cost"); // 👈 underlined phrase

  return (
`Could you please confirm the ${emph} for the items listed below?

${line}

Ship to:
${buildShipToBlock(order)}

Thank you,`
  );
};

// DS template (with Ship to:)
const buildBody_DS = (order, item, brand = "") => {
  const line = buildItemLine(item, brand);
  const emph = underline("ETA, cost, and shipping cost");
  return (
`Could you please confirm the ${emph} for the item listed below?

${line}

Ship to:
${buildShipToBlock(order)}

Thank you,`
  );
};

// Ship-to-Store template (short & simple, no address)
const buildBody_Store = (item, brand = "") => {
  const line = buildItemLine(item, brand);
  const emph = underline("ETA and cost");
  return (
`Could you please confirm the ${emph} for the item listed below?
${line}

Thank you,`
  );
};



// Simple brand inference from item name if DB brand is missing
const STOP = new Set(["for","fits","with","without","and","&","the","a","an"]);
const inferBrandFromName = (name) => {
  if (!name) return "";
  const t = name.trim().split(/\s+/);
  // special case
  if (/^dv8$/i.test(t[0]) && t[1]?.toLowerCase()==="off" && t[2]?.toLowerCase()==="road")
    return "DV8 Off Road";
  const out = [];
  for (const raw of t) {
    const w = raw.replace(/[^\w]/g, "");
    if (!w) break;
    if (/\d/.test(w)) break;
    if (STOP.has(w.toLowerCase())) break;
    out.push(w);
    if (out.length === 2) break;
  }
  return out.join(" ");
};

// Prefer DB brand; otherwise infer from item name
const getBrandSync = (item) =>
  (item?.product?.brand_name && item.product.brand_name.trim()) ||
  inferBrandFromName(item?.name) || "";



// All item lines for an order (uses brand per item)
const buildAllItemLines = (order) =>
  (order?.items || []).map(it => buildItemLine(it, getBrandSync(it))).join("\n");

// DS template (all items, includes Ship to)
const buildBodyAll_DS = (order) => (
`Could you please confirm the ${underline("ETA, cost, and shipping cost")} for the items listed below?

${buildAllItemLines(order)}

Ship to:
${buildShipToBlock(order)}

Thank you,`
);

// Ship-to-Store template (all items, short)
const buildBodyAll_Store = (order) => (
`Could you please confirm the ${underline("ETA and cost")} for the items listed below?
${buildAllItemLines(order)}

Thank you,`
);




  // Load metrics (independent of pagination)
  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/orders/metrics`);
      setMetrics(response.data);
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
      // Fallback: calculate metrics from current page data (not ideal but better than 0)
      // This will only be used if the metrics endpoint is not available
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // Load vendors list for dropdown
  const loadVendors = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/vendors`);
      setVendors(response.data);
    } catch (error) {
      console.error("Failed to fetch vendors:", error);
    }
  }, []);

  //initial loading data main table
  useEffect(() => {
    loadData(1, pagination.pageSize, filters);
    loadMetrics();
    loadVendors();
  }, []);

  // Reload when filters change
  useEffect(() => {
    loadData(1, pagination.pageSize, filters);
  }, [filters]);

  //load all data with pagination and filters
  const loadData = useCallback(async (page = 1, pageSize = 25, currentFilters = filters) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
        ...(currentFilters.filterMode && { filterMode: currentFilters.filterMode }),
        ...(currentFilters.status && { status: currentFilters.status }),
        ...(currentFilters.search && { search: currentFilters.search }),
        ...(currentFilters.poStatus && { poStatus: currentFilters.poStatus }),
        ...(currentFilters.region && { region: currentFilters.region }),
        ...(currentFilters.vendor && { vendor: currentFilters.vendor }),
        ...(currentFilters.dateFilter && { dateFilter: currentFilters.dateFilter }),
      };

      const response = await axios.get(`${API_URL}/api/orders`, { params });

      // Handle both old format (array) and new format (paginated object)
      const ordersData = response.data.data || response.data;
      const paginationData = response.data.pagination;

      setOriginalOrders(ordersData);
      setOrders(ordersData);

      if (paginationData) {
        setPagination({
          current: paginationData.page,
          pageSize: paginationData.limit,
          total: paginationData.total,
        });
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);
  
  // Handle pagination change from table
  const handleTableChange = (paginationConfig, tableFilters, sorter) => {
    const { current, pageSize } = paginationConfig;
    loadData(current, pageSize, filters);
    // Also handle sorting
    const { order, field } = sorter;
    setSortedInfo({ columnKey: field, order });
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      filterMode: 'order',
      status: '',
      search: '',
      poStatus: '',
      region: '',
      vendor: '',
      dateFilter: '',
    });
  };

  //seed orders
  const handleSeedOrders = async () => {
    setLoading(true);
    try {
      await axios.get(`${API_URL}/api/seed-orders`);
      loadData(pagination.current, pagination.pageSize, filters); // fetch the updated orders with current pagination and filters
      loadMetrics(); // refresh metrics after seeding
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  //delete an order
  const handleDeleteOrder = (record) => {
    Modal.confirm({
      title: "Are you sure to cancel this order?",
      okText: "Yes",
      okType: "danger",
      onOk: () => {
        // deleteOrder(record); need delete backend
        setOrders((pre) => {
          return pre.filter((order) => order.entity_id !== record.entity_id);
        });
      },
    });
    const id = record.entity_id;
    return axios
      .post(`${API_URL}/api/orders/${id}/delete`, data)
      .then((response) => {
        setOrders(response.data);
      });
  };
  // delete an backend order
  const deleteOrder = async (order) => {
    const id = order.entity_id;
    const response = await axios.post(
      `${API_URL}/api/orders/${id}/delete`
    );
    setOrders(response.data);
  };

  // console.log('orders', orders);
  //delete an order-item
  const handleDeleteOrderItem = (record) => {
    Modal.confirm({
      title: "Are you sure to delete this item?",
      okText: "Yes",
      okType: "danger",
      onOk: () => {
        deleteOrderItem(record.id);
      },
    });
  };

  // delete backend order-product
  const deleteOrderItem = (id) => {
    return axios
      .delete(`${API_URL}/${id}/delete`)
      .then((response) => {
        setOrders(response.data);
      });
  };

  //handle save button sub row button
  const handleSaveSub = (key) => {
    form
      .validateFields()
      .then((values) => {
        onFinishSub(key, values);
        updateOrderItem(values);
      })
      .catch((error) => {
        console.log("error", error);
      });
  };

  const onFinishSub = (key, values) => {
    const updatedOrders = [...orders]; //make a copy of the orders
    const parentItem = updatedOrders.find((order) => {
      //find that order
      return order.entity_id === key;
    });
    const index = parentItem.items.findIndex((obj) => {
      //find the particular item row
      return obj.id === editingRow;
    });

    updatedOrders.splice(index, 1, {
      //remove the item, replace with the new value
      ...values,
      key: index,
    });

    setOrders(updatedOrders); //update orders
    setEditingRow(null);
  };

  const createPurchaseOrder = async (subRowRecord) => {
    console.log("subRowRecord for PO creation", subRowRecord);
    let vendor_id = 0;
    if (subRowRecord.selected_supplier.toLowerCase() === "keystone") {
      vendor_id = 1;
    } else if (subRowRecord.selected_supplier.toLowerCase() === "meyer") {
      vendor_id = 2;
    } else if (subRowRecord.selected_supplier.toLowerCase() === "omix") {
      vendor_id = 3;
    } else if (subRowRecord.selected_supplier.toLowerCase() === "quadratec") {
      vendor_id = 4;
    }
    console.log(
      "subRowRecord.selected_supplier.toLowerCase()",
      subRowRecord.selected_supplier.toLowerCase()
    );
    console.log("vendor_id", vendor_id);
    try {
      // create the purchase order
      const newPurchaseOrder = await axios.post(
        `${API_URL}/api/purchase_orders`,
        {
          vendor_id: vendor_id,
          user_id: 2,
          order_id: subRowRecord.order_id,
        }
      );
      console.log("created PO", newPurchaseOrder.data);

      // create the purchase order line item
      const newPurchaseOrderLineItem = await axios.post(
        `${API_URL}/purchaseOrderLineItem`,
        {
          purchaseOrderId: newPurchaseOrder.data.id,
          vendorProductId: null,
          quantityPurchased: subRowRecord.qty_ordered,
          vendorCost: parseFloat(subRowRecord.selected_supplier_cost) || null,
          product_sku: subRowRecord.sku,
        }
      );
      console.log("created PO line item", newPurchaseOrderLineItem);
      const confirmedMessage = await Modal.info({
        title: "Add Item to Purchase Order",
        content: `The ${subRowRecord.sku} has been added to the purchase order for ${subRowRecord.selected_supplier}`,
        okText: "Ok",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const updateOrderItem = (subRowRecord) => {
    const { id } = subRowRecord;
    console.log("subRowRecord", subRowRecord);

    return axios
      .post(`${API_URL}/order_products/${id}/edit`, subRowRecord)
      .then((data) => {
        let parentIndex;
        let parentItem;
        orders.forEach((order, index) => {
          if (order.entity_id === data.data.order_id) {
            parentItem = order;
            parentIndex = index; //give the index to the order
          }
        });
        //find index
        const index = parentItem.items.findIndex((order) => {
          return order.id === data.data.id;
        });
        //make copy
        const modifiedParentItems = [...parentItem.items];
        //replace with new value
        modifiedParentItems.splice(index, 1, subRowRecord);
        //modified the order items
        const modifiedParent = { ...parentItem, items: modifiedParentItems };
        //make copy of all orders
        const copyOrders = [...orders];
        //update the order
        copyOrders.splice(parentIndex, 1, modifiedParent);

        //set state
        setOrders(copyOrders);
      });
  };

  //handle save button main row button
  //need promise to make it work
  const handleSave = () => {
    form
      .validateFields()
      .then((values) => {
        onFinish(values);
        updateOrder(values);
      })
      .catch((error) => {
        console.log("error", error);
      });
  };

  //update orders frontend
  const onFinish = (values) => {
    const updatedOrders = [...orders];
    const index = updatedOrders.findIndex(
      (obj) => obj.entity_id === editingRow
    );
    console.log("updated orders::", updatedOrders[index]);
    const updatedOrdersStatus = updatedOrders[index].status;
    console.log("updatedOrdersStatus::", updatedOrdersStatus);
    const addStatusToValues = { ...values, status: updatedOrdersStatus };
    console.log("values::", addStatusToValues);
    updatedOrders.splice(index, 1, {
      ...addStatusToValues,
      key: index,
    });

    setOrders(updatedOrders);
    setEditingRow(null);
  };

  //update order backend
  const updateOrder = (formObj) => {
    const {
      customer_email,
      customer_firstname,
      customer_lastname,
      entity_id,
      grand_total,
      total_qty_ordered,
    } = formObj;

    return axios.post(
      `${API_URL}/api/orders/${entity_id}/edit`,
      formObj
    );
  };

  //search function
  const handleSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };
  const handleReset = (clearFilters) => {
    clearFilters();
    setSearchText("");
  };

  //search
  const getColumnSearchProps = (dataIndex) => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
      close,
    }) => (
      <div
        style={{
          padding: 8,
        }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Input
          ref={searchInput}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
          style={{
            marginBottom: 8,
            display: "block",
          }}
        />
        <Space>
          <Button
            onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
            icon={<SearchOutlined />}
            size="small"
            style={{
              width: 90,
            }}
          >
            Search
          </Button>
          <Button
            onClick={() => clearFilters && handleReset(clearFilters)}
            size="small"
            style={{
              width: 90,
            }}
          >
            Reset
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              close();
            }}
          >
            close
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined
        style={{
          color: filtered ? "#1890ff" : undefined,
        }}
      />
    ),
    onFilter: (value, record) =>
      record[dataIndex]?.toString().toLowerCase().includes(value.toLowerCase()),
    onFilterDropdownOpenChange: (visible) => {
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100);
      }
    },
    render: (text) =>
      searchedColumn === dataIndex ? (
        <Highlighter
          highlightStyle={{
            backgroundColor: "#ffc069",
            padding: 0,
          }}
          searchWords={[searchText]}
          autoEscape
          textToHighlight={text ? text.toString() : ""}
        />
      ) : (
        text
      ),
  });

  //refresh page
  const refreshPage = (e) => {
    e.preventDefault();
    window.location.reload(false);
  };



  //set up main column
  const columns = [

    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      align: "center",
      width: 110,
      sorter: (a, b) => a.created_at?.localeCompare(b.created_at),
      sortOrder: sortedInfo.columnKey === "created_at" && sortedInfo.order,
      ...getColumnSearchProps("created_at"),
      render: (text, record) => {
        const date = new Date(text);
        date.setHours(date.getHours() - 5);
        const localTime = date.toLocaleString("en-CA", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
        const [datePart, timePart] = localTime.split(', ');
        return (
          <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
            <div style={{ fontWeight: 600, color: '#1a1a1a', fontSize: '15px' }}>{datePart}</div>
            <div style={{ fontSize: '13px', color: '#666' }}>{timePart}</div>
          </div>
        );
      }
    },
    {
      title: "Order ID",
      dataIndex: "increment_id",
      key: "increment_id",
      align: "center",
      width: 90,
      sorter: (a, b) => a.increment_id - b.increment_id,
      sortOrder: sortedInfo.columnKey === "increment_id" && sortedInfo.order,
      ...getColumnSearchProps("increment_id"),
      render: (text, record) => {
        const po = (record.custom_po_number || "").trim().toLowerCase();
        const isExactlyNotSet = po === "not set";
        const containsNotSet = po.includes("not set");
        const isValid = !containsNotSet;
        const showUSFlag = record.increment_id?.toString().startsWith("3");

        return (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            {showUSFlag && <span role="img" aria-label="US">🇺🇸</span>}
            <a
              href={`https://www.justjeeps.com/admin_19q7yi/sales/order/view/order_id/${record.entity_id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#1890ff", fontWeight: 600, fontSize: '15px' }}
            >
              {text}
            </a>
            {isValid ? (
              <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 16 }} title="PO assigned" />
            ) : isExactlyNotSet ? (
              <span title="PO not set" style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: 'red', display: 'inline-block' }} />
            ) : (
              <span title="PO partially set" style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#faad14', display: 'inline-block' }} />
            )}
          </div>
        );
      }
    },
    {
      title: "PO#",
      dataIndex: "custom_po_number",
      key: "custom_po_number",
      align: "center",
      width: 120,
      sorter: (a, b) => a.custom_po_number?.localeCompare(b.custom_po_number),
      sortOrder: sortedInfo.columnKey === "custom_po_number" && sortedInfo.order,
      ...getColumnSearchProps("custom_po_number"),
      render: (text) => {
        const isMissing = !text || text.trim() === "" || text.trim().toLowerCase() === "not set";
        return (
          <span style={{
            color: isMissing ? '#ff4d4f' : '#1a1a1a',
            fontWeight: isMissing ? 700 : 500,
            fontSize: '15px'
          }}>
            {isMissing ? 'NOT SET' : text}
          </span>
        );
      },
    },
    {
      title: "Region",
      dataIndex: "region",
      key: "region",
      align: "center",
      width: 120,
      sorter: (a, b) => a.region?.localeCompare(b.region),
      sortOrder: sortedInfo.columnKey === "region" && sortedInfo.order,
      ...getColumnSearchProps("region"),
      render: (text) => {
        const flaggedRegions = [
          "New Brunswick", "Nova Scotia", "Prince Edward Island",
          "Newfoundland & Labrador", "Newfoundland", "Labrador",
          "Yukon", "Northwest Territories", "Nunavut",
          "Newfoundland and Labrador", "Yukon Territory"
        ];
        const isFlagged = flaggedRegions.includes(text);
        return (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <span style={{ fontSize: '15px', fontWeight: 500 }}>{text}</span>
            {isFlagged && (
              <ExclamationCircleOutlined style={{ color: "red", fontSize: 16 }} title="Remote Region" />
            )}
          </div>
        );
      },
    },
    {
      title: "Shipping or Pickup",
      dataIndex: "shipping_description",
      key: "shipping_description",
      align: "left",
      width: 110,
      sorter: (a, b) => a.shipping_description?.localeCompare(b.shipping_description),
      sortOrder: sortedInfo.columnKey === "shipping_description" && sortedInfo.order,
      ...getColumnSearchProps("shipping_description"),
      render: (text) => (
        <span style={{ fontSize: '14px', fontWeight: 500 }}>{text || "—"}</span>
      ),
    },
    {
      title: "Fraud",
      dataIndex: "weltpixel_fraud_score",
      key: "weltpixel_fraud_score",
      align: "center",
      width: 90,
      sorter: (a, b) => {
        const aScore = parseFloat(a.weltpixel_fraud_score);
        const bScore = parseFloat(b.weltpixel_fraud_score);
        return (isNaN(aScore) ? -1 : aScore) - (isNaN(bScore) ? -1 : bScore);
      },
      sortOrder: sortedInfo.columnKey === "weltpixel_fraud_score" && sortedInfo.order,
      render: (text, record) => {
        const score = parseFloat(record.weltpixel_fraud_score);
        const grandTotal = parseFloat(record.grand_total);
        const paymentSource = record.payment_method || record.method_title || "";
        const isPayPal = /paypal/i.test(paymentSource);
        const isHighFraud = !isPayPal && !isNaN(score) && score > 10;
        const isQuebecHighValue = record.region?.toLowerCase() === "quebec" && !isNaN(grandTotal) && grandTotal > 300;
        const showFraudWarning = !isPayPal && (isHighFraud || isQuebecHighValue);
        const display = text ? text : "—";

        return (
          <span style={{
            fontSize: '14px',
            color: showFraudWarning ? '#cf1322' : '#262626',
            fontWeight: showFraudWarning ? 600 : 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            {display}
            {showFraudWarning && (
              <ExclamationCircleOutlined style={{ fontSize: 12, color: '#cf1322' }} />
            )}
          </span>
        );
      },
    },
    {
      title: "Details",
      key: "details",
      align: "left",
      width: 260,
      render: (_, record) => {
        // Status tag color mapping
        const statusConfig = {
          processing: { bg: '#fff7e6', color: '#d46b08', border: '#ffd591', label: 'Processing' },
          pending: { bg: '#e6f7ff', color: '#096dd9', border: '#91d5ff', label: 'Pending' },
          pending_payment: { bg: '#fff1f0', color: '#cf1322', border: '#ffa39e', label: 'Pending Payment' },
          canceled: { bg: '#fff1f0', color: '#cf1322', border: '#ffa39e', label: 'Canceled' },
          complete: { bg: '#f6ffed', color: '#389e0d', border: '#b7eb8f', label: 'Complete' },
          closed: { bg: '#f5f5f5', color: '#595959', border: '#d9d9d9', label: 'Closed' },
          holded: { bg: '#fff2e8', color: '#d4380d', border: '#ffbb96', label: 'On Hold' },
        };
        const statusStyle = statusConfig[record.status] || { bg: '#f5f5f5', color: '#595959', border: '#d9d9d9', label: record.status };

        // Due warning
        const isDue = record.base_total_due > 0;

        // Format payment method for display
        const formatPayment = (method) => {
          if (!method) return '—';
          if (/paypal/i.test(method)) return 'PayPal';
          if (/credit|card/i.test(method)) return 'Credit Card';
          if (/check|cheque/i.test(method)) return 'Check';
          return method.length > 12 ? method.substring(0, 12) + '...' : method;
        };

        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '6px 0',
          }}>
            {/* Top Row: Status Badge + Customer Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                backgroundColor: statusStyle.bg,
                color: statusStyle.color,
                border: `1px solid ${statusStyle.border}`,
                padding: '3px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
                whiteSpace: 'nowrap',
              }}>
                {statusStyle.label}
              </span>
              <span style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#1a1a1a',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {record.customer_firstname} {record.customer_lastname?.charAt(0)}.
              </span>
            </div>

            {/* Bottom Row: Metrics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '4px',
              backgroundColor: '#fafafa',
              borderRadius: '6px',
              padding: '6px 8px',
            }}>
              {/* Payment */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <span style={{
                  fontSize: '11px',
                  color: '#8c8c8c',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  fontWeight: 500,
                }}>
                  Payment
                </span>
                <span style={{
                  fontSize: '13px',
                  color: '#262626',
                  fontWeight: 500,
                }}>
                  {formatPayment(record.method_title)}
                </span>
              </div>

              {/* Shipping */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', textAlign: 'right' }}>
                <span style={{
                  fontSize: '11px',
                  color: '#8c8c8c',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  fontWeight: 500,
                }}>
                  Shipping
                </span>
                <span style={{
                  fontSize: '13px',
                  color: '#262626',
                  fontWeight: 500,
                }}>
                  ${record.shipping_amount?.toFixed(2) || '0.00'}
                </span>
              </div>

              {/* Due */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', textAlign: 'right' }}>
                <span style={{
                  fontSize: '11px',
                  color: '#8c8c8c',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  fontWeight: 500,
                }}>
                  Due
                </span>
                <span style={{
                  fontSize: '13px',
                  color: isDue ? '#cf1322' : '#389e0d',
                  fontWeight: 600,
                }}>
                  ${record.base_total_due?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: "Total",
      dataIndex: "grand_total",
      key: "grand_total",
      align: "center",
      width: 100,
      sorter: (a, b) => a.grand_total - b.grand_total,
      sortOrder: sortedInfo.columnKey === "grand_total" && sortedInfo.order,
      ...getColumnSearchProps("grand_total"),
      render: (text, record) => {
        const currency = record.order_currency_code || 'CAD';
        return (
          <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
            <div style={{ fontWeight: 700, fontSize: '18px', color: '#1a1a1a' }}>
              ${text?.toFixed(2)}
            </div>
            <div style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>{currency}</div>
          </div>
        );
      },
    },
    {
      title: "Qty",
      dataIndex: "total_qty_ordered",
      key: "total_qty_ordered",
      align: "center",
      width: 55,
      sorter: (a, b) => a.total_qty_ordered - b.total_qty_ordered,
      sortOrder: sortedInfo.columnKey === "total_qty_ordered" && sortedInfo.order,
      render: (text) => (
        <span style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a' }}>{text}</span>
      ),
    },
    {
      title: "ETA",
      key: "email_all",
      align: "center",
      width: 80,
      render: (_, record) => {
        const to = DEFAULT_PURCHASING_EMAIL;
        const subject = buildEmailSubject(record);
        const bodyAllDS = buildBodyAll_DS(record);
        const bodyAllSto = buildBodyAll_Store(record);

        const mailtoDS = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyAllDS)}`;
        const mailtoSto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyAllSto)}`;

        return (
          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
            <Tooltip title="DropShip">
              <Button
                size="small"
                type="primary"
                icon={<SendOutlined style={{ fontSize: 14 }} />}
                href={mailtoDS}
                target="_self"
                style={{
                  backgroundColor: '#d46b08',
                  borderColor: '#d46b08',
                  color: '#fff',
                  width: 32,
                  height: 32,
                  padding: 0,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            </Tooltip>
            <Tooltip title="Ship to Store">
              <Button
                size="small"
                icon={<ShopOutlined style={{ fontSize: 14 }} />}
                href={mailtoSto}
                target="_self"
                style={{
                  width: 32,
                  height: 32,
                  padding: 0,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#1890ff',
                  borderColor: '#1890ff',
                  color: '#fff',
                }}
              />
            </Tooltip>
          </div>
        );
      },
    },
    // {
    //   title: "Actions",
    //   dataIndex: "operation",
    //   key: "operation",
    //   align: "center",
    //   render: (text, record) => {
    //     return (
    //       <>
    //         <Form.Item>
    //           <Space size="middle">
    //             <Tooltip title="Edit Order">
    //               {/* <button
    //                 className="btn btn-sm btn-outline-warning"
    //                 onClick={() => {
    //                   setEditingRow(record.key);
    //                   form.setFieldsValue({
    //                     customer_email: record.customer_email,
    //                     customer_firstname: record.customer_firstname,
    //                     customer_lastname: record.customer_lastname,
    //                     grand_total: record.grand_total,
    //                     total_qty_ordered: record.total_qty_ordered,
    //                     entity_id: record.entity_id,
    //                     created_at: record.created_at,
    //                     increment_id: record.increment_id,
    //                     status: record.status,
    //                   });
    //                 }}
    //               >
    //                 <Edit />
    //               </button> */}
    //             </Tooltip>
    //             <Tooltip title="Delete Order">
    //               <button
    //                 className="btn btn-sm btn-outline-danger"
    //                 onClick={() => handleDeleteOrder(record)}
    //               >
    //                 <Trash />
    //               </button>
    //             </Tooltip>
    //             <Tooltip title="Save changes">
    //               <button
    //                 className="btn btn-sm btn-outline-success"
    //                 onClick={handleSave}
    //               >
    //                 <Save />
    //               </button>
    //             </Tooltip>
    //             <Tooltip title="Refresh">
    //               <button
    //                 className="btn btn-sm btn-outline-info"
    //                 onClick={refreshPage}
    //               >
    //                 <Reload />
    //               </button>
    //             </Tooltip>
    //           </Space>
    //         </Form.Item>
    //       </>
    //     );
    //   },
    // },
  ];

  // loop main column data
  // const data = orders.map((order) => ({
  //   key: order.entity_id,
  //   ...order,
  // }));
  console.log("ORDERS:", orders);
console.log("TYPEOF orders:", typeof orders);
console.log("IS ARRAY?", Array.isArray(orders));


  // const data = Array.isArray(orders)
  // ? orders.map((order) => ({
  //     key: order.entity_id,
  //     ...order,
  //   }))
  // : [];

  // Data is now filtered server-side, no need for local filtering
  const data = Array.isArray(orders)
    ? orders.map((order) => ({
        key: order.entity_id,
        ...order,
      }))
    : [];

  // Metrics are now fetched from the server via loadMetrics()




  // console.log('currentSku', currentSku);
  // console.log('currentOrderProductID', currentOrderProductID);


  //drawer;
  // const showDrawer = (sku, id, price) => {
  //   setCurrentSku(sku);
  //   setCurrentOrderProductID(id);
  //   setCurrentOrderProductPrice(price);
  //   console.log("all data", sku, id, price);
  //   setOpen(true);
  // };
  const showDrawer = (sku, id, price, currency) => {
  setCurrentSku(sku);
  setCurrentOrderProductID(id);
  setCurrentOrderProductPrice(price);
  setCurrentCurrency(currency); // <-- new
  setOpen(true);
};


  const onClose = (record) => {
    console.log("record on close", record);
    setCurrentSku(null);
    setOpen(false);
    loadData(pagination.current, pagination.pageSize, filters);
  };

  const handleExpand = (expanded, record) => {
    if (expanded) {
      console.log("record", record);
      const selectedOrder = originalOrders.filter(
        (order) => order.entity_id === record.entity_id
      );
      setSelectedOrder(selectedOrder);
      setOrders(selectedOrder);
      console.log("selectedOrder", selectedOrder);
    } else {
      setOrders(originalOrders);
    }
  };

  const getTextValue = (text) => {
    setTextFromDrawer(text);
  };

  const expandedRowRender = (record) => {
    //render sub table here
    const nestedColumns = [
      // {
      //   title: "ID",
      //   dataIndex: "id",
      //   key: "id",
      //   align: "center",
      //   render: (text, record) => {
      //     if (editingRow === record.id) {
      //       return (
      //         <Form.Item
      //           name="id"
      //           rules={[
      //             {
      //               required: true,
      //               message: "id is required",
      //             },
      //           ]}
      //         >
      //           <Input disabled={true} />
      //         </Form.Item>
      //       );
      //     } else {
      //       return <p>{text}</p>;
      //     }
      //   },
      // },
      {
        title: "Image",
        dataIndex: "image",
        key: "image",
        align: "center",
        render: (text, record) => {
          console.log("record from image", record.product?.image);
          //render image here
          return (
            <>
              {record.product?.image ? (
                <img
                  src={record.product.image}
                  alt="product"
                  style={{ width: "50px", height: "50px" }}
                />
              ) : (
                <img
                  src="https://www.justjeeps.com/pub/media/catalog/product//d/v/dv8-offroad-d-jl-190052-pil-picatinny-rail-a-pillar-light-mounts-jeep-wrangler-jl-gladiator-jt-main-updated.jpg"
                  alt="product"
                  style={{ width: "50px", height: "50px" }}
                />
              )}
            </>
          );
        },
      },
      

      {
        title: "Product",
        dataIndex: "name",
        key: "name",
        align: "center",
        width: "20%",
        render: (text, record) => {
          if (editingRow === record.id) {
            return (
              <Form.Item
                name="name"
                rules={[
                  {
                    required: true,
                    message: "Product name is required",
                  },
                ]}
              >
                <Input />
              </Form.Item>
            );
          } else {
            // Create hyperlink if product URL is available
            if (record.product && record.product.url_path) {
              return (
                <a
                  href={record.product.url_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#1890ff", textDecoration: "none" }}
                >
                  {text}
                </a>
              );
            } else {
              return <p>{text}</p>;
            }
          }
        },
      },

      {
        title: "Black Friday Sale",
        dataIndex: ["product", "black_friday_sale"],
        key: "black_friday_sale",
        align: "center",
        render: (text, record) => {
          const blackFridayValue = record.product?.black_friday_sale;
          
          if (!blackFridayValue) {
            return <span style={{ color: "#999" }}>—</span>;
          }

          // Style based on discount percentage
          let bgColor = "#f0f0f0";
          let textColor = "#333";
          
          if (blackFridayValue.includes("30%off")) {
            bgColor = "#ff4d4f";
            textColor = "white";
          } else if (blackFridayValue.includes("25%off")) {
            bgColor = "#fa8c16";
            textColor = "white";
          } else if (blackFridayValue.includes("20%off")) {
            bgColor = "#faad14";
            textColor = "white";
          } else if (blackFridayValue.includes("15%off")) {
            bgColor = "#52c41a";
            textColor = "white";
          }

          return (
            <span 
              style={{ 
                backgroundColor: bgColor,
                color: textColor,
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "bold",
                display: "inline-block",
                minWidth: "60px",
                textAlign: "center"
              }}
            >
              {blackFridayValue}
            </span>
          );
        },
      },

      {
        title: "SKU",
        dataIndex: "sku",
        key: "sku",
        align: "center",
        render: (text, record) => {
          if (editingRow === record.id) {
            return (
              <Form.Item
                name="sku"
                rules={[
                  {
                    required: true,
                    message: "sku is required",
                  },
                ]}
              >
                <Input />
              </Form.Item>
            );
          } else {
            return <p>{text}</p>;
          }
        },
      },
      {
        title: "Qty",
        dataIndex: "qty_ordered",
        key: "qty_ordered",
        align: "center",
        width: 60,
        render: (text, record) => {
          if (editingRow === record.id) {
            return (
              <Form.Item
                name="qty_ordered"
                rules={[
                  {
                    required: true,
                    message: "qty is required",
                  },
                ]}
              >
                <Input />
              </Form.Item>
            );
          } else {
            return <p>{text}</p>;
          }
        },
      },

            {
        title: "Compare Vendor Costs",
        dataIndex: "operation",
        key: "operation",
        align: "center",
        width: '10%',
        render: (_, recordSub) => {
          return (
            <>
              <Form.Item>
                <Space size="small">
                  {/* <Tooltip title="Edit">
                    <EditOutlined
                      style={{ color: "orange", fontSize: "25px" }}
                      onClick={() => {
                        //use recordSub instead of record to avoid override record because we need the order key
                        setEditingRow(recordSub.id); //also need to use id, not key
                        form.setFieldsValue({
                          id: recordSub.id,
                          name: recordSub.name,
                          sku: recordSub.sku,
                          price: recordSub.price,
                          product_id: recordSub.product_id,
                          qty_ordered: recordSub.qty_ordered,
                          selected_supplier: recordSub.selected_supplier,
                          selected_supplier_cost:
                            recordSub.selected_supplier_cost,
                        });
                      }}
                    />
                  </Tooltip> */}
                  {/* <Tooltip title="Save">
                    <SaveOutlined
                      style={{ color: "green", fontSize: "25px" }}
                      onClick={() => handleSaveSub(record.key)}
                    />
                  </Tooltip> */}
                  <Tooltip title="See Vendor Costs">
                    <SearchOutlined
                      style={{
                        color: "blue",
                        fontSize: "50px",
                        cursor: "pointer",
                        margin: "0 8px",
                        transition: "transform 0.2s",

                      }}
                      onClick={() => {
                        showDrawer(
                          recordSub.sku,
                          recordSub.id,
                          recordSub.price,
                          record.order_currency_code // <-- pass currency here

                        );
                      }}
                    />
                  </Tooltip>
                  {/* <Tooltip title="Add to PO">
                    <ShoppingCartOutlined
                      style={{ color: "purple", fontSize: "25px" }}
                      onClick={() => createPurchaseOrder(recordSub)}
                    />
                  </Tooltip> */}
                </Space>
              </Form.Item>
            </>
          );
        },
      },
      {
        title: "Price",
        dataIndex: "price",
        key: "price",
        align: "center",
        render: (text, record) => {
          if (editingRow === record.id) {
            return (
              <Form.Item
                name="price"
                rules={[
                  {
                    required: true,
                    message: "price is required",
                  },
                ]}
              >
                <Input />
              </Form.Item>
            );
          } else {
            return <p>${text}</p>;
          }
        },
      },
 

      {
        title: "BIS",
        dataIndex: "shippingFreight",
        key: "shippingFreight",
        align: "center",
        render: (text, record) => {
          const shipping = record.product?.shippingFreight;
          const numericValue = parseFloat(shipping);
      
          return (
            <span>
              {!isNaN(numericValue) ? `$${numericValue.toFixed(2)}` : "—"}
            </span>
          );
        },
      },


    {
      title: "Weight (lbs)",
      dataIndex: ["product", "weight"],   // ✅ read from product
      key: "weight",
      align: "center",
      sorter: (a, b) =>
        (a.product?.weight ?? -Infinity) - (b.product?.weight ?? -Infinity),
      render: (value) => {
        if (typeof value !== "number") return "—";

        const overLimit = value >= 50;

        return (
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            {value.toFixed(2)}
            {overLimit && (
              <ExclamationCircleOutlined
                style={{ marginLeft: 6, color: "red", fontSize: 18 }}
                title="Heavy item (over 50 lbs)"
              />
            )}
          </span>
        );
      },
    },


// {
//   title: "Request ETA",
//   key: "request_eta",
//   align: "center",
//   width: "10%",
//   render: (_, recordSub) => {
//     const handleEmail = async () => {
//       // pick vendor email
//       const vendorKey = (
//         recordSub?.selected_supplier ||
//         recordSub?.vendorProduct?.vendor?.name ||
//         ""
//       ).toString().toLowerCase();
//       const to = vendorEmailMap[vendorKey] || DEFAULT_PURCHASING_EMAIL;

//       // ✅ get brand (prefer what came with the item; fallback to API)
//       const brand =
//         recordSub?.product?.brand_name ||
//         (await getBrandForSku(recordSub.sku)) ||
//         "";

//       // build subject/body with BRAND + SKU
//       const subject = buildEmailSubject(record);           // parent order
//       const body    = buildEmailBody(record, recordSub, brand);

//       // open default mail client
//       window.location.href =
//         `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
//     };

//     return (
//       <Button type="default" size="large" onClick={handleEmail}>
//         Email Vendor
//       </Button>
//     );
//   },
// },

{
  title: "Request ETA",
  key: "request_eta",
  align: "center",
  width: 90,
  render: (_, item) => {
    // parent order is the `record` that expandedRowRender closes over
    const order = record;

    // who to email
    const vendorKey = (item?.selected_supplier || item?.vendorProduct?.vendor?.name || "")
      .toString()
      .toLowerCase();
    const to = vendorEmailMap[vendorKey] || DEFAULT_PURCHASING_EMAIL;

    // brand (sync only — if you need async lookup, do it elsewhere and cache it)
    const brand = item?.product?.brand_name || "";

    // subject + bodies
    const subject   = buildEmailSubject(order);
    const bodyDS    = buildBody_DS(order, item, brand);
    const bodyStore = buildBody_Store(item, brand);

    // pre-encoded mailto URLs
    const mailtoDS    = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyDS)}`;
    const mailtoStore = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyStore)}`;

    return (
      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
        <Tooltip title="DropShip">
          <Button
            size="small"
            type="primary"
            icon={<SendOutlined style={{ fontSize: 14 }} />}
            href={mailtoDS}
            target="_self"
            style={{
              backgroundColor: '#d46b08',
              borderColor: '#d46b08',
              color: '#fff',
              width: 32,
              height: 32,
              padding: 0,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        </Tooltip>
        <Tooltip title="Ship to Store">
          <Button
            size="small"
            icon={<ShopOutlined style={{ fontSize: 14 }} />}
            href={mailtoStore}
            target="_self"
            style={{
              width: 32,
              height: 32,
              padding: 0,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#1890ff',
              borderColor: '#1890ff',
              color: '#fff',
            }}
          />
        </Tooltip>
      </div>
    );
  },
},




      



//** */
  //vendor name, cost and margin

  // {  
  //   title: 'Vendor Name',  
  //   dataIndex: 'entity_id', // or any other property that exists in the main table's data source  
  //   key: 'vendor_id',  
  //   render: (text, record) => {  
  //    console.log('Record:', record); // Log the record object to the console  
  //    const items = record.items;  
  //    console.log('Items:', items); // Log the items property to the console  
  //    return items && items.length > 0 ? (  
  //     items.map((item) => (  
  //       item.vendorProducts && item.vendorProducts.length > 0 ? (  
  //        item.vendorProducts.map((vendorProduct) => (  
  //         <div key={vendorProduct.id || vendorProduct.vendor_id}>  
  //           {vendorProduct.vendor?.name || 'No Vendor Name'}  
  //         </div>  
  //        ))  
  //       ) : (  
  //        <div>No vendor data</div>  
  //       )  
  //     ))  
  //    ) : (  
  //     <div>No items</div>  
  //    );  
  //   },  
  // },

  // //vendor name but the data is retrieved from the vendorProducts array:   useEffect(() => {
  //   const getProductBySku = async () => {
  //     try {
  //       if (searchTermSku && searchTermSku.sku) {
  //         // Add null check
  //         console.log("value", searchTermSku);
  //         await axios
  //           .get(`${BACKEND_URL}/api/products/${searchTermSku.sku}`)
  //           .then((res) => {
  //             const responseData = res.data;
  //             console.log("Data from backend by sku:", responseData);
  //             // Process the response data from backend if needed
  //             setData([responseData]);
  //           });
  //       }
  //     } catch (error) {
  //       console.error("Failed to fetch data from backend:", error);
  //     }
  //   };
  //   getProductBySku();
  // }, [searchTermSku]);

//vendor name with BACKEND_URL}/api/products/${searchTermSku.sku}



// {
//   title: 'Vendor Name',
//   key: 'vendor_name',
//   render: (record) => {
//     const vendorProducts = record.product?.vendorProducts || [];
//     return vendorProducts.length > 0 ? (
//       vendorProducts.map(vp => (
//         <div key={vp.id}>
//           {vp.vendor?.name || 'N/A'}
//         </div>
//       ))
//     ) : (
//       <div>No vendor data</div>
//     );
//   }
// }
// ,
  
//   {
//     title: 'Vendor Cost',
//     dataIndex: 'vendorProducts',
//     key: 'vendor_cost',
//     render: (_, record) => {

//       const { vendorProducts } = record;
//       console.log('Record: vendor cost', record);  // Log for debug
//       if (!vendorProducts || vendorProducts.length === 0) return <div>No vendor data</div>;
  
//       return vendorProducts.map((vendorProduct) => {
//         const { vendor_cost } = vendorProduct;
//         return <div key={vendorProduct.vendor_id || vendorProduct.id}>{vendor_cost ? `$${vendor_cost.toFixed(2)}` : 'N/A'}</div>;
//       });
//     }
//   },
  
//   {
//     title: 'Margin %',
//     key: 'margin',
//     render: (record) => {
//       const { price, vendorProducts } = record;
//       console.log('Price:', price, 'Vendor Products:', vendorProducts);  // Log for debug
//       if (!vendorProducts || vendorProducts.length === 0) return <div>No margin data</div>;
  
//       return vendorProducts.map((vendorProduct) => {
//         const { vendor_cost } = vendorProduct;
//         if (price && vendor_cost) {
//           const margin = ((price - vendor_cost) / price) * 100;
//           return <div key={vendorProduct.vendor_id || vendorProduct.id}>{`${margin.toFixed(2)}%`}</div>;
//         } else {
//           return <div key={vendorProduct.vendor_id || vendorProduct.id}>Margin data unavailable</div>;
//         }
//       });
//     },
//   },



      // {
      //   title: "Supplier",
      //   dataIndex: "selected_supplier",
      //   key: "selected_supplier",
      //   align: "center",
      //   render: (text, record) => {
      //     if (editingRow === record.id) {
      //       return (
      //         <Form.Item
      //           name="selected_supplier"
      //           rules={[
      //             {
      //               required: true,
      //               message: "supplier is required",
      //             },
      //           ]}
      //         >
      //           <Select placeholder="Select a supplier">
      //             <Option value="Keystone">Keystone</Option>
      //             <Option value="Meyer">Meyer</Option>
      //             <Option value="Omix">Omix</Option>
      //             <Option value="Quadratec">Quaddratec</Option>
      //           </Select>
      //         </Form.Item>
      //       );
      //     } else {
      //       return <p>{text}</p>;
      //     }
      //   },
      // },
      // {
      //   title: "SupplierCost",
      //   dataIndex: "selected_supplier_cost",
      //   key: "selected_supplier_cost",
      //   align: "center",
      //   render: (text, record) => {
      //     if (editingRow === record.id) {
      //       return (
      //         <Form.Item
      //           name="selected_supplier_cost"
      //           rules={[
      //             {
      //               required: true,
      //               message: "selected_supplier_cost is required",
      //             },
      //           ]}
      //         >
      //           <Input />
      //         </Form.Item>
      //       );
      //     } else {
      //       return <p>${text}</p>;
      //     }
      //   },
      // },
      // {
      //   title: "TotalCost",
      //   dataIndex: "total",
      //   key: "total",
      //   align: "center",
      //   render: (text, record) => {
      //     return <p>${record.qty_ordered * record.selected_supplier_cost}</p>;
      //   },
      // },
      // {
      //   title: "Margin%",
      //   key: "margin",
      //   align: "center",
      //   render: (text, record) => {
      //     const cost = record.selected_supplier_cost;
      //     const price = record.price;
      //     if (cost && price) {
      //       const margin = ((price - cost) / price) * 100;
      //       return <span>{margin.toFixed(2)}%</span>;
      //     } else {
      //       return <span></span>;
      //     }
      //   },
      // },
      // {
      //   title: "Status",
      //   dataIndex: "status",
      //   key: "status",
      //   align: "center",
      //   render: (text, record) => {
      //     if (editingRow === record.id) {
      //       return (
      //         <Form.Item
      //           name="status"
      //           rules={[
      //             {
      //               required: true,
      //               message: "status is required",
      //             },
      //           ]}
      //         >
      //           <Select placeholder="Update Status">
      //             <Option value="Completed">
      //               <Badge status="success" text="Completed" />
      //             </Option>
      //             <Option value="No Stock">
      //               <Badge status="warning" text="No Stock" />
      //             </Option>
      //             <Option value="PO Created">
      //               <Badge status="processing" text="PO Created" />
      //             </Option>
      //             <Option value="Cancel">
      //               <Badge status="error" text="Cancel" />
      //             </Option>
      //           </Select>
      //         </Form.Item>
      //       );
      //     } else {
      //       return <p>{text}</p>;
      //     }
      //   },
      // },

    ];
    const total_cost = record.items?.reduce(
      (acc, record) => acc + record.qty_ordered * record.selected_supplier_cost,
      0
    );
    const total_price = record.items?.reduce(
      (acc, record) => acc + record.price * record.qty_ordered,
      0
    );
    return (
      <Table
        columns={nestedColumns}
        dataSource={record.items}
        pagination={false}
        size="large"
        footer={() => (
          <span
            style={{
              fontWeight: "bold",
              display: "inline-block",
              textAlign: "right",
              width: "100%",
              fontSize: "1.2rem",
            }}
          >
            {/* Total Sales : ${total_price?.toFixed(2)} <br />
            Total Cost : ${total_cost?.toFixed(2)} <br />
            Total Margin :{" "}
            {(((total_price - total_cost) / total_price) * 100).toFixed(2)}% */}
          </span>
        )}
      />
    );
  };

  return (
    <>

      <div className="container-fluid" style={{ maxWidth: '100%' }}>
        <div className="container-xl" style={{ maxWidth: '100%', padding: '0 15px' }}>
          <div className="container mb-3" 
            style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px', marginTop: '5px' }}>  

            <Button 
              type="primary" 
              onClick={handleSeedOrders}
              size="large"
              style={{ 
                backgroundColor: "#dc3545",
                borderColor: "white",
                color: "white",
                fontSize: "1.5rem",
                fontWeight: "600",
                borderRadius: "5px",
                height: "60px",         // ✅ slightly taller to match card height
                width: "200px",
              }}
            >
              Update Orders
            </Button>

            <div style={{ flex: 1 }}>
              <TableTop
                orderCount={metrics.totalCount}
                notSetCount={metrics.notSetCount}
                todayCount={metrics.todayCount}
                yesterdayCount={metrics.yesterdayCount}
                last7DaysCount={metrics.last7DaysCount}
                onNotSetClick={() => handleFilterChange('poStatus', filters.poStatus === 'not_set' ? '' : 'not_set')}
                onPmClick={() => handleFilterChange('poStatus', filters.poStatus === 'partial' ? '' : 'partial')}
                onTodayClick={() => handleFilterChange('dateFilter', filters.dateFilter === 'today' ? '' : 'today')}
                onYesterdayClick={() => handleFilterChange('dateFilter', filters.dateFilter === 'yesterday' ? '' : 'yesterday')}
                onLast7DaysClick={() => handleFilterChange('dateFilter', filters.dateFilter === 'last7days' ? '' : 'last7days')}
                activeDateFilter={filters.dateFilter}
                gwCount={metrics.gwCount}
                pmCount={metrics.pmNotSetCount}
                loading={metricsLoading}
              />
            </div>
          </div>

          {/* Filter Row */}
          <Card
            size="small"
            style={{ marginBottom: 16, backgroundColor: '#fafafa' }}
            bodyStyle={{ padding: '12px 16px' }}
          >
            <Row gutter={[16, 12]} align="middle">
              {/* Filter Mode Toggle */}
              <Col xs={24} sm={12} md={4} lg={3}>
                <Segmented
                  options={[
                    { label: 'Order', value: 'order' },
                    { label: 'Items', value: 'items' },
                  ]}
                  value={filters.filterMode}
                  onChange={(value) => {
                    // Clear search and vendor when switching modes
                    setFilters(prev => ({
                      ...prev,
                      filterMode: value,
                      search: '',
                      vendor: '',
                    }));
                  }}
                  style={{ width: '100%' }}
                />
              </Col>

              <Col xs={24} sm={12} md={6} lg={4}>
                <Input.Search
                  placeholder={filters.filterMode === 'items' ? "Search by SKU or product..." : "Search orders..."}
                  allowClear
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  onSearch={(value) => handleFilterChange('search', value)}
                  style={{ width: '100%' }}
                />
              </Col>

              <Col xs={12} sm={6} md={4} lg={3}>
                <Select
                  placeholder="Status"
                  allowClear
                  value={filters.status || undefined}
                  onChange={(value) => handleFilterChange('status', value || '')}
                  style={{ width: '100%' }}
                >
                  <Select.Option value="pending">
                    <Tag color="blue">PENDING</Tag>
                  </Select.Option>
                  <Select.Option value="processing">
                    <Tag color="orange">PROCESSING</Tag>
                  </Select.Option>
                  <Select.Option value="complete">
                    <Tag color="green">COMPLETE</Tag>
                  </Select.Option>
                  <Select.Option value="canceled">
                    <Tag color="volcano">CANCELED</Tag>
                  </Select.Option>
                </Select>
              </Col>

              <Col xs={12} sm={6} md={4} lg={3}>
                <Select
                  placeholder="PO Status"
                  allowClear
                  value={filters.poStatus || undefined}
                  onChange={(value) => handleFilterChange('poStatus', value || '')}
                  style={{ width: '100%' }}
                >
                  <Select.Option value="not_set">
                    <span style={{ color: 'red' }}>Not Set</span>
                  </Select.Option>
                  <Select.Option value="partial">
                    <span style={{ color: '#faad14' }}>Partial</span>
                  </Select.Option>
                  <Select.Option value="set">
                    <span style={{ color: 'green' }}>Set</span>
                  </Select.Option>
                </Select>
              </Col>

              <Col xs={12} sm={6} md={4} lg={3}>
                <Select
                  placeholder="Region"
                  allowClear
                  showSearch
                  value={filters.region || undefined}
                  onChange={(value) => handleFilterChange('region', value || '')}
                  style={{ width: '100%' }}
                  filterOption={(input, option) =>
                    option.children.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  <Select.Option value="Ontario">Ontario</Select.Option>
                  <Select.Option value="Quebec">Quebec</Select.Option>
                  <Select.Option value="British Columbia">British Columbia</Select.Option>
                  <Select.Option value="Alberta">Alberta</Select.Option>
                  <Select.Option value="Manitoba">Manitoba</Select.Option>
                  <Select.Option value="Saskatchewan">Saskatchewan</Select.Option>
                  <Select.Option value="Nova Scotia">Nova Scotia</Select.Option>
                  <Select.Option value="New Brunswick">New Brunswick</Select.Option>
                  <Select.Option value="Newfoundland and Labrador">Newfoundland & Labrador</Select.Option>
                  <Select.Option value="Prince Edward Island">Prince Edward Island</Select.Option>
                  <Select.Option value="Northwest Territories">Northwest Territories</Select.Option>
                  <Select.Option value="Yukon">Yukon</Select.Option>
                  <Select.Option value="Nunavut">Nunavut</Select.Option>
                </Select>
              </Col>

              {/* Vendor dropdown - only visible in Items mode */}
              {filters.filterMode === 'items' && (
                <Col xs={12} sm={6} md={4} lg={3}>
                  <Select
                    placeholder="Vendor"
                    allowClear
                    showSearch
                    value={filters.vendor || undefined}
                    onChange={(value) => handleFilterChange('vendor', value || '')}
                    style={{ width: '100%' }}
                    filterOption={(input, option) =>
                      option.children.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {vendors.map((vendor) => (
                      <Select.Option key={vendor.id} value={vendor.name}>
                        {vendor.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
              )}

              <Col xs={12} sm={6} md={4} lg={3}>
                <Space>
                  <Button
                    icon={<ClearOutlined />}
                    onClick={handleClearFilters}
                  >
                    Clear
                  </Button>
                  <Button
                    type="primary"
                    icon={<ReloadOutlined />}
                    onClick={() => loadData(1, pagination.pageSize, filters)}
                  >
                    Refresh
                  </Button>
                </Space>
              </Col>

              <Col xs={24} sm={12} md={6} lg={8} style={{ textAlign: 'right' }}>
                <Space>
                  <FilterOutlined style={{ color: '#1890ff' }} />
                  <span style={{ color: '#666' }}>
                    Showing {orders.length} of {pagination.total} orders
                    {filters.filterMode === 'items' && <Tag color="cyan" style={{ marginLeft: 8 }}>ITEMS MODE</Tag>}
                    {filters.status && <Tag color="blue" style={{ marginLeft: 4 }}>{filters.status.toUpperCase()}</Tag>}
                    {filters.poStatus && <Tag color="orange" style={{ marginLeft: 4 }}>{filters.poStatus.replace('_', ' ').toUpperCase()}</Tag>}
                    {filters.region && <Tag color="purple" style={{ marginLeft: 4 }}>{filters.region}</Tag>}
                    {filters.vendor && <Tag color="green" style={{ marginLeft: 4 }}>{filters.vendor}</Tag>}
                    {filters.dateFilter && <Tag color="geekblue" style={{ marginLeft: 4 }}>{filters.dateFilter.toUpperCase()}</Tag>}
                  </span>
                </Space>
              </Col>
            </Row>
          </Card>



          <div className="table-wrapper" style={{ width: '100%', overflowX: 'auto' }}>

          <Form form={form}>
            <Table
              columns={columns}
              expandable={{ expandedRowRender }} //, onExpand: handleExpand remove expandable
              dataSource={data}
              bordered
              scroll={{ x: 1100 }}
              rowKey={(record) => record.id}
              onChange={handleTableChange}
              size="small"
              loading={loading}
              rowClassName={(record, index) => index % 2 === 0 ? 'zebra-row-even' : 'zebra-row-odd'}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                pageSizeOptions: ['10', '25', '50', '100', '200'],
                defaultPageSize: 25,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} orders`,
                itemRender: (page, type, originalElement) => {
                  if (type === "prev") {
                    return <span style={{ padding: '0 4px' }}>← Prev</span>;
                  } else if (type === "next") {
                    return <span style={{ padding: '0 4px' }}>Next →</span>;
                  }
                  return originalElement;
                },
                position: ["topRight"],
              }}
              onRow={(record, rowIndex) => {
                return {
                  onClick: () => {
                    setCurrentOrderProductID(record.id);
                    setCurrentSku(record.sku);
                    setCurrentOrderProductPrice(record.price);
                    setCurrentCurrency(record.currency); // ✅ add this line
                  },
                };
              }}
              // onRow={(record, rowIndex) => {
              //   return {
              //     onClick: (event) => {
              //       setCurrentOrderProductID(record.id);
              //       setCurrentSku(record.sku);
              //       setCurrentOrderProductPrice(record.price);
              //     },
              //   };
              // }
            
            />
          </Form>
          </div>


        </div>
        <div id="footer">© 2023, JustJeeps.com, Inc. All Rights Reserved</div>
      </div>
      {open && (
        <Popup
          placement={placement}
          onClose={onClose}
          sku={currentSku}
          orderProductId={currentOrderProductID}
          orderProductPrice={currentOrderProductPrice}
          currency={currentCurrency} // ✅ Add this line

        />
      )}
    </>
  );
};

export default OrderTable;
