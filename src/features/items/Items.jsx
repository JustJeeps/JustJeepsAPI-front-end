import React, { useState, useEffect } from "react";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import { Table, Button, Tag, InputNumber } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import axios from "axios";
import ExcelJS from "exceljs";
import saveAs from "file-saver";
import "./items.scss";
import "react-resizable/css/styles.css";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import { Resizable } from "react-resizable";
import { Checkbox } from 'antd';



export const Items = () => {
  const [data, setData] = useState([]);
  const [searchBy, setSearchBy] = useState("sku"); // default search by SKU
  const [searchTermSku, setSearchTermSku] = useState("");
  const [sku, setSku] = useState([]);
  const [brandData, setBrandData] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [discount, setDiscount] = useState("1");

  const API_URL = import.meta.env.VITE_API_URL;

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasMore: false
  });

  // NEW state for the typed query and a local cache of all products
  const [typedSku, setTypedSku] = useState("");
  const [allLoaded, setAllLoaded] = useState(false);

  // Normalizers to support case-insensitive and dashless matching
  const toUpper = (s) => (s ?? "").toString().toUpperCase();
  const flat = (s) => toUpper(s).replace(/[^A-Z0-9]/g, "");

  // Return true if product matches query in any relevant field
  const productMatches = (p, q) => {
  // 🚫 Skip SKUs ending with a dash
  if (p.sku && p.sku.trim().endsWith("-")) return false;

  const fields = [
    p.sku,
    p.searchable_sku,
    ...(Array.isArray(p.vendorProducts)
      ? p.vendorProducts.map((vp) => vp.vendor_sku)
      : []),
  ];

  const Q = toUpper(q);
  const QF = flat(q);

  return fields.some((f) => {
    if (!f) return false;
    const F = toUpper(f);
    const FF = flat(f);
    return F.includes(Q) || FF.includes(QF);
  });
};



  const ResizableTitle = (props) => {
  const { onResize, width, ...restProps } = props;
  if (!width) return <th {...restProps} />;
  return (
    <Resizable
      width={width}
      height={0}
      handle={<span className="react-resizable-handle" onClick={e => e.stopPropagation()} />}
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} />
    </Resizable>
  );
};

  const onChange = (value) => {
    console.log("changed", value);
    setDiscount(value);
  };

  console.log("discount", discount);

  function getProductsByBrand(products, brandName) {
    return products.filter(
      (product) =>
        product.brand_name === brandName &&
        product.status === 1 &&
        product.price !== 0
    );
  }

  console.log("brandData", brandData);

  // function transformData(input) {
  //   let output = [];
  
  //   input.forEach((item) => {
  //     let transformedItem = {
  //       sku: item.sku,
  //       name: item.name,
  //       url_path: item.url_path,
  //       status: item.status,
  //       price: item.price,
  //       searchable_sku: item.searchable_sku,
  //       jj_prefix: item.jj_prefix,
  //       image: item.image,
  //       brand_name: item.brand_name,
  //       vendors: item.vendors
  //     };
  
  //     item.vendorProducts.forEach((vendorProduct) => {
  //       if (vendorProduct.vendor.name === 'Meyer') {
  //         transformedItem.meyer_cost = vendorProduct.vendor_cost;
  //         transformedItem.meyer_inventory = vendorProduct.vendor_inventory;
  //       } else if (vendorProduct.vendor.name === 'Keystone') {
  //         transformedItem.keystone_cost = vendorProduct.vendor_cost;
  //         transformedItem.keystone_inventory = vendorProduct.vendor_inventory;
  //       }
  //     });
  
  //     if (item.competitorProducts.length > 0) {
  //       transformedItem.northridge_price = item.competitorProducts[0].competitor_price;
  //     }
  
  //     output.push(transformedItem);
  //   });
  
  //   return output;
  // }

  function transformData(products) {
  const transformedProducts = products.map(product => {
    const transformedProduct = {
      sku: product.sku,
      name: product.name,
      url_path: product.url_path,
      status: product.status,
      price: product.price,
      searchable_sku: product.searchable_sku,
      jj_prefix: product.jj_prefix,
      image: product.image,
      brand_name: product.brand_name,
      vendors: product.vendors,
    };

    product.vendorProducts.forEach(vendorProduct => {
      transformedProduct[`${vendorProduct.vendor.name.toLowerCase()}_cost`] = vendorProduct.vendor_cost;
      transformedProduct[`${vendorProduct.vendor.name.toLowerCase()}_inventory`] = vendorProduct.vendor_inventory;
    });

    product.competitorProducts.forEach(competitorProduct => {
      transformedProduct[`${competitorProduct.competitor.name.toLowerCase()}_price`] = competitorProduct.competitor_price;
    });

    return transformedProduct;
  });

  return transformedProducts;
}  

