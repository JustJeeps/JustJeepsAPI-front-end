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
  InputNumber,
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
  const [seedingType, setSeedingType] = useState(null);
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
  const [currentOrderIncrementId, setCurrentOrderIncrementId] = useState(null);
  // Simulated extra charge for margin simulation
  const [simulatedExtraCharge, setSimulatedExtraCharge] = useState(0);
  const { Option } = Select;
  const [selectedOrder, setSelectedOrder] = useState(null);

  // State to manage the current order's currency
  const [currentCurrency, setCurrentCurrency] = useState(null);
  const [showNotSetOnly, setShowNotSetOnly] = useState(false);
  const [showPmOnly, setShowPmOnly] = useState(false);

  // Pagination state for server-side pagination
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 250,
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
    exclude: '', // Exclude keywords for global search
  });

  // Vendors list for dropdown
  const [vendors, setVendors] = useState([]);

  // Metrics state (independent of pagination)
  const [metrics, setMetrics] = useState({
    notSetCount: 0,
    staleNotSetCount: 0,
    todayCount: 0,
    yesterdayCount: 0,
    last7DaysCount: 0,
    pmNotSetCount: 0,
    kdNotSetCount: 0,
    gwCount: 0,
    totalCount: 0,
  });
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [orderShippingCosts, setOrderShippingCosts] = useState({});
  const [unitCostEdits, setUnitCostEdits] = useState({});
  const [savingUnitCost, setSavingUnitCost] = useState({});
  const [textFromDrawer, setTextFromDrawer] = useState("");
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const seedPollRef = useRef(null);
  const seedPollCountRef = useRef(0);
  const isSeeding = seedingType !== null;




  const API_URL = import.meta.env.VITE_API_URL;

  const getOrderRowKey = (record) => record.entity_id || record.id || record.key;

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