const dataForExcel = transformData(brandData);

  function exportToExcel() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Product Data");
  
    // Define column headers
    sheet.columns = [
      { header: "SKU", key: "sku" },
      { header: "Name", key: "name" },
      { header: "URL", key: "url_path" },
      { header: "Status", key: "status" },
      { header: "Price", key: "price" },
      { header: "Searchable SKU", key: "searchable_sku" },
      { header: "JJ Prefix", key: "jj_prefix" },
      { header: "Image URL", key: "image" },
      { header: "Brand Name", key: "brand_name" },
      { header: "Vendors", key: "vendors" },
      { header: "Meyer Cost", key: "meyer_cost" },
      { header: "Meyer Inventory", key: "meyer_inventory" },
      { header: "Keystone Cost", key: "keystone_cost" },
      { header: "Keystone Inventory", key: "keystone_inventory" },
      { header: "Northridge Price", key: "northridge_price" },
      //vendor rough country
      { header: "Rough Country Cost", key: "rough_country_cost" },
    ];
  
    // Add rows to the sheet
    brandData.forEach((product) => {
      const row = {
        sku: product.sku,
        name: product.name,
        url_path: product.url_path,
        status: product.status,
        price: product.price,
        searchable_sku: product.searchable_sku,
        jj_prefix: product.jj_prefix,
        image: product.image,
        brand_name: product.brand_name,
        vendors: product.vendors,
        meyer_cost: product.vendorProducts.find(
          (vp) => vp.vendor.name === "Meyer"
        )?.vendor_cost,
        meyer_inventory: product.vendorProducts.find(
          (vp) => vp.vendor.name === "Meyer"
        )?.vendor_inventory,
        keystone_cost: product.vendorProducts.find(
          (vp) => vp.vendor.name === "Keystone"
        )?.vendor_cost,
        keystone_inventory: product.vendorProducts.find(
          (vp) => vp.vendor.name === "Keystone"
        )?.vendor_inventory,
        northridge_price: product.competitorProducts.find(
          (cp) => cp.competitor.name === "Northridge 4x4"
        )?.competitor_price,
      };
      //add rough country cost
      row.rough_country_cost = product.vendorProducts.find(
        (vp) => vp.vendor.name === "Rough Country"
      )?.vendor_cost;
      sheet.addRow(row);
    });
  
    // Generate and save the Excel file
    workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, "ProductData.xlsx");
    });
  }

  function exportToExcelAllProducts() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Product Data");
  
    // Define column headers
    sheet.columns = [
      { header: "JJ Prefix", key: "jj_prefix" },
      { header: "JJ SKU", key: "sku" },
      { header: "MANUF. SKU", key: "searchable_sku" },
      // { header: "URL", key: "url_path" },
      { header: "Price", key: "price" },
      //shipping freight
      { header: "Shipping Freight", key: "shipping_freight" },
      { header: "MAP", key: "MAP" },
      // { header: "Image URL", key: "image" },
      { header: "Brand Name", key: "brand_name" },
      { header: "Vendors", key: "vendors" },
      { header: "Meyer Cost", key: "meyer_cost" },
      { header: "Meyer Inventory", key: "meyer_inventory" },
      { header: "Keystone Cost", key: "keystone_cost" },
      { header: "Keystone Inventory", key: "keystone_inventory" },
      { header: "Omix Cost", key: "omix_cost" },
      { header: "Quadratec Cost", key: "quadratec_cost" },
      { header: "Quadratec Inventory", key: "quadratec_inventory" },
      { header: "WheelPros Cost", key: "wheelPros_cost" },
      { header: "WP inventory", key: "WP_inventory" },
      { header: "Tire Discounter Cost", key: "tireDiscounter_cost" },
      { header: "Dirty Dog Cost", key: "dirtyDog_cost" },
      { header: "Rough Country Cost", key: "rough_country_cost" },
      { header: "TDOT Price", key: "tdot_price" },
      { header: "PartsEngine Price", key: "partsEngine_price" },
      { header: "Lowriders Price", key: "lowriders_price" },
      { header: "Status", key: "status" },
      { header: "Name", key: "name" },

      //add partStatus_meyer
      { header: "Part Status Meyer", key: "partStatus_meyer" },
      { header: "Keystone code", key: "keystone_code" },
      //add weight, length, width, height
      { header: "Weight", key: "weight" },
      { header: "Length", key: "length" },
      { header: "Width", key: "width" },
      { header: "Height", key: "height" },
      //add meyer_weight, meyer_length, meyer_width, meyer_height
      { header: "Meyer Weight", key: "meyer_weight" },
      { header: "Meyer Length", key: "meyer_length" },
      { header: "Meyer Width", key: "meyer_width" },
      { header: "Meyer Height", key: "meyer_height" },
      //rough country cost
      //quadratec_sku from vendorProduct
      { header: "Quadratec SKU", key: "quadratec_sku" },
      //ROUGH COUNTRY INVENTORY
      { header: "Rough Country Inventory", key: "RC_inventory" },
      //OMIX INVENTORY
      { header: "Omix Inventory", key: "omix_inventory" },
      //part
      { header: "Part", key: "part" },
      //thumnail
      { header: "Image", key: "thumbnail" },
      //AEV COST
      { header: "AEV Cost", key: "aev_cost" },
      //keyparts cost
      { header: "Keyparts", key: "keyparts_cost" },
      //partsEngine_code - url
      { header: "PartsEngine URL", key: "partsEngine_code" },
      //tdot_url
      { header: "TDOT URL", key: "tdot_url" },
      //metalcloak cost
      { header: "MetalCloak Cost", key: "metalcloak_cost" },

    ];
  
    // Add rows to the sheet
    allProducts.forEach((product) => {
      console.log("product.competitorProducts >>>",product.competitorProducts)
      console.log("product.vendorProducts >>>",product.vendorProducts)
      const row = {
        //partsEngine_code
        partsEngine_code: product.partsEngine_code,
        tdot_url: product.tdot_url,
        keystone_code: product.keystone_code,
        sku: product.sku,
        name: product.name,
        url_path: product.url_path,
        status: product.status,
        price: product.price,
        MAP: product["MAP"],
        searchable_sku: product.searchable_sku,
        jj_prefix: product.jj_prefix,
        image: product.image,
        brand_name: product.brand_name,
        vendors: product.vendors,
        partStatus_meyer: product.partStatus_meyer,
        //add weight, length, width, height
        weight: product.weight, 
        length: product.length,
        width: product.width,
        height: product.height,
        //add meyer_weight, meyer_length, meyer_width, meyer_height
        meyer_weight: product.meyer_weight,
        meyer_length: product.meyer_length,
        meyer_width: product.meyer_width,
        meyer_height: product.meyer_height,
        //add part
        part: product.part,
        //add thumbnail
        thumbnail: product.thumbnail,
        //shipping freight
        shipping_freight: product.shippingFreight,
        //metalcloak cost
        metalcloak_cost: product.vendorProducts.find(
          (vp) => vp.vendor.name === "MetalCloak"
        )?.vendor_cost,
        meyer_cost: product.vendorProducts.find(
          (vp) => vp.vendor.name === "Meyer"
        )?.vendor_cost,
        meyer_inventory: product.vendorProducts.find(
          (vp) => vp.vendor.name === "Meyer"
        )?.vendor_inventory,
        keystone_cost: product.vendorProducts.find(
          (vp) => vp.vendor.name === "Keystone"
        )?.vendor_cost,
        wheelPros_cost: product.vendorProducts.find(
          (vp) => vp.vendor.name === "WheelPros"
        )?.vendor_cost,
        tireDiscounter_cost: product.vendorProducts.find(
          (vp) => vp.vendor.name === "Tire Discounter"
        )?.vendor_cost,
        dirtyDog_cost: product.vendorProducts.find(
          (vp) => vp.vendor.name === "Dirty Dog 4x4"
        )?.vendor_cost,
        keystone_inventory: product.vendorProducts.find(
          (vp) => vp.vendor.name === "Keystone"
        )?.vendor_inventory,
        northridge_price: product.competitorProducts.find(
          (cp) => cp.competitor.name === "Northridge 4x4"
        )?.competitor_price,
        partsEngine_price: product.competitorProducts.find(
          (cp) => cp.competitor.name === "Parts Engine" 
        )?.competitor_price,
        //lowriders price
        lowriders_price: product.competitorProducts.find(
          (cp) => cp.competitor.name === "Lowriders"
        )?.competitor_price,
        tdot_price: product.competitorProducts.find(
          (cp) => cp.competitor.name === "TDOT"
        )?.competitor_price,
        omix_cost: product.vendorProducts.find(
          (vp) => vp.vendor.name === "Omix"
        )?.vendor_cost,
        quadratec_cost: product.vendorProducts.find(
          (vp) => vp.vendor.name === "Quadratec"
        )?.vendor_cost,
        //add rough country cost
        rough_country_cost: product.vendorProducts.find(
          (vp) => vp.vendor.name === "Rough Country"
        )?.vendor_cost,
        //quadratec_sku from vendorProduct
        quadratec_sku: product.vendorProducts.find(
          (vp) => vp.vendor.name === "Quadratec"
        )?.quadratec_sku,
        //vendor_inventory_string for quadratec
        quadratec_inventory: product.vendorProducts.find(
          (vp) => vp.vendor.name === "Quadratec"
        )?.vendor_inventory,
        //rough country inventory
        RC_inventory: product.vendorProducts.find(
          (vp) => vp.vendor.name === "Rough Country"
        )?.vendor_inventory,
        //omix inventory
        omix_inventory: product.vendorProducts.find(
          (vp) => vp.vendor.name === "Omix"
        )?.vendor_inventory,
        //AEV COST
        aev_cost: product.vendorProducts.find(
          (vp) => vp.vendor.name === "AEV"
        )?.vendor_cost,
        //keyparts cost
        keyparts_cost: product.vendorProducts.find(
          (vp) => vp.vendor.name === "KeyParts"
        )?.vendor_cost,
        //wp inventory
        WP_inventory: product.vendorProducts.find(
          (vp) => vp.vendor.name === "WheelPros"
        )?.vendor_inventory,
 



    



      

      };
      sheet.addRow(row);
    });
  
    // Generate and save the Excel file
    workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, "ProductData.xlsx");
    });
  }

  console.log("all products", allProducts);

  const prices = brandData.reduce((acc, product) => {
    acc.push(product.price);
    return acc;
  }, []);

  const totalPrice = productsByBrand.reduce((acc, product) => {
    return acc + product.price;
  }, 0);

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const averagePrice = totalPrice / productsByBrand.length;

  //search by sku
  useEffect(() => {
    const getProductBySku = async () => {
      try {
        if (searchTermSku && searchTermSku.sku) {
          // Add null check
          console.log("value", searchTermSku);
          await axios
            .get(`${API_URL}/api/products/${searchTermSku.sku}`)
            .then((res) => {
              const responseData = res.data;
              console.log("Data from backend by sku:", responseData);
              // Process the response data from backend if needed
              setData([responseData]);
            });
        }
      } catch (error) {
        console.error("Failed to fetch data from backend:", error);
      }
    };
    getProductBySku();
  }, [searchTermSku]);

  //search by brand
  useEffect(() => {
    const getProductByBrand = async () => {
      try {
        // Add null check
        console.log("searchTermBrand", searchTermSku);
        if (searchTermSku && searchTermSku.brand_name) {
          setLoading(true);
          await axios.get(`${API_URL}/api/products`).then((res) => {
            const responseData = res.data;
            setAllProducts(responseData);
            const productsByBrand = getProductsByBrand(
              responseData,
              searchTermSku.brand_name
            );
            console.log("productsByBrand", productsByBrand);
            // Process the response data from backend if needed
            setBrandData(productsByBrand);
            setLoading(false);
          });
        }
      } catch (error) {
        console.error("Failed to fetch data from backend:", error);
      }
    };
    getProductByBrand();
  }, [searchTermSku]);

  // console.log("brandData", brandData);

  //get all skus
  useEffect(() => {
    const getAllSkus = async () => {
      try {
        await axios
          .get(`${API_URL}/api/products_sku`)
          .then((res) => {
            const responseData = res.data;
            // Process the response data from backend if needed
            setSku([...responseData]);
          });
      } catch (error) {
        console.error("Failed to fetch data from backend:", error);
      }
    };
    getAllSkus();
  }, []);

//   useEffect(() => {
//   const q = (typedSku || "").trim();
//   if (!q) { setData([]); return; }

//   const timeout = setTimeout(async () => {
//     try {
//       // load all products once
//       if (!allLoaded || !Array.isArray(allProducts) || allProducts.length === 0) {
//         const res = await axios.get(`${API_URL}/api/products`);
//         setAllProducts(res.data || []);
//         setAllLoaded(true);
//         setData((res.data || []).filter(p => productMatches(p, q)));
//       } else {
//         setData(allProducts.filter(p => productMatches(p, q)));
//       }
//     } catch (err) {
//       console.error("Partial search failed:", err);
//       setData([]);
//     }
//   }, 250);

//   return () => clearTimeout(timeout);
// }, [typedSku, allLoaded, allProducts, API_URL]);

// Server-side search with pagination
const fetchProducts = async (page = 1, search = '', pageSize = pagination.limit) => {
  setLoading(true);
  try {
    const response = await axios.get(`${API_URL}/api/products`, {
      params: { page, limit: pageSize, search }
    });

    // Handle paginated response
    if (response.data.products) {
      setData(response.data.products);
      setPagination(response.data.pagination);
      setAllProducts(response.data.products);
      setAllLoaded(true);
    } else {
      // Fallback for non-paginated response (backward compatibility)
      setData(response.data || []);
    }
  } catch (err) {
    console.error("Failed to fetch products:", err);
    setData([]);
  } finally {
    setLoading(false);
  }
};

// Effect for server-side search with debounce
useEffect(() => {
  const q = (typedSku || "").trim();

  // If empty search, load first page without search filter
  if (!q) {
    setLoading(true);
    const timeout = setTimeout(() => {
      fetchProducts(1, '');
    }, 100);
    return () => clearTimeout(timeout);
  }

  setLoading(true);

  const timeout = setTimeout(() => {
    // Search server-side with pagination
    fetchProducts(1, q);
  }, 400);

  return () => clearTimeout(timeout);
}, [typedSku, API_URL]);