const parseMoney = (value) => {
  const numericValue = parseFloat(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const getOrderSubtotalValue = (order) => {
  const directSubtotal = parseFloat(order?.subtotal);
  if (Number.isFinite(directSubtotal)) return directSubtotal;

  const itemsSubtotal = (order?.items || []).reduce((acc, item) => {
    const basePrice = parseMoney(item?.base_price);
    const quantity = parseMoney(item?.qty_ordered);
    return acc + basePrice * quantity;
  }, 0);

  return itemsSubtotal > 0 ? itemsSubtotal : null;
};

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const getUnitCost = (item) => {
  if (hasOwn(unitCostEdits, item?.id)) {
    return parseMoney(unitCostEdits[item.id]);
  }

  const fromSelectedSupplier = parseMoney(item?.selected_supplier_cost);
  if (fromSelectedSupplier > 0) return fromSelectedSupplier;

  const fromVendorProduct = parseMoney(item?.vendorProduct?.vendor_cost);
  if (fromVendorProduct > 0) return fromVendorProduct;

  const fromProduct = parseMoney(item?.product?.cost);
  return fromProduct;
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

  return (
`Could you please confirm the following for the item(s) below:

${line}

Please provide:

ETA:
Unit cost:
Shipping cost:

Ship to:
${buildShipToBlock(order)}

Thank you,

`
  );
};

// DS template (with Ship to:)
const buildBody_DS = (order, item, brand = "") => {
  const line = buildItemLine(item, brand);
  return (
`Could you please confirm the following for the item(s) below:

${line}

Please provide:

ETA:
Unit cost:
Shipping cost:

Ship to:
${buildShipToBlock(order)}

Thank you,

`
  );
};

// Ship-to-Store template (short & simple, no address)
const buildBody_Store = (item, brand = "") => {
  const line = buildItemLine(item, brand);
  return (
`Could you please confirm the ETA and unit cost for the item below?

${line}

Thank you,

`
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
`Could you please confirm the following for the item(s) below:

${buildAllItemLines(order)}

Please provide:

ETA:
Unit cost:
Shipping cost:

Ship to:
${buildShipToBlock(order)}

Thank you,

`
);

// Ship-to-Store template (all items, short)
const buildBodyAll_Store = (order) => (
`Could you please confirm the ETA and unit cost for the item(s) below?

${buildAllItemLines(order)}

Thank you,

`
);

const buildBinCheckProductLines = (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (!items.length) return "—";

  return items
    .map((item) => {
      const sku = item?.sku || "—";
      const name = item?.name || item?.product?.name || "—";
      return `${sku}: ${name}`;
    })
    .join("\n");
};

const buildBinCheckBody = (order) => {
  const fraudScore = order?.weltpixel_fraud_score ?? "—";
  const subtotalValue = getOrderSubtotalValue(order);
  const orderTotal = subtotalValue === null ? "—" : `$${subtotalValue.toFixed(2)}`;
  const region = order?.region || "—";
  const customerName = [order?.customer_firstname, order?.customer_lastname]
    .filter(Boolean)
    .join(" ") || "—";
  const customerEmail = order?.customer_email || "—";
  const customerPhone =
    order?.shipping_telephone ||
    order?.telephone ||
    order?.billing_telephone ||
    "—";
  const products = buildBinCheckProductLines(order);

  return (
`Hi Jacob,

Could you please confirm whether you'd like me to run a BIN check on this order, or should I go ahead and proceed?

FRAUD SCORE: ${fraudScore}
ORDER TOTAL: ${orderTotal}
REGION: ${region}
CUSTOMER: ${customerName}
EMAIL: ${customerEmail}
PHONE: ${customerPhone}

PRODUCTS:
${products}

Thank you!

`

  );
};

const buildShippingQuoteItems = (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (!items.length) return "—";

  return items
    .map((item) => {
      const qty = Number(item?.qty_ordered ?? 1);
      const sku = item?.sku || "—";
      return `${qty} x ${sku}`;
    })
    .join("\n");
};

const buildShippingQuoteBody = (order) => {
  const items = buildShippingQuoteItems(order);
  const shipTo = buildShipToBlock(order);
  const email = order?.customer_email || "—";

  return (
`Hi Anthony,

Could you please provide the shipping cost for:
${items}

Ship to:

${shipTo}
Email: ${email}

Thank you!

`
  );
};




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

  useEffect(() => {
    return () => {
      if (seedPollRef.current) {
        clearInterval(seedPollRef.current);
        seedPollRef.current = null;
      }
    };
  }, []);

  //load all data with pagination and filters
  const loadData = useCallback(async (page = 1, pageSize = 25, currentFilters = filters) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
        ...(currentFilters.filterMode && { filterMode: currentFilters.filterMode }),
        ...(currentFilters.status && { status: currentFilters.status }),
        ...(currentFilters.poStatus && { poStatus: currentFilters.poStatus }),
        ...(currentFilters.region && { region: currentFilters.region }),
        ...(currentFilters.vendor && { vendor: currentFilters.vendor }),
        ...(currentFilters.dateFilter && { dateFilter: currentFilters.dateFilter }),
        ...(currentFilters.search && { search: currentFilters.search }),
        ...(currentFilters.exclude && { exclude: currentFilters.exclude }),
      };

      const response = await axios.get(`${API_URL}/api/orders`, { params });

      // All filtering is now server-side
      let ordersData = response.data.data || response.data;
      const paginationData = response.data.pagination;

      setOriginalOrders(ordersData);
      setOrders(ordersData);
      if (ordersData && ordersData.length) {
        console.log('First order from API:', ordersData[0]);
      } else {
        console.log('No orders returned from API');
      }

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
  const handleSeedOrders = async (limit = 200) => {
    if (isSeeding) return;

    const pollIntervalMs = 2500;
    const maxPollAttempts = 12;

    const stopPolling = () => {
      if (seedPollRef.current) {
        clearInterval(seedPollRef.current);
        seedPollRef.current = null;
      }
      seedPollCountRef.current = 0;
      setSeedingType(null);
    };

    const startPolling = () => {
      if (seedPollRef.current) {
        clearInterval(seedPollRef.current);
      }
      seedPollCountRef.current = 0;
      seedPollRef.current = setInterval(() => {
        seedPollCountRef.current += 1;
        loadData(pagination.current, pagination.pageSize, filters);
        loadMetrics();

        if (seedPollCountRef.current >= maxPollAttempts) {
          stopPolling();
        }
      }, pollIntervalMs);
    };

    setLoading(true);
    setSeedingType("orders");
    try {
      await axios.get(`${API_URL}/api/seed-orders`, { params: { limit } });
      startPolling();
    } catch (error) {
      console.error(error);
      stopPolling();
    } finally {
      setLoading(false);
    }
  };

  const handleSeedOrdersAll = async () => {
    if (isSeeding) return;

    const pollIntervalMs = 2500;
    const maxPollAttempts = 12;

    const stopPolling = () => {
      if (seedPollRef.current) {
        clearInterval(seedPollRef.current);
        seedPollRef.current = null;
      }
      seedPollCountRef.current = 0;
      setSeedingType(null);
    };

    const startPolling = () => {
      if (seedPollRef.current) {
        clearInterval(seedPollRef.current);
      }
      seedPollCountRef.current = 0;
      seedPollRef.current = setInterval(() => {
        seedPollCountRef.current += 1;
        loadData(pagination.current, pagination.pageSize, filters);
        loadMetrics();

        if (seedPollCountRef.current >= maxPollAttempts) {
          stopPolling();
        }
      }, pollIntervalMs);
    };

    setLoading(true);
    setSeedingType("orders-all");
    try {
      await axios.get(`${API_URL}/api/seed-orders-all`);
      startPolling();
    } catch (error) {
      console.error(error);
      stopPolling();
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

  const updateItemUnitCostInState = (itemId, nextCost, nextSupplier = null, hasSupplierUpdate = false) => {
    const applyToOrders = (ordersState) => {
      if (!Array.isArray(ordersState)) return ordersState;

      return ordersState.map((order) => ({
        ...order,
        items: (order.items || []).map((item) =>
          item.id === itemId
            ? {
                ...item,
                selected_supplier_cost: nextCost,
                ...(hasSupplierUpdate ? { selected_supplier: nextSupplier } : {}),
              }
            : item
        ),
      }));
    };

    setOrders((prev) => applyToOrders(prev));
    setOriginalOrders((prev) => applyToOrders(prev));
  };

  const normalizeUnitCostForApi = (value) => {
    if (value === null || value === undefined || value === "") return null;

    const numericValue = parseFloat(value);
    if (!Number.isFinite(numericValue)) return null;

    return numericValue.toFixed(2);
  };

  const persistUnitCost = async (item, nextCost, nextSupplier = null, hasSupplierUpdate = false) => {
    setSavingUnitCost((prev) => ({ ...prev, [item.id]: true }));

    try {
      const payload = {
        selected_supplier: hasSupplierUpdate ? nextSupplier : item?.selected_supplier,
        selected_supplier_cost: normalizeUnitCostForApi(nextCost),
      };

      const { data: updatedItem } = await axios.post(`${API_URL}/order_products/${item.id}/edit/selected_supplier`, payload);

      updateItemUnitCostInState(
        item.id,
        updatedItem?.selected_supplier_cost ?? payload.selected_supplier_cost,
        updatedItem?.selected_supplier ?? payload.selected_supplier,
        hasSupplierUpdate
      );
      setUnitCostEdits((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
    } catch (error) {
      console.error("Failed to update unit cost:", error);
      Modal.error({
        title: "Could not save unit cost",
        content: "Please try again. If the issue continues, refresh the page and retry.",
      });
    } finally {
      setSavingUnitCost((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const handleSaveUnitCost = (item) => {
    const hasDraft = hasOwn(unitCostEdits, item.id);
    if (!hasDraft) return;

    const draftRaw = unitCostEdits[item.id];
    const nextCost = draftRaw === null || draftRaw === undefined || draftRaw === ""
      ? null
      : parseMoney(draftRaw);

    persistUnitCost(item, nextCost);
  };

  const handleRemoveUnitCost = (item) => {
    persistUnitCost(item, null, null, true);
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
    onFilter: (value, record) => {
      if (!value) return true;
      const keywords = value.toLowerCase().split(/\s+/).filter(Boolean);
      // Special handling for PO# column: search in custom_po_number only
      if (dataIndex === 'custom_po_number') {
        // Normalize PO# value: remove extra spaces, lowercase
        const field = (record.custom_po_number || '').replace(/\s+/g, ' ').trim().toLowerCase();
        // Match if all keywords are present anywhere, in any order
        return keywords.every((kw) => field.includes(kw));
      }
      // Default: search in the specified column
      const field = record[dataIndex]?.toString().toLowerCase() || "";
      return keywords.every((kw) => field.includes(kw));
    },
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
    // {
    //   title: "Order Note",
    //   dataIndex: "custom_order_note",
    //   key: "custom_order_note",
    //   align: "center",
    //   width: 160,
    //   ...getColumnSearchProps("custom_order_note"),
    //   render: (text) => (
    //     <span style={{ fontSize: '14px', color: text ? '#1a1a1a' : '#888' }}>{text || '—'}</span>
    //   ),
    // // },
    // {
    //   title: "Ship Status",
    //   dataIndex: "custom_ship_status",
    //   key: "custom_ship_status",
    //   align: "center",
    //   width: 120,
    //   ...getColumnSearchProps("custom_ship_status"),
    //   render: (text) => (
    //     <span style={{ fontSize: '14px', color: text ? '#1a1a1a' : '#888' }}>{text || '—'}</span>
    //   ),cd
    // },
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
      title: "Sales Rep",
      dataIndex: "sales_rep",
      key: "sales_rep",
      align: "center",
      width: 70,
      sorter: (a, b) => (a.sales_rep || "").localeCompare(b.sales_rep || ""),
      sortOrder: sortedInfo.columnKey === "sales_rep" && sortedInfo.order,
      ...getColumnSearchProps("sales_rep"),
      render: (text) => (
        <span style={{ fontSize: '14px', fontWeight: 500 }}>{text || "—"}</span>
      ),
    },
    {
      title: "Region",
      dataIndex: "region",
      key: "region",
      align: "center",
      width: 100,
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
      title: "Subtotal",
      dataIndex: "subtotal",
      key: "subtotal",
      align: "center",
      width: 100,
      sorter: (a, b) => parseMoney(getOrderSubtotalValue(a)) - parseMoney(getOrderSubtotalValue(b)),
      sortOrder: sortedInfo.columnKey === "subtotal" && sortedInfo.order,
      render: (_, record) => {
        const currency = record.order_currency_code || 'CAD';
        const displayValue = getOrderSubtotalValue(record);
        return (
          <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
            <div style={{ fontWeight: 700, fontSize: '18px', color: '#1a1a1a' }}>
              {displayValue === null ? '—' : `$${displayValue.toFixed(2)}`}
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
      width: 150,
      render: (_, record) => {
        const to = DEFAULT_PURCHASING_EMAIL;
        const subject = buildEmailSubject(record);
        const bodyAllDS = buildBodyAll_DS(record);
        const bodyAllSto = buildBodyAll_Store(record);
        const binTo = "jkemper@justjeeps.com";
        const binSubject = `Order ${record?.increment_id || ""} - BIN check`;
        const binBody = buildBinCheckBody(record);
        const shippingTo = "asmith@justjeeps.com,jkemper@justjeeps.com";
        const shippingSubject = `Order ${record?.increment_id || ""} - Shipping quote`;
        const shippingBody = buildShippingQuoteBody(record);

        const mailtoDS = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyAllDS)}`;
        const mailtoSto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyAllSto)}`;
        const mailtoBin = `mailto:${binTo}?subject=${encodeURIComponent(binSubject)}&body=${encodeURIComponent(binBody)}`;
        const mailtoShipping = `mailto:${shippingTo}?subject=${encodeURIComponent(shippingSubject)}&body=${encodeURIComponent(shippingBody)}`;

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
            <Tooltip title="BIN check">
              <Button
                size="small"
                icon={<QuestionCircleOutlined style={{ fontSize: 14 }} />}
                href={mailtoBin}
                target="_self"
                style={{
                  width: 32,
                  height: 32,
                  padding: 0,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#595959',
                  borderColor: '#595959',
                  color: '#fff',
                }}
              />
            </Tooltip>
            <Tooltip title="Shipping quote">
              <Button
                size="small"
                icon={<GlobalOutlined style={{ fontSize: 14 }} />}
                href={mailtoShipping}
                target="_self"
                style={{
                  width: 32,
                  height: 32,
                  padding: 0,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#096dd9',
                  borderColor: '#096dd9',
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

  // Expand mode toggle: 'single' (only one expanded at a time) or 'multi' (multiple allowed)
  const [expandMode, setExpandMode] = useState('multi'); // 'single' or 'multi'

  // Only filter visibleData in 'single' mode
  const visibleData =
    expandMode === 'single' && expandedRowKeys.length === 1
      ? data.filter((row) => getOrderRowKey(row) === expandedRowKeys[0])
      : data;

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

  const handlePopupVendorCostSelect = useCallback((orderProductId, selectedCost, selectedSupplier) => {
    if (!orderProductId) return;
    const normalizedCost = parseMoney(selectedCost);
    updateItemUnitCostInState(orderProductId, normalizedCost, selectedSupplier, true);
    setUnitCostEdits((prev) => {
      const copy = { ...prev };
      delete copy[orderProductId];
      return copy;
    });
  }, []);


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
    const items = Array.isArray(record?.items) ? record.items : [];

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

      // {
      //   title: "Black Friday Sale",
      //   dataIndex: ["product", "black_friday_sale"],
      //   key: "black_friday_sale",
      //   align: "center",
      //   render: (text, record) => {
      //     const blackFridayValue = record.product?.black_friday_sale;
          
      //     if (!blackFridayValue) {
      //       return <span style={{ color: "#999" }}>—</span>;
      //     }

      //     // Style based on discount percentage
      //     let bgColor = "#f0f0f0";
      //     let textColor = "#333";
          
      //     if (blackFridayValue.includes("30%off")) {
      //       bgColor = "#ff4d4f";
      //       textColor = "white";
      //     } else if (blackFridayValue.includes("25%off")) {
      //       bgColor = "#fa8c16";
      //       textColor = "white";
      //     } else if (blackFridayValue.includes("20%off")) {
      //       bgColor = "#faad14";
      //       textColor = "white";
      //     } else if (blackFridayValue.includes("15%off")) {
      //       bgColor = "#52c41a";
      //       textColor = "white";
      //     }

      //     return (
      //       <span 
      //         style={{ 
      //           backgroundColor: bgColor,
      //           color: textColor,
      //           padding: "6px 12px",
      //           borderRadius: "6px",
      //           fontSize: "14px",
      //           fontWeight: "bold",
      //           display: "inline-block",
      //           minWidth: "60px",
      //           textAlign: "center"
      //         }}
      //       >
      //         {blackFridayValue}
      //       </span>
      //     );
      //   },
      // },

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
        title: "BIS",
        dataIndex: "shippingFreight",
        key: "shippingFreight",
        align: "center",
        width: 100,
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
      width: 100,

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
                        setCurrentOrderIncrementId(record.increment_id);
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
        title: "Unit Cost",
        key: "unit_cost",
        align: "center",
        width: 220,
        render: (_, item) => {
          const currentStoredCost = parseFloat(item?.selected_supplier_cost);
          const costValue = hasOwn(unitCostEdits, item.id)
            ? unitCostEdits[item.id]
            : Number.isFinite(currentStoredCost)
              ? currentStoredCost
              : null;
          const selectedSupplierName = item?.selected_supplier;
          const hasDraft = hasOwn(unitCostEdits, item.id);
          const loadingRow = !!savingUnitCost[item.id];

          return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <Space size={6}>
                <InputNumber
                  min={0}
                  precision={2}
                  step={1}
                  placeholder="0.00"
                  value={costValue}
                  onChange={(value) =>
                    setUnitCostEdits((prev) => ({
                      ...prev,
                      [item.id]: value,
                    }))
                  }
                  style={{ width: 92 }}
                />
                <Button
                  size="small"
                  type="primary"
                  icon={<SaveOutlined />}
                  disabled={!hasDraft}
                  loading={loadingRow}
                  onClick={() => handleSaveUnitCost(item)}
                />
                <Button
                  size="small"
                  danger
                  loading={loadingRow}
                  onClick={() => handleRemoveUnitCost(item)}
                  style={{ minWidth: 28, padding: "0 6px" }}
                >
                  X
                </Button>
              </Space>
              {selectedSupplierName ? (
                <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
                  {selectedSupplierName}
                </Tag>
              ) : null}
            </div>
          );
        },
      },
      {
        title: "Total Cost",
        key: "line_cost",
        align: "center",
        width: 110,
        render: (_, item) => {
          const unitCost = getUnitCost(item);
          const qty = parseMoney(item?.qty_ordered);
          const lineCost = unitCost * qty;

          return (
            <span style={{ color: unitCost > 0 ? "#262626" : "#cf1322", fontWeight: 600 }}>
              {unitCost > 0 ? `$${lineCost.toFixed(2)}` : "Not Set"}
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
    const total_cost = items.reduce((acc, item) => {
      const qty = parseMoney(item?.qty_ordered);
      return acc + qty * getUnitCost(item);
    }, 0);
    const total_price = items.reduce(
      (acc, record) => acc + record.price * record.qty_ordered,
      0
    );
    const subtotalRevenue = parseMoney(getOrderSubtotalValue(record));
    const shippingRevenue = parseMoney(record?.shipping_amount);
    const inferredTaxFromItems = Number(
      items
        .reduce((acc, item) => {
          const qty = parseMoney(item?.qty_ordered);
          const priceExTax = parseFloat(item?.price ?? item?.base_price);
          const priceIncTax = parseFloat(
            item?.price_incl_tax ?? item?.base_price_incl_tax
          );

          if (!Number.isFinite(priceExTax) || !Number.isFinite(priceIncTax)) {
            return acc;
          }

          const unitTax = priceIncTax - priceExTax;
          return acc + (unitTax > 0 ? unitTax * qty : 0);
        }, 0)
        .toFixed(2)
    );

    const storedTaxAmount = parseFloat(record?.tax_amount);
    const hasStoredTax = Number.isFinite(storedTaxAmount);

    const bisSourceValue =
      record?.order_bis ??
      record?.freight_shipping ??
      record?.bulk_item_surcharge ??
      record?.bulk_surcharge ??
      record?.surcharge_amount ??
      record?.handling_amount;
    const storedBisAmount = parseFloat(bisSourceValue);
    const hasStoredBis = Number.isFinite(storedBisAmount);
    const grandTotal = parseFloat(record?.grand_total);
    const inferredItemTaxRate =
      subtotalRevenue > 0 ? inferredTaxFromItems / subtotalRevenue : 0;
    const hasInferredItemTaxRate =
      inferredItemTaxRate > 0 && inferredItemTaxRate < 1;

    let derivedBis = hasStoredBis ? storedBisAmount : 0;
    let derivedTax = hasStoredTax ? storedTaxAmount : inferredTaxFromItems;

    if (!hasStoredBis && Number.isFinite(grandTotal)) {
      if (hasStoredTax) {
        derivedBis =
          grandTotal - subtotalRevenue - shippingRevenue - storedTaxAmount;
      } else if (hasInferredItemTaxRate) {
        const preTaxRevenue =
          (grandTotal - shippingRevenue) / (1 + inferredItemTaxRate);
        derivedBis = preTaxRevenue - subtotalRevenue;
        derivedTax =
          grandTotal - subtotalRevenue - shippingRevenue - derivedBis;
      } else {
        derivedBis =
          grandTotal - subtotalRevenue - shippingRevenue - derivedTax;
      }
    }

    if (!hasStoredTax && Number.isFinite(grandTotal) && hasStoredBis) {
      derivedTax =
        grandTotal - subtotalRevenue - shippingRevenue - storedBisAmount;
    }

    const taxExcluded = Math.max(0, Number(derivedTax.toFixed(2)));
    const bulkItemSurcharge = Math.max(0, Number(derivedBis.toFixed(2)));

    const orderRevenue = subtotalRevenue + shippingRevenue + bulkItemSurcharge;
    const getShippingCostParts = (orderId) => {
      const stored = orderShippingCosts[orderId];
      if (Array.isArray(stored)) {
        return [0, 0, 0, 0].map((_, idx) => parseMoney(stored[idx]));
      }
      return [parseMoney(stored), 0, 0, 0];
    };
    const shippingCostParts = getShippingCostParts(record.entity_id);
    const shippingCost = shippingCostParts.reduce((acc, value) => acc + parseMoney(value), 0);
    const updateShippingCostPart = (orderId, index, value) => {
      setOrderShippingCosts((prev) => {
        const existing = prev[orderId];
        const nextParts = Array.isArray(existing)
          ? [...existing]
          : [parseMoney(existing), 0, 0, 0];

        while (nextParts.length < 4) nextParts.push(0);
        nextParts[index] = parseMoney(value);

        return {
          ...prev,
          [orderId]: nextParts,
        };
      });
    };
    const totalLandedCost = total_cost + shippingCost;
    const marginAmount = orderRevenue - totalLandedCost;
    const marginPercent = totalLandedCost > 0 ? (marginAmount / totalLandedCost) * 100 : 0;
    // Simulated margin calculation
    const simulatedRevenue = orderRevenue + Number(simulatedExtraCharge || 0);
    const simulatedMarginAmount = simulatedRevenue - totalLandedCost;
    const simulatedMarginPercent = totalLandedCost > 0 ? (simulatedMarginAmount / totalLandedCost) * 100 : 0;
    const missingItemCosts = items.filter((item) => getUnitCost(item) <= 0).length;

    return (
      <Table
        columns={nestedColumns}
        dataSource={items}
        pagination={false}
        size="large"
        footer={() => (
          <div
            style={{
              width: "100%",
              overflowX: "auto",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <table
              style={{
                width: "100%",
                maxWidth: 720,
                borderCollapse: "collapse",
                fontSize: 13,
                background: "#fff",
              }}
            >
              <tbody>
                <tr>
                  <td style={{ width: 220, fontWeight: 600, padding: "8px 10px", border: "1px solid #f0f0f0", background: "#fafafa" }}>
                    Revenue
                  </td>
                  <td style={{ fontWeight: 700, padding: "8px 10px", border: "1px solid #f0f0f0" }}>
                    ${orderRevenue.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td style={{ width: 220, fontWeight: 600, padding: "8px 10px", border: "1px solid #f0f0f0", background: "#fafafa" }}>
                    Revenue Breakdown
                  </td>
                  <td style={{ padding: "8px 10px", border: "1px solid #f0f0f0" }}>
                    Sub: ${subtotalRevenue.toFixed(2)} + Ship: ${shippingRevenue.toFixed(2)} + BIS: ${bulkItemSurcharge.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td style={{ width: 220, fontWeight: 600, padding: "8px 10px", border: "1px solid #f0f0f0", background: "#fafafa" }}>
                    Tax Excluded
                  </td>
                  <td style={{ padding: "8px 10px", border: "1px solid #f0f0f0", color: "#8c8c8c", fontWeight: 600 }}>
                    ${taxExcluded.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td style={{ width: 220, fontWeight: 600, padding: "8px 10px", border: "1px solid #f0f0f0", background: "#fafafa" }}>
                    Product Cost
                  </td>
                  <td style={{ fontWeight: 700, padding: "8px 10px", border: "1px solid #f0f0f0" }}>
                    ${total_cost.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td style={{ width: 220, fontWeight: 600, padding: "8px 10px", border: "1px solid #f0f0f0", background: "#fafafa" }}>
                    Shipping We Pay
                  </td>
                  <td style={{ padding: "8px 10px", border: "1px solid #f0f0f0" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {[0, 1, 2, 3].map((idx) => (
                        <InputNumber
                          key={idx}
                          min={0}
                          precision={2}
                          step={1}
                          value={shippingCostParts[idx]}
                          onChange={(value) => updateShippingCostPart(record.entity_id, idx, value)}
                          placeholder="0.00"
                          style={{ width: 95 }}
                        />
                      ))}
                    </div>
                    <div style={{ marginTop: 6, fontWeight: 600, color: "#595959" }}>
                      Total Shipping We Pay: ${shippingCost.toFixed(2)}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style={{ width: 220, fontWeight: 600, padding: "8px 10px", border: "1px solid #f0f0f0", background: "#fafafa" }}>
                    Final Margin
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      border: "1px solid #f0f0f0",
                      fontWeight: 700,
                      color: marginAmount >= 0 ? "#389e0d" : "#cf1322",
                    }}
                  >
                    ${marginAmount.toFixed(2)} ({marginPercent.toFixed(2)}%)
                  </td>
                </tr>
                {/* Simulated Margin Row */}
                <tr>
                  <td style={{ width: 220, fontWeight: 600, padding: "8px 10px", border: "1px solid #f0f0f0", background: "#e6f7ff" }}>
                    Simulate Extra Charge
                  </td>
                  <td style={{ padding: "8px 10px", border: "1px solid #f0f0f0", background: "#e6f7ff" }}>
                    <InputNumber
                      min={0}
                      precision={2}
                      step={1}
                      value={simulatedExtraCharge}
                      onChange={setSimulatedExtraCharge}
                      placeholder="0.00"
                      style={{ width: 120, marginRight: 8 }}
                    />
                    <span style={{ color: '#888' }}>
                      (adds to revenue for margin simulation)
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ width: 220, fontWeight: 600, padding: "8px 10px", border: "1px solid #f0f0f0", background: "#e6f7ff" }}>
                    Simulated Margin
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      border: "1px solid #f0f0f0",
                      fontWeight: 700,
                      color: simulatedMarginAmount >= 0 ? "#389e0d" : "#cf1322",
                    }}
                  >
                    ${simulatedMarginAmount.toFixed(2)} ({simulatedMarginPercent.toFixed(2)}%)
                    <span style={{ marginLeft: 12, color: '#888', fontWeight: 400 }}>
                      Δ ${ (simulatedMarginAmount - marginAmount).toFixed(2) } ({ (simulatedMarginPercent - marginPercent).toFixed(2) }%)
                    </span>
                  </td>
                </tr>
                {missingItemCosts > 0 && (
                  <tr>
                    <td style={{ width: 220, fontWeight: 600, padding: "8px 10px", border: "1px solid #f0f0f0", background: "#fafafa" }}>
                      Cost Alert
                    </td>
                    <td style={{ padding: "8px 10px", border: "1px solid #f0f0f0" }}>
                      <Tag color="red">{missingItemCosts} item(s) missing product cost</Tag>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      />
    );
  };


  return (
    <>
      <div className="container-fluid" style={{ maxWidth: '100%' }}>
        <div className="container-xl" style={{ maxWidth: '100%', padding: '0 15px' }}>
          <div className="container mb-3 order-top-bar" 
            style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px', marginTop: '5px' }}>
            <Button 
              className="update-orders-btn"
              type="primary" 
              onClick={() => handleSeedOrders(200)}
              size="large"
              disabled={isSeeding}
              loading={seedingType === "orders"}
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
              {seedingType === "orders" ? "Seeding..." : "Update Orders"}
            </Button>


            <div className="order-top-metrics" style={{ flex: 1 }}>
              <TableTop
                orderCount={metrics.totalCount}
                notSetCount={metrics.notSetCount}
                staleNotSetCount={metrics.staleNotSetCount}
                todayCount={metrics.todayCount}
                yesterdayCount={metrics.yesterdayCount}
                last7DaysCount={metrics.last7DaysCount}
                onNotSetClick={() => handleFilterChange('poStatus', filters.poStatus === 'not_set' ? '' : 'not_set')}
                onNotSet3DaysClick={() => handleFilterChange('poStatus', filters.poStatus === 'not_set_4days' ? '' : 'not_set_4days')}
                onPmClick={() => handleFilterChange('poStatus', filters.poStatus === 'pm_not_set' ? '' : 'pm_not_set')}
                onKdClick={() => handleFilterChange('poStatus', filters.poStatus === 'kd_not_set' ? '' : 'kd_not_set')}
                onTodayClick={() => handleFilterChange('dateFilter', filters.dateFilter === 'today' ? '' : 'today')}
                onYesterdayClick={() => handleFilterChange('dateFilter', filters.dateFilter === 'yesterday' ? '' : 'yesterday')}
                onLast7DaysClick={() => handleFilterChange('dateFilter', filters.dateFilter === 'last7days' ? '' : 'last7days')}
                activePoStatus={filters.poStatus}
                activeDateFilter={filters.dateFilter}
                gwCount={metrics.gwCount}
                pmCount={metrics.pmNotSetCount}
                kdCount={metrics.kdNotSetCount}
                loading={metricsLoading}
              />
            </div>
          </div>

          {/* Filter Row */}
          <Card
            size="small"
            className="order-filters-card"
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
              {/* Exclude Keywords Field */}
              <Col xs={24} sm={12} md={6} lg={4}>
                <Input
                  placeholder="Exclude keywords (space-separated)"
                  allowClear
                  value={filters.exclude}
                  onChange={e => handleFilterChange('exclude', e.target.value)}
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
                  <Select.Option value="not_set_4days">
                    <span style={{ color: '#cf1322' }}>Not Set {'>'} 4 Days</span>
                  </Select.Option>
                  <Select.Option value="partial">
                    <span style={{ color: '#faad14' }}>Partial</span>
                  </Select.Option>
                  <Select.Option value="pm_not_set">
                    <span style={{ color: '#eb2f96' }}>PM Not Set</span>
                  </Select.Option>
                  <Select.Option value="kd_not_set">
                    <span style={{ color: '#13c2c2' }}>KD Not Set</span>
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


            {/* Expand Mode Toggle */}
            <div className="order-expand-controls" style={{ marginLeft: 16, marginRight: 16 }}>
              <div className="order-expand-row" style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontWeight: 500, marginRight: 8 }}>Expand Mode:</span>
                <Segmented
                  options={[
                    { label: 'Expand One', value: 'single' },
                    { label: 'Expand Multi', value: 'multi' },
                  ]}
                  value={expandMode}
                  onChange={setExpandMode}
                  style={{ minWidth: 180 }}
                />
                <Button
                  type="primary"
                  onClick={handleSeedOrdersAll}
                  size="small"
                  className="update-orders-all-btn"
                  disabled={isSeeding}
                  loading={seedingType === "orders-all"}
                  style={{
                    marginLeft: 12,
                    backgroundColor: "#0f766e",
                    borderColor: "#0f766e",
                    color: "white",
                    fontWeight: 600,
                    borderRadius: 6,
                  }}
                >
                  {seedingType === "orders-all" ? "Seeding All..." : "Update Orders (All)"}
                </Button>
              </div>
            </div>

                  <span style={{ color: '#666' }}>
                    Showing {orders.length} of {pagination.total} orders
                    {filters.filterMode === 'items' && <Tag color="cyan" style={{ marginLeft: 8 }}>ITEMS MODE</Tag>}
                    {filters.status && <Tag color="blue" style={{ marginLeft: 4 }}>{filters.status.toUpperCase()}</Tag>}
                    {filters.poStatus && <Tag color="orange" style={{ marginLeft: 4 }}>{filters.poStatus.replace(/_/g, ' ').toUpperCase()}</Tag>}
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
              expandable={{
                expandedRowRender,
                expandedRowKeys,
                onExpand: (expanded, record) => {
                  const rowKey = getOrderRowKey(record);
                  if (expandMode === 'single') {
                    setExpandedRowKeys(expanded ? [rowKey] : []);
                    if (expanded) {
                      requestAnimationFrame(() => {
                        window.scrollTo({
                          top: 0,
                          behavior: "smooth",
                        });
                      });
                    }
                  } else {
                    // Multi-expand: add/remove rowKey from expandedRowKeys
                    setExpandedRowKeys(prev => {
                      if (expanded) {
                        return [...prev, rowKey];
                      } else {
                        return prev.filter(key => key !== rowKey);
                      }
                    });
                  }
                },
              }}
              dataSource={visibleData}
              bordered
              scroll={{ x: 1100 }}
              rowKey={getOrderRowKey}
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
          orderIncrementId={currentOrderIncrementId}
          currency={currentCurrency} // ✅ Add this line
          onVendorCostSelect={handlePopupVendorCostSelect}

        />
      )}
    </>
  );
};

export default OrderTable;