// Handle pagination change
const handleTableChange = (newPage, newPageSize) => {
  const search = (typedSku || "").trim();
  setPagination(prev => ({ ...prev, page: newPage, limit: newPageSize }));
  fetchProducts(newPage, search, newPageSize);
};




  const handleSearchByChange = (event) => {
    setSearchBy(event.target.value);
  };

  const handleSearchTermChange = (event) => {
    setSearchTermSku(event.target.value);
  };

  const skus_for_autocomplete = {
    options: sku, // sample SKU data
    getOptionLabel: (option) => option.sku,
  };

  const brands_for_autocomplete = {
    options: brands, // sample brand data
    getOptionLabel: (option) => option.brand_name,
  };

  const columns_by_sku = [

    
    {
      title: "Manufacturer",
      dataIndex: "brand_name",
      key: "brand_name",
      width: "10%",
      align: "center",
    },
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      align: "center",
    },
    // {
    //   title: "Status",
    //   dataIndex: "status",
    //   key: "status",
    //   align: "center",
    //   filter: true,
    //   //render if status is 1 is enableed, if status is 2 is disabled
    //   render: (status) => (
    //     <div>
    //       {status === 1 ? (
    //         //tag green
    //         <Tag color="green">Enabled</Tag>
    //       ) : (
    //         //tag red
    //         <Tag color="red">Disabled</Tag>
    //       )}
    //     </div>
    //   ),
    // },
    {
      title: "Image",
      dataIndex: "image",
      key: "image",
      align: "center",
      render: (image) => <img src={image} alt="Product" width="80" />,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      align: "center",
      width: "15%",
      render: (name, vendorProducts) => {
        if (!vendorProducts || !vendorProducts.url_path) {
          return <span>{name}</span>; // fallback if no link
        }
    
        return (
          <a
            href={vendorProducts.url_path}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => console.log(vendorProducts)}
          >
            {name}
          </a>
        );
      },
    },
    
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      align: "center",
      //render price with $ sign and 2 decimals, applying black_friday_sale discount if available
      render: (price, record) => {
        let discountPercent = 0;
        
        // Parse black_friday_sale field to get discount percentage
        if (record.black_friday_sale) {
          const saleValue = record.black_friday_sale.toLowerCase();
          if (saleValue.includes('15%off')) {
            discountPercent = 15;
          } else if (saleValue.includes('20%off')) {
            discountPercent = 20;
          } else if (saleValue.includes('25%off')) {
            discountPercent = 25;
          } else if (saleValue.includes('30%off')) {
            discountPercent = 30;
          }
        }
        
        const discountedPrice = discountPercent > 0 
          ? (parseFloat(price) * (1 - discountPercent / 100)).toFixed(2)
          : parseFloat(price).toFixed(2);
          
        return <div>{`$${discountedPrice}`}</div>;
      }   
     },

{
  title: "Weight",
  dataIndex: "weight", // from Product table
  key: "weight",
  align: "center",
  width: "5%",
  render: (weight) => {
    const w = Number(weight);
    if (!w) return <span>-</span>;
    const heavy = w > 50; // highlight heavy items
    return (
      <div style={{ padding: "5px", marginBottom: "7px" }}>
        {heavy ? (
          <span>
            {w.toFixed(2)} lbs <span style={{ color: "#f63535", fontWeight: 700 }}>!</span>
          </span>
        ) : (
          `${w.toFixed(2)} lbs`
        )}
      </div>
    );
  },
},

{
  title: "BIS",
  dataIndex: "shippingFreight", // from Product table
  key: "bis",
  align: "center",
  width: "5%",
  render: (shippingFreight) => {
    if (shippingFreight === null || shippingFreight === undefined) {
      return <span>-</span>;
    }

    const bis = Number(shippingFreight);
    return (
      <div style={{ padding: "5px", marginBottom: "7px" }}>
        {isNaN(bis) ? "-" : bis.toFixed(2)}
      </div>
    );
  },
},




     {
  title: 'Vendor Information',
  dataIndex: 'vendorProducts',
  key: 'vendor_info',
  align: 'left',
  width: '25%',
  onHeaderCell: () => ({
    style: { 
      minWidth: '300px',
      backgroundColor: '#f0f2f5'
    }
  }),
  render: (vendorProducts, record) => {
    if (!Array.isArray(vendorProducts) || vendorProducts.length === 0) {
      return <span>-</span>;
    }

    return vendorProducts.map((vendorProduct) => {
      const vendorName = vendorProduct.vendor?.name || "Unknown";
      const vendorSKU = vendorProduct.vendor_sku?.trim();
      const productSKU = vendorProduct.product_sku?.trim();
      const vendorNameLower = vendorName.toLowerCase();

      // Generate vendor link
      let link = null;
      if (vendorNameLower === 'meyer') {
        link = `https://online.meyerdistributing.com/parts/details/${vendorSKU}`;
      } else if (vendorNameLower === 'omix') {
        link = `https://omixdealer.com/product-detail/${vendorSKU}`;
      } else if (vendorNameLower === 'quadratec') {
        const quadCode = productSKU?.includes('-')
          ? productSKU.split('-').slice(1).join('-')
          : productSKU;
        link = `https://www.quadratecwholesale.com/catalogsearch/result/?q=${quadCode}`;
      } else if (vendorNameLower === 'tire discounter') {
        link = `https://www.tdgaccess.ca/Catalog/Search/1?search=${vendorSKU}`;
      } else if (vendorNameLower === 'keystone') {
        const rawKCode = record.keystone_code?.trim();
        let pid;
        if (rawKCode?.startsWith('Y11') || rawKCode?.startsWith('RGA') || rawKCode?.startsWith('AVS')) {
          pid = rawKCode;
        } else {
          let ks = record.keystone_code_site?.trim();
          if (ks?.startsWith('BES')) {
            ks = ks.replace(/(\d{2})$/, '-$1');
          }
          pid = ks;
        }
        if (pid) {
          link = `https://wwwsc.ekeystone.com/Search/Detail?pid=${pid}`;
        }
      } else if (vendorNameLower === 'wheelpros' || vendorNameLower === 'wheel pros') {
        link = `https://dl.wheelpros.com/ca_en/ymm/search/?api-type=products&p=1&pageSize=24&q=${vendorSKU}&inventorylocations=AL`;
      } else if (vendorNameLower === 'rough country' || vendorNameLower === 'roughcountry') {
        link = vendorSKU
          ? `https://www.roughcountry.com/search/${encodeURIComponent(vendorSKU)}`
          : null;
      } else if (vendorNameLower === 'ctp' || vendorNameLower === 'ctp distributors') {
        const searchableSku = record.searchable_sku?.trim();
        link = searchableSku
          ? `https://www.ctpdistributors.com/search-parts?find=${encodeURIComponent(searchableSku)}`
          : null;
      } else if (vendorNameLower === 'curt') {
        const brandNameLower = record.brand_name?.toLowerCase();
        const searchableSku = record.searchable_sku?.trim();
        if (searchableSku) {
          if (brandNameLower === 'luverne truck equipment' || brandNameLower === 'luverne truck equipment inc' || brandNameLower === 'luverne') {
            link = `https://www.luvernetruck.com/part/${encodeURIComponent(searchableSku)}`;
          } else if (brandNameLower === 'aries automotive') {
            link = `https://www.ariesautomotive.com/part/${encodeURIComponent(searchableSku)}`;
          } else if (brandNameLower === 'curt manufacturing') {
            link = `https://www.curtmfg.com/part/${encodeURIComponent(searchableSku)}`;
          } else if (brandNameLower === 'uws storage' || brandNameLower === 'uws storage solutions') {
            link = `https://www.uwsta.com/part/${encodeURIComponent(searchableSku)}`;
          }
        }
      } else if (vendorNameLower === 't14' || vendorNameLower === 'turn14') {
        // Turn14 Distribution vendor link
        link = vendorSKU
          ? `https://turn14.com/search/index.php?vmmPart=${encodeURIComponent(vendorSKU)}`
          : null;
      } else if (vendorNameLower === 'metalcloak') {
        const metalCloakCode = vendorSKU?.replace(/^MTK-/, '');
        link = metalCloakCode
          ? `https://jobber.metalcloak.com/catalogsearch/result/?q=${encodeURIComponent(metalCloakCode)}`
          : null;
      }

      // Calculate cost and margin
      const cad = Number(vendorProduct.vendor_cost) || 0;
      const usd = cad / 1.5;
      
      // Get the actual selling price (may be discounted for black friday)
      let sellingPrice = record.price || 0;
      
      // Apply black friday discount if present
      let discountPercent = 0;
      if (record.black_friday_sale) {
        const saleValue = record.black_friday_sale.toLowerCase();
        if (saleValue.includes('15%off')) {
          discountPercent = 15;
        } else if (saleValue.includes('20%off')) {
          discountPercent = 20;
        } else if (saleValue.includes('25%off')) {
          discountPercent = 25;
        } else if (saleValue.includes('30%off')) {
          discountPercent = 30;
        }
      }
      
      if (discountPercent > 0) {
        sellingPrice = sellingPrice * (1 - discountPercent / 100);
      }
      
      const margin = cad > 0 ? ((sellingPrice - cad) / cad) * 100 : 0;

      // Format inventory
      let inventoryDisplay = 'NO INFO';
      let inventoryColor = '#d9d9d9';
      
      if (vendorProduct.vendor_inventory !== null && vendorProduct.vendor_inventory !== undefined) {
        inventoryDisplay = vendorProduct.vendor_inventory.toString();
        inventoryColor = vendorProduct.vendor_inventory > 0 ? '#52c41a' : '#ff4d4f';
      } else if (vendorProduct.vendor_inventory_string) {
        inventoryDisplay = vendorProduct.vendor_inventory_string;
        const invStr = vendorProduct.vendor_inventory_string.toLowerCase();
        inventoryColor = (invStr.includes("out") || invStr.includes("cad stock: 0 / us stock: 0")) 
          ? '#ff4d4f' : '#52c41a';
      }

      return (
        <div 
          key={vendorProduct.id} 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px',
            marginBottom: '4px',
            border: '1px solid #f0f0f0',
            borderRadius: '4px',
            backgroundColor: 'transparent',
            flexWrap: 'wrap'
          }}
        >
          {/* Vendor Name */}
          <div style={{ minWidth: '80px', fontWeight: '600' }}>
            {link ? (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#1890ff', textDecoration: 'none' }}
              >
                {vendorName}
              </a>
            ) : (
              <span>{vendorName}</span>
            )}
          </div>

          {/* Cost */}
          <div style={{ minWidth: '140px', color: '#595959' }}>
            CAD ${cad.toFixed(2)} (USD ${usd.toFixed(2)})
          </div>

          {/* Margin */}
          <div style={{ minWidth: '60px' }}>
            <span 
              style={{
                backgroundColor: margin > 19 ? '#52c41a' : '#ff4d4f',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {margin.toFixed(1)}%
            </span>
          </div>

          {/* Inventory */}
          <div style={{ minWidth: '60px' }}>
            <span 
              style={{
                backgroundColor: inventoryColor,
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {inventoryDisplay}
            </span>
          </div>
        </div>
      );
    });
  }
},
     
    // {
    //   title: "Vendor SKU   ",
    //   dataIndex: "vendorProducts",
    //   key: "vendor_sku",
    //   align: "center",
    //   render: (vendorProducts) =>
    //     vendorProducts.map((vendorProduct) => (
    //       <div
    //         key={vendorProduct.id}
    //         style={{
    //           padding: "5px",
    //           marginBottom: "7px",
    //         }}
    //       >
    //         {vendorProduct.vendor_sku}
    //       </div>
    //     )),
    // },
    // {
    //   title: "Suggested Vendor",
    //   dataIndex: "vendorProducts",
    //   key: "lowest_cost",
    //   align: "center",
    //   render: (vendorProducts, record) => {
    //     let discountedPrice = 0;
    //     if (discount > 0) {
    //       discountedPrice = record.price * (1 - discount / 100);
    //     } else {
    //       discountedPrice = record.price;
    //     }
    //     const vendorsWithInventory = vendorProducts.filter(
    //       (vp) => vp.vendor_inventory > 0
    //     );
    //     if (vendorsWithInventory.length === 0) {
    //       return "-";
    //     }
    //     const minVendorProduct = vendorsWithInventory.reduce((min, curr) => {
    //       if (curr.vendor_cost < min.vendor_cost) {
    //         return curr;
    //       }
    //       return min;
    //     }, vendorsWithInventory[0]);

    //     const margin =
    //       ((discountedPrice - minVendorProduct.vendor_cost) / discountedPrice) *
    //       100;

    //     const className = margin < 20 ? "red-margin" : "";

    //     return (
    //       <div
    //       style={
    //         //setup green border if margin is greater than 20%
    //         margin > 18 ? { border: "2px solid green" } : { border: "2px solid red" }

    //       }
    //       >
    //         <div>{minVendorProduct.vendor.name}</div>
    //         <div>{`$${minVendorProduct.vendor_cost}`}</div>
    //         <div className={className}> {`${margin.toFixed(0)}%`} </div>
    //       </div>
    //     );
    //   },
    // },
    {
      title: 'Competitor Prices',
      dataIndex: 'competitorProducts',
      key: 'competitor_prices',
      width: '10%',
      render: (competitorProducts) => {
        if (!Array.isArray(competitorProducts)) return <span>-</span>;
    
        return competitorProducts.map((competitorProduct) => (
          <div key={competitorProduct.id}>
            {`$${competitorProduct.competitor_price} (${competitorProduct.competitor.name})`}
          </div>
        ));
      },
    },
    

  ];

  const skuColumnsBase = [...columns_by_sku];
const columns_no_img = skuColumnsBase.filter(c => c.dataIndex !== "image");

  const columns_brands = [
    {
      title: "PRODUCT",
      align: "center",
      children: [
        {
          title: "SKU",
          dataIndex: "sku",
          key: "sku",
          align: "center",
          sorter: (a, b) => a.sku.localeCompare(b.sku),
          filter: true,
        },
        {
          title: "Image",
          dataIndex: "image",
          key: "image",
          align: "center",
          render: (image) => <img src={image} alt="Product" width="80" />,
        },
        {
          title: "Name",
          dataIndex: "name",
          key: "name",
          align: "left",
          width: "30%",

          render: (name, vendorProducts) => (
            <a
              style={{ color: "navy" }}
              href={vendorProducts.url_path}
              target="_blank"
              onClick={() => console.log(vendorProducts)}
            >
              {name}
            </a>
          ),
        },
        {
          title: "Price",
          dataIndex: "price",
          key: "price",
          align: "center",
          sorter: (a, b) => a.price - b.price,
          //add $ sign to price and apply black_friday_sale discount if available
          render: (price, record) => {
            let discountPercent = 0;
            
            // Parse black_friday_sale field to get discount percentage
            if (record.black_friday_sale) {
              const saleValue = record.black_friday_sale.toLowerCase();
              if (saleValue.includes('15%off')) {
                discountPercent = 15;
              } else if (saleValue.includes('20%off')) {
                discountPercent = 20;
              } else if (saleValue.includes('25%off')) {
                discountPercent = 25;
              } else if (saleValue.includes('30%off')) {
                discountPercent = 30;
              }
            }
            
            const discountedPrice = discountPercent > 0 
              ? (parseFloat(price) * (1 - discountPercent / 100)).toFixed(2)
              : parseFloat(price).toFixed(2);
              
            return `$${discountedPrice}`;
          },
        },
      ],
    },

    {
      title: "Vendors",
      children: [
        {
          title: "Name",
          dataIndex: "vendorProducts",
          key: "vendor_id",
          align: "center",
          onHeaderCell: (column) => {
            return {
              style: { backgroundColor: "red" },
            };
          },
          render: (vendorProducts) =>
            vendorProducts.map((vendorProduct) => (
              <div
                key={vendorProduct.id}
                style={{
                  padding: "5px",
                  marginBottom: "7px",
                }}
              >
                {vendorProduct.vendor.name}
              </div>
            )),
        },
        {
          title: "Cost",
          dataIndex: "vendorProducts",
          key: "vendor_cost",
          align: "center",
          render: (vendorProducts) =>
            vendorProducts.map((vendorProduct) => (
              <div
                key={vendorProduct.id}
                style={{
                  padding: "5px",
                  marginBottom: "7px",
                }}
              >{`$${vendorProduct.vendor_cost.toFixed(2)}`}</div>
            )),
        },
        {
          title: "Margin %",
          key: "margin",
          align: "center",
          render: (record) => {
            const { price, vendorProducts } = record;
            let discountedPrice = 0;
            if (discount > 0) {
              discountedPrice = price * (1 - discount / 100);
            } else {
              discountedPrice = price;
            }
            return vendorProducts.map((vendorProduct) => {
              const { vendor_cost } = vendorProduct;
              const margin =
                ((discountedPrice - vendor_cost) / vendor_cost) * 100;
              const className = margin < 20 ? "red-margin" : "";
              return (
                <div key={vendorProduct.vendor_id}>
                  {margin > 18 ? (
                    <Tag
                      color="#1f8e24"
                      style={{
                        fontSize: "18px",
                        padding: "5px",
                        marginBottom: "12px",
                      }}
                    >
                      {margin.toFixed(2)}%
                    </Tag>
                  ) : (
                    <Tag color="#f63535"
                    style={{
                      fontSize: "18px",
                      padding: "5px",
                      marginBottom: "12px",
                    }}
                  >
                    {margin.toFixed(2)}%</Tag>
                  )}
                </div>
              );
            });
          },
        },
        {
          title: "Vendor Inventory",
          dataIndex: "vendorProducts",
          key: "vendor_inventory",
          align: "center",
          render: (vendorProducts) =>
            vendorProducts.map((vendorProduct) => (
              <div
                key={vendorProduct.id}
              >
                {vendorProduct.vendor_inventory > 0 ? (
                    <Tag
                      color="#1f8e24"
                      style={{
                        fontSize: "18px",
                        padding: "5px",
                        marginBottom: "7px",
                        width: "34px",
                      }}
                    >
                      {vendorProduct.vendor_inventory}
                    </Tag>
                  ) : (
                    <Tag color="#f63535"
                    style={{
                      fontSize: "18px",
                      padding: "5px",
                      marginBottom: "7px",
                      width: "34px",
                    }}>{vendorProduct.vendor_inventory}</Tag>
                  )}
              </div>
              
            )),
        },
      ],
    },
    // {
    //   title: "Suggested Vendor",
    //   dataIndex: "vendorProducts",
    //   key: "lowest_cost",
    //   align: "center",
    //   render: (vendorProducts, record) => {
    //     let discountedPrice = 0;
    //     if (discount > 0) {
    //       discountedPrice = record.price * (1 - discount / 100);
    //     } else {
    //       discountedPrice = record.price;
    //     }
    //     const vendorsWithInventory = vendorProducts.filter(
    //       (vp) => vp.vendor_inventory > 0
    //     );
    //     if (vendorsWithInventory.length === 0) {
    //       return "-";
    //     }
    //     const minVendorProduct = vendorsWithInventory.reduce((min, curr) => {
    //       if (curr.vendor_cost < min.vendor_cost) {
    //         return curr;
    //       }
    //       return min;
    //     }, vendorsWithInventory[0]);

    //     const margin =
    //       ((discountedPrice - minVendorProduct.vendor_cost) / discountedPrice) *
    //       100;

    //     const className = margin < 20 ? "red-margin" : "";

    //     return (
    //       <div
    //       style={
    //         //setup green border if margin is greater than 20%
    //         margin > 18 ? { border: "2px solid green" } : { border: "2px solid red" }

    //       }
    //       >
    //         <div>{minVendorProduct.vendor.name}</div>
    //         <div>{`$${minVendorProduct.vendor_cost}`}</div>
    //         <div className={className}> {`${margin.toFixed(0)}%`} </div>
    //       </div>
    //     );
    //   },
    // },
    {
			title: 'Competitor Price',
			dataIndex: 'competitorProducts',
			key: 'competitor_price',
			render: (competitorProducts, record) =>
				competitorProducts.length > 0 ? (
					competitorProducts.map(competitorProduct => {
						const competitorName = competitorProduct.competitor.name.toLowerCase();
						let link = null;

						// Use specific database codes for competitor links
						if (competitorName.includes('parts') && competitorName.includes('engine')) {
							const partsEngineCode = record.partsEngine_code || record.partsengine_code;
							if (partsEngineCode) {
								// If partsEngine_code is already a full URL, use it directly
								if (partsEngineCode.startsWith('http')) {
									link = partsEngineCode;
								} else {
									// If it's just a code, create search URL
									link = `https://www.partsengine.ca/Search/?q=${encodeURIComponent(partsEngineCode)}`;
								}
							} else {
								// Fallback to SKU if no specific code
								const sku = record.sku?.includes('-') ? record.sku.split('-').slice(1).join('-') : record.sku;
								link = `https://www.partsengine.ca/Search/?q=${encodeURIComponent(sku)}`;
							}
						} else if (competitorName.includes('quadratec') && record.quadratec_code) {
							link = `https://www.quadratec.com/search?keywords=${encodeURIComponent(record.quadratec_code)}`;
						} else if (competitorName.includes('extremeterrain')) {
							const sku = record.sku?.includes('-') ? record.sku.split('-').slice(1).join('-') : record.sku;
							link = `https://www.extremeterrain.com/searchresults.html?q=${encodeURIComponent(sku)}`;
						} else if (competitorName.includes('morris')) {
							const sku = record.sku?.includes('-') ? record.sku.split('-').slice(1).join('-') : record.sku;
							link = `https://www.morris4x4center.com/search.php?search_query=${encodeURIComponent(sku)}`;
						} else if (competitorName.includes('4wp') || competitorName.includes('4 wheel parts')) {
							const sku = record.sku?.includes('-') ? record.sku.split('-').slice(1).join('-') : record.sku;
							link = `https://www.4wheelparts.com/search/?Ntt=${encodeURIComponent(sku)}`;
						} else if (competitorName.includes('northridge')) {
							const sku = record.sku?.includes('-') ? record.sku.split('-').slice(1).join('-') : record.sku;
							link = `https://www.northridge4x4.ca/search?q=${encodeURIComponent(sku)}`;
						}

						return (
							<div key={competitorProduct.id}>
								{link ? (
									<a 
										href={link} 
										target="_blank" 
										rel="noopener noreferrer" 
										style={{ 
											color: '#1890ff', 
											textDecoration: 'underline',
											cursor: 'pointer'
										}}
									>
										{`$${competitorProduct.competitor_price} (${competitorProduct.competitor.name})`}
									</a>
								) : (
									`$${competitorProduct.competitor_price} (${competitorProduct.competitor.name})`
								)}
							</div>
						);
					})
				) : (
					'-'
				),
		},
  ];

  const tableProps = {
    loading,
  };

  // console.log("data brand legnth", brandData.length);

  return (
    <div className="items">
      <div className="sidebar">
        <div className="explore-dropdown">
          <FormControl sx={{ mt: 10, width: 300 }}>
            SEARCH BY:
            <Select
              value={searchBy}
              onChange={handleSearchByChange}
              style={{
                width: 300,
                margin: 0,
                marginRight: 10,
                padding: 0,
                borderRadius: 10,
                height: 55,
                backgroundColor: "white",
              }}
            >
              <MenuItem value="sku">SKU</MenuItem>
              <MenuItem value="brand">Brand</MenuItem>
            </Select>
          </FormControl>
        </div>

        <div className="explore-data-entry">
          {searchBy === "sku" ? (
            <div className="sidebar-sku">
          <TextField
            label="Search SKU"
            variant="standard"
            // onChange={async (e) => {
            //   const newValue = e.target.value;
            //   setSearchTermSku({ sku: newValue });

            //   try {
            //     // const response = await axios.get(`${API_URL}/api/products/${sku}`);
            //     // const response = await axios.get(`${API_URL}/api/products/${encodeURIComponent(newValue)}`);

            //     // Normalize SKU input: trim whitespace and convert to uppercase
            //     const normalizedSku = newValue.trim().toUpperCase(); 
            //     setSearchTermSku({ sku: normalizedSku });

            //     const response = await axios.get(
            //       `${API_URL}/api/products/${encodeURIComponent(normalizedSku)}`
            //     );
            //     setData(response.data || []); // Make sure setData is defined
            //   } catch (error) {
            //     console.error("Error fetching data:", error);
            //     setData([]); // Clear table on error
            //   }
            // }}
            onChange={(e) => setTypedSku(e.target.value)}

            sx={{
              width: 300,
              backgroundColor: "white",
              height: 55,
            }}
            style={{
              borderRadius: 5,
            }}
          />
         </div>

                    ) : (
                      <div className="sidebar-brand">
                        <Autocomplete
                          {...brands_for_autocomplete}
                          sx={{
                            width: 300,
                            backgroundColor: "white",
                            height: 55,
                          }}
                          id="clear-on-escape"
                          clearOnEscape
                          value={null}
                          onChange={(event, newValue) => {
                            setSearchTermSku(newValue);
                          }}
                          style={{
                            borderRadius: 5,
                          }}
                          renderInput={(params) => (
                            <TextField
                              className="textfield"
                              {...params}
                              label="Search brand"
                              variant="standard"
                              onChange={handleSearchTermChange}
                              // InputLabelProps={{
                              //   style: {
                              //     fontSize: 16,
                              //     // fontWeight: 'bold',
                              //   },
                              // }}
                              // //input size
                              // InputProps={{
                              //   style: {
                              // 		fontSize: 20
                              // 	},
                              // }}
                            />
                          )}
                        />
                        <Button className="excel-export" onClick={exportToExcel}>
                          <UploadOutlined /> Export to Excel
                        </Button>
                        <Button className="excel-export" onClick={exportToExcelAllProducts}>
                          <UploadOutlined /> Export ALL to Excel
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="explore-content">
                  {searchBy === "sku" ? (
                    <Table
                        dataSource={Array.isArray(data) ? data : []}
                        columns={typedSku?.trim() ? columns_no_img : columns_by_sku}
                        rowKey="sku"
                        loading={loading}
                        components={{
                          header: {
                            cell: ResizableTitle,
                          },
                        }}
                        pagination={{
                          current: pagination.page,
                          pageSize: pagination.limit,
                          total: pagination.total,
                          showSizeChanger: true,
                          pageSizeOptions: ['25', '50', '100', '200'],
                          showTotal: (total, range) =>
                            `${range[0]}-${range[1]} de ${total} produtos`,
                          onChange: handleTableChange,
                          onShowSizeChange: handleTableChange,
                          position: ['topRight', 'bottomRight'],
                        }}
                      title={() => (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {Array.isArray(data) && data.length > 0 && data[0]?.vendors ? (
                            <h5 style={{ margin: 0 }}>Vendors for this Brand: {data[0].vendors}</h5>
                          ) : <span />}
                          <span style={{ fontWeight: 'bold' }}>
                            Total: {pagination.total.toLocaleString()} produtos
                          </span>
                        </div>
                      )}
                    />

                  ) : (


          
          <div>

            {brandData.length > 0 && (
            <div className="brand-statistic">

           

              {/* <div className="widget">
                <div className="left">
                  <span className="title">
                    <strong> PROMOTION SIMULATION:</strong>
                  </span>
                  <InputNumber
                    min={0}
                    max={50}
                    defaultValue={0}
                    onChange={onChange}
                    formatter={(value) => `${value}%`}
                    parser={(value) => value.replace("%", "")}
                    size="large"
                    style={{ width: 100, height: 45, marginLeft: 10, fontSize: 20, backgroundColor: "#e6e088" }}
                  />
                </div>
                <div className="right">
                  <MonetizationOnOutlinedIcon
                    className="icon"
                    style={{
                      backgroundColor: "rgba(218, 165, 32, 0.2)",
                      color: "goldenrod",
                      fontSize: "30px",
                    }}
                  />
                </div>
              </div> */}

              <div className="widget">
                <div className="left">
                  <span className="title">
                    <strong>{searchTermSku.brand_name} </strong>TOTAL PRODUCTS:
                  </span>
                  <span className="counter">{brandData.length}</span>
                </div>
                <div className="right">
                  <PrecisionManufacturingOutlinedIcon
                    className="icon"
                    style={{
                      color: "purple",
                      backgroundColor: "rgba(255, 0, 0, 0.2)",
                      fontSize: "30px",
                    }}
                  />
                </div>
              </div>

              <div className="widget">
                <div className="left">
                  <span className="title">
                    <strong>{searchTermSku.brand_name} </strong>Vendors:
                  </span>
                  {brandData.length > 0 && (
                    <span className="counter" style={{ fontSize: 18 }}>
                      {brandData[0].vendors}
                    </span>
                  )}
                </div>
                <div className="right">
                  <MonetizationOnOutlinedIcon
                    className="icon"
                    style={{
                      backgroundColor: "rgba(218, 165, 32, 0.2)",
                      color: "goldenrod",
                      fontSize: "30px",
                    }}
                  />
                </div>
              </div>


              <div className="widget">
                <div className="left">
                  <span className="title">
                    <strong>{searchTermSku.brand_name} </strong>Price Range:
                  </span>
                  <span className="counter">
                    ${minPrice} -${maxPrice}{" "}
                  </span>
                </div>
                <div className="right">
                  <MonetizationOnOutlinedIcon
                    className="icon"
                    style={{
                      backgroundColor: "rgba(218, 165, 32, 0.2)",
                      color: "goldenrod",
                      fontSize: "30px",
                    }}
                  />
                </div>
              </div>

              <div className="widget">
                <div className="left">
                  <span className="title">
                    <strong>{searchTermSku.brand_name} </strong>Price Average:
                  </span>
                  <span className="counter">${averagePrice.toFixed(2)}</span>
                </div>
                <div className="right">
                  <MonetizationOnOutlinedIcon
                    className="icon"
                    style={{
                      backgroundColor: "rgba(0, 128, 0, 0.2)",
                      color: "green",
                      fontSize: "30px",
                    }}
                  />
                </div>
              </div>

              {/* <h5>Vendors for this Brand: {brandData[0].vendors}</h5> */}
            </div>
    
                   )}

            <Table
              {...tableProps}
              dataSource={brandData}
              columns={columns_by_sku}
              // columns={columns_brands}
              rowKey="sku"
              size="large"
              components={{
                header: {
                  cell: ResizableTitle,
                },
              }}
              pagination={{
                // pageSize: 20,
                //move to top
                position: ["topRight"],
                //change font color
      
              }}
              loading={loading}
              scroll={{ y: 1000 }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const productsByBrand = [
  {
    sku: "BST-56820-15",
    name: "BESTOP Trektop NX With Tinted Windows In Black Denim For 1997-06 Jeep Wrangler TJ Models 56820-15",
    price: 1444.95,
    image:
      "https://www.justjeeps.com/pub/media/catalog/product//5/6/56820-15.jpg",
    brand_name: "BESTOP",
    vendorProducts: [
      {
        product_sku: "BST-56820-15",
        vendor_sku: "BES56820-15",
        vendor_cost: 1003.57,
        vendor_inventory: 7,
        vendor: {
          name: "Meyer",
        },
      },
      {
        product_sku: "BST-56820-15",
        vendor_sku: "D345682015",
        vendor_cost: 956.27,
        vendor_inventory: 1,
        vendor: {
          name: "Keystone",
        },
      },
    ],
    competitorProducts: [],
  },
  {
    sku: "BST-56820-35",
    name: "BESTOP Trektop NX With Tinted Windows In Black Diamond For 1997-06 Jeep Wrangler TJ Models 56820-35",
    price: 1417.95,
    image:
      "https://www.justjeeps.com/pub/media/catalog/product//5/6/56820-35.jpg",
    brand_name: "BESTOP",
    vendorProducts: [
      {
        product_sku: "BST-56820-35",
        vendor_sku: "BES56820-35",
        vendor_cost: 1003.57,
        vendor_inventory: 97,
        vendor: {
          name: "Meyer",
        },
      },
      {
        product_sku: "BST-56820-35",
        vendor_sku: "D345682035",
        vendor_cost: 956.27,
        vendor_inventory: 58,
        vendor: {
          name: "Keystone",
        },
      },
    ],
    competitorProducts: [
      {
        competitor_price: 1205.99,
        product_url:
          "https://www.northridge4x4.ca/part/soft-tops/56820-35-bestop-black-diamond-trektop-soft-top",
        competitor: {
          name: "Northridge 4x4",
        },
      },
    ],
  },
  {
    sku: "BST-56822-35",
    name: "Discontinued: Bestop (Black Diamond) Trektop NX With Tinted Windows For 2007-18 Jeep Wrangler JK 2 Door Models 56822-35",
    price: 792.95,
    image:
      "https://www.justjeeps.com/pub/media/catalog/product//5/6/56822-2.jpg",
    brand_name: "BESTOP",
    vendorProducts: [
      {
        product_sku: "BST-56822-35",
        vendor_sku: "BES56822-35",
        vendor_cost: 725.39,
        vendor_inventory: 0,
        vendor: {
          name: "Meyer",
        },
      },
      {
        product_sku: "BST-56822-35",
        vendor_sku: "D345682235",
        vendor_cost: 671.27,
        vendor_inventory: 16,
        vendor: {
          name: "Keystone",
        },
      },
    ],
    competitorProducts: [],
  },
  {
    sku: "BST-56823-35",
    name: "DIS: Bestop (Black Diamond) Trektop NX With Tinted Windows For 2007-18 Jeep Wrangler JK Unlimited 4 Door Models 56823-35",
    price: 823.95,
    image:
      "https://www.justjeeps.com/pub/media/catalog/product//5/6/56823-35a.jpg",
    brand_name: "BESTOP",
    vendorProducts: [
      {
        product_sku: "BST-56823-35",
        vendor_sku: "BES56823-35",
        vendor_cost: 836.88,
        vendor_inventory: 0,
        vendor: {
          name: "Meyer",
        },
      },
      {
        product_sku: "BST-56823-35",
        vendor_sku: "D345682335",
        vendor_cost: 774.45,
        vendor_inventory: 56,
        vendor: {
          name: "Keystone",
        },
      },
    ],
    competitorProducts: [],
  },
  {
    sku: "BUB-176610EXT",
    name: "Bubba Rope 10' Extension Rope 7/8\" x 10' With A 28,600 lbs. Breaking Strength",
    price: 251.95,
    image:
      "https://www.justjeeps.com/pub/media/catalog/product//1/7/176610ext.jpg",
    brand_name: "Bubba Rope",
    vendorProducts: [
      {
        product_sku: "BUB-176610EXT",
        vendor_sku: "BUB176610EXT",
        vendor_cost: 172.31,
        vendor_inventory: 0,
        vendor: {
          name: "Meyer",
        },
      },
    ],
    competitorProducts: [],
  },
  {
    sku: "BUB-176000OR",
    name: "Bubba Rope (10FT Length) Tree Hugger With A 47,000 lbs. Breaking Strength",
    price: 132.95,
    image: null,
    brand_name: "Bubba Rope",
    vendorProducts: [
      {
        product_sku: "BUB-176000OR",
        vendor_sku: "BUB176000OR",
        vendor_cost: 97.65,
        vendor_inventory: 9,
        vendor: {
          name: "Meyer",
        },
      },
    ],
    competitorProducts: [
      {
        competitor_price: 113.9,
        product_url:
          "https://www.northridge4x4.ca/part/straps/176000or-bubba-rope-tree-hugger",
        competitor: {
          name: "Northridge 4x4",
        },
      },
    ],
  },
  {
    sku: "BUB-176756X100",
    name: "Bubba Rope 100' Winch Line Replacement 3/8\" x 100' For 9,000 lbs - 10,000 lbs Winches",
    price: 844.95,
    image: null,
    brand_name: "Bubba Rope",
    vendorProducts: [
      {
        product_sku: "BUB-176756X100",
        vendor_sku: "BUB176756X100",
        vendor_cost: 620.33,
        vendor_inventory: 0,
        vendor: {
          name: "Meyer",
        },
      },
    ],
    competitorProducts: [
      {
        competitor_price: 723.6,
        product_url:
          "https://www.northridge4x4.ca/part/winch-lines/176756x100-bubba-rope-100ft-winch-replacement-line",
        competitor: {
          name: "Northridge 4x4",
        },
      },
    ],
  },
  {
    sku: "BUB-176016OR",
    name: "Bubba Rope (16FT Length) Tree Hugger With A 47,000 lbs. Breaking Strength",
    price: 148.95,
    image: null,
    brand_name: "Bubba Rope",
    vendorProducts: [
      {
        product_sku: "BUB-176016OR",
        vendor_sku: "BUB176016OR",
        vendor_cost: 109.13,
        vendor_inventory: 8,
        vendor: {
          name: "Meyer",
        },
      },
    ],
    competitorProducts: [
      {
        competitor_price: 127.3,
        product_url:
          "https://www.northridge4x4.ca/part/straps/176016or-bubba-rope-tree-hugger-16ft",
        competitor: {
          name: "Northridge 4x4",
        },
      },
    ],
  },
  {
    sku: "BUB-176757",
    name: "Bubba Rope 25' Winch Line Extension 3/8\" x 25' With A 17,200 lbs. Breaking Strength",
    price: 333.95,
    image:
      "https://www.justjeeps.com/pub/media/catalog/product//1/7/176757.jpeg",
    brand_name: "Bubba Rope",
    vendorProducts: [
      {
        product_sku: "BUB-176757",
        vendor_sku: "BUB176757",
        vendor_cost: 228.61,
        vendor_inventory: 1,
        vendor: {
          name: "Meyer",
        },
      },
    ],
    competitorProducts: [],
  },
  {
    sku: "BUB-176756",
    name: "Bubba Rope 50' Winch Line Extension 3/8\" x 50' With A 17,200 lbs. Breaking Strength",
    price: 526.95,
    image:
      "https://www.justjeeps.com/pub/media/catalog/product//1/7/176756.jpeg",
    brand_name: "Bubba Rope",
    vendorProducts: [
      {
        product_sku: "BUB-176756",
        vendor_sku: "BUB176756",
        vendor_cost: 359.56,
        vendor_inventory: 0,
        vendor: {
          name: "Meyer",
        },
      },
    ],
    competitorProducts: [],
  },
];


const brands = [
  {"brand_name": "A"},
  {"brand_name": "4WP"},
  {"brand_name": "Attica 4x4"},
  {"brand_name": "Accuair"},
  {"brand_name": "AccuPart"},
  {"brand_name": "Adams Driveshaft"},
  {"brand_name": "Addictive Desert Designs"},
  {"brand_name": "Addco"},
  {"brand_name": "Advance Adapters"},
  {"brand_name": "Advance Accessory Concepts"},
  {"brand_name": "AEM"},
  {"brand_name": "aFe Power"},
  {"brand_name": "AIRAID"},
  {"brand_name": "AirBedz"},
  {"brand_name": "Air Design"},
  {"brand_name": "AJT Design"},
  {"brand_name": "Alloy USA"},
  {"brand_name": "Alpine"},
  {"brand_name": "American Expedition Vehicles (MAP)"},
  {"brand_name": "American Outlaw"},
  {"brand_name": "American Racing"},
  {"brand_name": "American Trail Products"},
  {"brand_name": "AMI Styling"},
  {"brand_name": "AMP Research"},
  {"brand_name": "AMP Tires"},
  {"brand_name": "ANCO"},
  {"brand_name": "ANZO USA"},
  {"brand_name": "AO Coolers"},
  {"brand_name": "ARB"},
  {"brand_name": "A.R.E."},
  {"brand_name": "Aries Automotive"},
  {"brand_name": "Armorlite"},
  {"brand_name": "Artec Industries"},
  {"brand_name": "Automotive Gold"},
  {"brand_name": "Autowatch Canada - DO NOT NEED TO UPDATE"},
  {"brand_name": "Auto Custom Carpets"},
  {"brand_name": "Auto Rust Technicians - do not need to update"},
  {"brand_name": "Armordillo"},
  {"brand_name": "Auto Ventshade"},
  {"brand_name": "AWE Exhaust"},
  {"brand_name": "Be Cool"},
  {"brand_name": "Baja Designs"},
  {"brand_name": "Baer"},
  {"brand_name": "Banks Power"},
  {"brand_name": "Baxter Performance"},
  {"brand_name": "BBK Performance"},
  {"brand_name": "BDS Suspension"},
  {"brand_name": "BedRug"},
  {"brand_name": "BESTOP"},
  {"brand_name": "BF Goodrich Tires"},
  {"brand_name": "Bilstein"},
  {"brand_name": "Black Horse Offroad"},
  {"brand_name": "Black Rhino"},
  {"brand_name": "Black Rock Wheels"},
  {"brand_name": "Blue Ox"},
  {"brand_name": "Body Armor 4x4"},
  {"brand_name": "Bolt Lock"},
  {"brand_name": "Boom Mat"},
  {"brand_name": "Boomerang Enterprises"},
  {"brand_name": "Borgeson"},
  {"brand_name": "Borla Performance"},
  {"brand_name": "Brand Motion"},
  {"brand_name": "Briidea"},
  {"brand_name": "Bridgestone"},
  {"brand_name": "Bubba Rope"},
  {"brand_name": "BUSHWACKER"},
  {"brand_name": "Camco"},
  {"brand_name": "Carnivore"},
  {"brand_name": "CARR"},
  {"brand_name": "CargoGlide"},
  {"brand_name": "CAT"},
  {"brand_name": "Centerforce"},
  {"brand_name": "Cervini's Auto Design"},
  {"brand_name": "Chemical Guys"},
  {"brand_name": "ClearlidZ"},
  {"brand_name": "Classic Tube"},
  {"brand_name": "Cliffride"},
  {"brand_name": "Cobra Electronics"},
  {"brand_name": "Cooper Tires"},
  {"brand_name": "Corbeau"},
  {"brand_name": "Corsa Performance"},
  {"brand_name": "Covercraft"},
  {"brand_name": "Cross Canada"},
  {"brand_name": "Combat Off Road"},
  {"brand_name": "Crown Automotive"},
  {"brand_name": "Crown Performance"},
  {"brand_name": "Crawltek Revolution"},
  {"brand_name": "Currie Enterprises"},
  {"brand_name": "Curt Manufacturing"},
  {"brand_name": "D&C Designs"},
  {"brand_name": "Dana Spicer"},
  {"brand_name": "Daystar"},
  {"brand_name": "Decked"},
  {"brand_name": "DeeZee"},
  {"brand_name": "Diode Dynamics"},
  {"brand_name": "Dirty Dog 4X4"},
  {"brand_name": "Design Engineering"},
  {"brand_name": "Derale Performance"},
  {"brand_name": "Dirty Life"},
  {"brand_name": "Diver Down"},
  {"brand_name": "Dometic"},
  {"brand_name": "Dorman"},
  {"brand_name": "Draw-Tite"},
  {"brand_name": "Dunlop"},
  {"brand_name": "DU-HA"},
  {"brand_name": "DV8 OffRoad"},
  {"brand_name": "Dynatrac"},
  {"brand_name": "DynoMax Exhaust"},
  {"brand_name": "EATON"},
  {"brand_name": "EBC Brakes"},
  {"brand_name": "Electric Life"},
  {"brand_name": "Eibach Springs"},
  {"brand_name": "EGR"},
  {"brand_name": "Element - Fire Extinguishers"},
  {"brand_name": "Enthuze Truck Accessories"},
  {"brand_name": "Energy Suspension"},
  {"brand_name": "EVO Manufacturing"},
  {"brand_name": "Excalibur"},
  {"brand_name": "Exposed Racks"},
  {"brand_name": "Extang"},
  {"brand_name": "ExoShield ULTRA"},
  {"brand_name": "EZ 4X4"},
  {"brand_name": "Fab Fours"},
  {"brand_name": "Fabtech"},
  {"brand_name": "Factor 55"},
  {"brand_name": "Fairchild Industries"},
  {"brand_name": "Falken WildPeak"},
  {"brand_name": "Faulkner"},
  {"brand_name": "Front Runner"},
  {"brand_name": "Fifteen52"},
  {"brand_name": "Firestone"},
  {"brand_name": "Firestone Airide"},
  {"brand_name": "Fishbone Offroad"},
  {"brand_name": "FlowMaster"},
  {"brand_name": "Flex-A-Lite"},
  {"brand_name": "Focus Auto Design"},
  {"brand_name": "Fox Racing"},
  {"brand_name": "Free Spirit Recreation"},
  {"brand_name": "Fuel Off-Road"},
  {"brand_name": "Full Auto"},
  {"brand_name": "Gate King"},
  {"brand_name": "G2 Axle & Gear"},
  {"brand_name": "Garage Smart"},
  {"brand_name": "Garvin Wilderness"},
  {"brand_name": "Genright Off Road"},
  {"brand_name": "Gibson Performance"},
  {"brand_name": "Go Rhino"},
  {"brand_name": "GOODYEAR"},
  {"brand_name": "Gorilla Automotive"},
  {"brand_name": "Grant Products"},
  {"brand_name": "Griffin Radiator"},
  {"brand_name": "Grote"},
  {"brand_name": "GT Styling"},
  {"brand_name": "Harken Hoister"},
  {"brand_name": "Havoc Offroad"},
  {"brand_name": "Heininger Automotive"},
  {"brand_name": "HELLA"},
  {"brand_name": "Holley"},
  {"brand_name": "Hellwig Suspension"},
  {"brand_name": "Hi-Lift Jack"},
  {"brand_name": "Hopkins"},
  {"brand_name": "Husky Liners"},
  {"brand_name": "Husky Towing Products"},
  {"brand_name": "HyLine OffRoad"},
  {"brand_name": "Hypertech"},
  {"brand_name": "INJEN"},
  {"brand_name": "ION Alloy Wheels"},
  {"brand_name": "In Pro Carwear"},
  {"brand_name": "IRONMAN 4x4"},
  {"brand_name": "INSYNC"},
  {"brand_name": "Iron Cross"},
  {"brand_name": "J.W. Speaker"},
  {"brand_name": "Jammock"},
  {"brand_name": "JBA Performance Exhaust"},
  {"brand_name": "Jeep"},
  {"brand_name": "Jeep Tweaks"},
  {"brand_name": "Jet Performance"},
  {"brand_name": "JKS Manufacturing"},
  {"brand_name": "Just Jeeps"},
  {"brand_name": "Kenda"},
  {"brand_name": "K&N"},
  {"brand_name": "KC HILITES"},
  {"brand_name": "Kentrol"},
  {"brand_name": "KeyParts"},
  {"brand_name": "Kicker Jeep Audio & Electronics"},
  {"brand_name": "King Off Road"},
  {"brand_name": "Kleinn"},
  {"brand_name": "KMC Wheels"},
  {"brand_name": "Krystal Kleer"},
  {"brand_name": "Kumho"},
  {"brand_name": "Lange Originals"},
  {"brand_name": "Let's Go Aero"},
  {"brand_name": "LoD Offroad"},
  {"brand_name": "Lost Canyon"},
  {"brand_name": "Lube Locker"},
  {"brand_name": "Luno"},
  {"brand_name": "LUK Clutches"},
  {"brand_name": "Lumatron"},
  {"brand_name": "Lynx"},
  {"brand_name": "Luverne"},
  {"brand_name": "MACPEK"},
  {"brand_name": "MagnaFlow"},
  {"brand_name": "Magnum by Raptor Series"},
  {"brand_name": "Mamba Offroad"},
  {"brand_name": "MasterTop"},
  {"brand_name": "Max-Bilt"},
  {"brand_name": "Maxxis"},
  {"brand_name": "Mayhem Wheels"},
  {"brand_name": "MBRP Inc"},
  {"brand_name": "MCE"},
  {"brand_name": "McGard Wheel Locks"},
  {"brand_name": "MD Juan"},
  {"brand_name": "Mile Marker"},
  {"brand_name": "Method Race Wheels"},
  {"brand_name": "Meyer Products"},
  {"brand_name": "Michelin"},
  {"brand_name": "MICKEY THOMPSON Tires/Wheels"},
  {"brand_name": "Mirage Unlimited"},
  {"brand_name": "mPower"},
  {"brand_name": "Misch 4x4"},
  {"brand_name": "Mishimoto"},
  {"brand_name": "MONROE Shocks & Struts"},
  {"brand_name": "MOOG"},
  {"brand_name": "MOPAR"},
  {"brand_name": "Morimoto"},
  {"brand_name": "MORryde"},
  {"brand_name": "Motive Gear"},
  {"brand_name": "Motor City Aftermarket"},
  {"brand_name": "Mountain Offroad"},
  {"brand_name": "Nacho Offroad Lighting"},
  {"brand_name": "N-Fab"},
  {"brand_name": "Napier Sportz"},
  {"brand_name": "NGK"},
  {"brand_name": "Nitto Tire"},
  {"brand_name": "NOCO"},
  {"brand_name": "Novak Conversions"},
  {"brand_name": "Nokian Tyres"},
  {"brand_name": "ODYSSEY Battery"},
  {"brand_name": "OFFGRID"},
  {"brand_name": "Old Man Emu"},
  {"brand_name": "OMIX-ADA"},
  {"brand_name": "Optima Batteries"},
  {"brand_name": "Oracle Lighting"},
  {"brand_name": "Outback Adventures"},
  {"brand_name": "Overland Outfitters"},
  {"brand_name": "Overland Vehicle Systems"},
  {"brand_name": "Overtread"},
  {"brand_name": "Pacer Performance Products"},
  {"brand_name": "PPR Industries"},
  {"brand_name": "Paramount Automotive"},
  {"brand_name": "Pavement Ends"},
  {"brand_name": "Pedal Commander"},
  {"brand_name": "Phoenix Graphix"},
  {"brand_name": "PIAA"},
  {"brand_name": "Pilot Automotive"},
  {"brand_name": "Plasticolor"},
  {"brand_name": "Poison Spyder Customs"},
  {"brand_name": "POR-15"},
  {"brand_name": "Power Stop"},
  {"brand_name": "Power Trax"},
  {"brand_name": "Precision Replacement Parts"},
  {"brand_name": "PRO COMP Alloy Wheels"},
  {"brand_name": "PRO COMP Steel Wheels"},
  {"brand_name": "PRO COMP Suspension"},
  {"brand_name": "Pro Comp Tires"},
  {"brand_name": "Pro Eagle"},
  {"brand_name": "Pro Series"},
  {"brand_name": "ProMaxx Automotive"},
  {"brand_name": "PSC Steering"},
  {"brand_name": "Putco"},
  {"brand_name": "Quadratec"},
  {"brand_name": "QuadraTop"},
  {"brand_name": "Quake LED"},
  {"brand_name": "RainX"},
  {"brand_name": "Rampage Products"},
  {"brand_name": "Rancho"},
  {"brand_name": "Ranch Hand"},
  {"brand_name": "ReadyLIFT"},
  {"brand_name": "Reaper Off-Road"},
  {"brand_name": "Recon"},
  {"brand_name": "RES-Q"},
  {"brand_name": "Rhino-Rack"},
  {"brand_name": "Revolution Gear"},
  {"brand_name": "Rightline Gear"},
  {"brand_name": "Rigid Industries"},
  {"brand_name": "Ripp Supercharger"},
  {"brand_name": "Rival 4x4"},
  {"brand_name": "Road Armor"},
  {"brand_name": "Roam Adventure Co."},
  {"brand_name": "RockJock"},
  {"brand_name": "Rockagator"},
  {"brand_name": "RockNob"},
  {"brand_name": "Rock Hard 4X4"},
  {"brand_name": "Rock Krawler Suspension"},
  {"brand_name": "Rock Slide Engineering"},
  {"brand_name": "Rolling Big Power"},
  {"brand_name": "Roll-N-Lock by RealTruck"},
  {"brand_name": "Romik"},
  {"brand_name": "RotoPax"},
  {"brand_name": "Rox Offroad"},
  {"brand_name": "Rough Country"},
  {"brand_name": "RSI"},
  {"brand_name": "RT Off-Road"},
  {"brand_name": "RTX Wheels"},
  {"brand_name": "Rubicon Express"},
  {"brand_name": "Rugged Radios"},
  {"brand_name": "Rugged Ridge"},
  {"brand_name": "Rust Buster"},
  {"brand_name": "S&B Filters"},
  {"brand_name": "Safety Seal"},
  {"brand_name": "Sailun Tires"},
  {"brand_name": "Savvy Off Road"},
  {"brand_name": "SeaSucker"},
  {"brand_name": "Seatbelt Solutions"},
  {"brand_name": "Scosche"},
  {"brand_name": "Schumacher"},
  {"brand_name": "Skyjacker Suspension"},
  {"brand_name": "sPOD"},
  {"brand_name": "Sylvania"},
  {"brand_name": "Smittybilt"},
  {"brand_name": "SpeedFX"},
  {"brand_name": "SpiderTrax"},
  {"brand_name": "Surco"},
  {"brand_name": "SpiderWebShade"},
  {"brand_name": "Sprint Booster"},
  {"brand_name": "Spyder Automotive"},
  {"brand_name": "Steer Smarts"},
  {"brand_name": "Stinger Off-Road"},
  {"brand_name": "Stromberg Carlson Products"},
  {"brand_name": "Superchips"},
  {"brand_name": "Superlift"},
  {"brand_name": "Superwinch"},
  {"brand_name": "Super Swamper"},
  {"brand_name": "Surco"},
  {"brand_name": "Switch-Pros"},
  {"brand_name": "Synergy MFG"},
  {"brand_name": "TACTIK"},
  {"brand_name": "T-Rex"},
  {"brand_name": "TecStyle"},
  {"brand_name": "Tekonsha"},
  {"brand_name": "TeraFlex"},
  {"brand_name": "THIBERT"},
  {"brand_name": "Thule Racks"},
  {"brand_name": "Timbren"},
  {"brand_name": "Tom Woods"},
  {"brand_name": "Toyo Tires"},
  {"brand_name": "Trail Head Customs (don`t need to update)"},
  {"brand_name": "Thor's Lightning Air Systems"},
  {"brand_name": "Trail Master"},
  {"brand_name": "Trimax"},
  {"brand_name": "TrailFX"},
  {"brand_name": "Tru-Fit"},
  {"brand_name": "Truxedo"},
  {"brand_name": "Tuff Stuff 4x4"},
  {"brand_name": "Turn Offroad"},
  {"brand_name": "Tuffy Products"},
  {"brand_name": "Tyger Auto"},
  {"brand_name": "TuxMat"},
  {"brand_name": "Up Down Air"},
  {"brand_name": "Undercover"},
  {"brand_name": "UWS Storage"},
  {"brand_name": "Under The Sun"},
  {"brand_name": "Vertically Driven Products"},
  {"brand_name": "VersaHitch"},
  {"brand_name": "Viair"},
  {"brand_name": "Vivid Lumen"},
  {"brand_name": "Vision X"},
  {"brand_name": "WARN"},
  {"brand_name": "Warrior Products"},
  {"brand_name": "Walker Exhaust"},
  {"brand_name": "WeatherTech (MAP)"},
  {"brand_name": "Westin Automotive"},
  {"brand_name": "WestCoast Wheel Accessories"},
  {"brand_name": "Wilco Offroad"},
  {"brand_name": "XENON"},
  {"brand_name": "XK Glow"},
  {"brand_name": "XG Cargo"},
  {"brand_name": "YAKIMA"},
  {"brand_name": "YKW"},
  {"brand_name": "Yokohama"},
  {"brand_name": "Yukon"},
  {"brand_name": "Z Automotive"},
  {"brand_name": "Zone Offroad"},
  {"brand_name": "ZROADZ"},
  {"brand_name": "Auto Meter"},
  {"brand_name": "Bridgestone"},
  {"brand_name": "Bully Truck"},
  {"brand_name": "Cold Case"},
  {"brand_name": "Coyote Wheel"},
  {"brand_name": "Catamount"},
  {"brand_name": "Goodyear"},
  {"brand_name": "Jeep Tweaks"},
  {"brand_name": "MetalCloak"},
  {"brand_name": "MAXTRAX"},
  {"brand_name": "Pro Comp Tire"},
  {"brand_name": "Performance Distributors"},
  {"brand_name": "Prothane Motion Control"},
  {"brand_name": "RCV Performance"},
  {"brand_name": "Ten Factory"},
  {"brand_name": "Thret Offroad"},
  {"brand_name": "Trigger"},
  {"brand_name": "Valeo"}
];
