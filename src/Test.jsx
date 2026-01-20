import React, { useState, useEffect } from "react";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import { Table, Button, Tag, Drawer, InputNumber } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import axios from "axios";
import ExcelJS from "exceljs";
import saveAs from "file-saver";
import "./items.scss";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import { fontSize } from "@mui/system";

export const Items = () => {
  const [data, setData] = useState([]);
  const [searchBy, setSearchBy] = useState("sku"); // default search by SKU
  const [searchTermSku, setSearchTermSku] = useState("");
  const [sku, setSku] = useState([]);
  const [brandData, setBrandData] = useState([]);
  const [loading, setLoading] = useState(false);
	//create a state for promotion simulation, where the user can enter the %off and the new price will be calculated

  const onChange = (value) => {
    console.log('changed', value);
  };

    const API_URL = import.meta.env.VITE_API_URL;

  


  function getProductsByBrand(products, brandName) {
    return products.filter(
      (product) =>
        product.brand_name === brandName &&
        product.status === 1 &&
        product.price !== 0
    );
  }

  const prices = brandData.reduce((acc, product) => {
    acc.push(product.price);
    return acc;
  }, []);


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
            // console.log('Data from backend:', responseData);
            // Process the response data from backend if needed
            setSku([...responseData]);
          });
      } catch (error) {
        console.error("Failed to fetch data from backend:", error);
      }
    };
    getAllSkus();
  }, []);

  const handleSearchByChange = (event) => {
    setSearchBy(event.target.value);
  };

  const handleSearchTermChange = (event) => {
    setSearchTermSku(event.target.value);
  };

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
          render: (image) => <img src={image} alt="Product" width="50" />,
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
          //add $ sign to price
          render: (price) => <div>{`$${price}`}</div>,
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
              <div key={vendorProduct.id}>{vendorProduct.vendor.name}</div>
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
              >{`$${vendorProduct.vendor_cost}`}</div>
            )),
        },
        {
          title: "Margin %",
          key: "margin",
          align: "center",
          render: (record) => {
            const { price, vendorProducts } = record;
            return vendorProducts.map((vendorProduct) => {
              const { vendor_cost } = vendorProduct;
              const margin = ((price - vendor_cost) / vendor_cost) * 100;
              const className = margin < 20 ? "red-margin" : "";
              return (
                <div
                  key={vendorProduct.vendor_id}
                  className={className}
                >{`${margin.toFixed(0)}%`}</div>
              );
            });
          },
        },
        {
          title: "Inventory",
          dataIndex: "vendorProducts",
          key: "vendor_inventory",
          align: "center",
          render: (vendorProducts) =>
            vendorProducts.map((vendorProduct) => (
              <div key={vendorProduct.id}>{vendorProduct.vendor_inventory}</div>
            )),
        },
      ],
    },
    {
      title: "Suggested Vendor",
      dataIndex: "vendorProducts",
      key: "lowest_cost",
      align: "center",
      render: (vendorProducts, record) => {
        const vendorsWithInventory = vendorProducts.filter(
          (vp) => vp.vendor_inventory > 0
        );
        if (vendorsWithInventory.length === 0) {
          return "-";
        }
        const minVendorProduct = vendorsWithInventory.reduce((min, curr) => {
          if (curr.vendor_cost < min.vendor_cost) {
            return curr;
          }
          return min;
        }, vendorsWithInventory[0]);

        const margin =
          ((record.price - minVendorProduct.vendor_cost) / record.price) * 100;

        return (
          <div>
            <div>{minVendorProduct.vendor.name}</div>
            <div>{`$${minVendorProduct.vendor_cost}`}</div>
            <div> {`${margin.toFixed(0)}%`} </div>
          </div>
        );
      },
    },
    // {
    //   title: "Vendor SKU   ",
    //   dataIndex: "vendorProducts",
    //   key: "vendor_sku",
    //   align: "center",
    //   render: (vendorProducts) =>
    //     vendorProducts.map((vendorProduct) => (
    //       <div key={vendorProduct.id}>{vendorProduct.vendor_sku}</div>
    //     )),
    // },
    // {
    //   title: "Competitor Price",
    //   dataIndex: "competitorProducts",
    //   key: "competitor_price",
    //   align: "center",
    //   render: (competitorProducts) =>
    //     competitorProducts.length > 0 ? (
    //       <div
    //         key={competitorProducts[0].id}
    //       >{`$${competitorProducts[0].competitor_price}`}</div>
    //     ) : (
    //       "-"
    //     ),
    // },
  ];

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
              <Autocomplete
                {...skus_for_autocomplete}
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
                    label="Search SKU"
                    variant="standard"
                    onChange={handleSearchTermChange}
                  />
                )}
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
            </div>
          )}
        </div>
      </div>

      <div className="explore-content">
        {searchBy === "sku" ? (
          <Table
            dataSource={data}
            columns={columns_by_sku}
            rowKey="sku"
            pagination={false} // Change pageSize as needed
            title={() => (
              <tfoot>
                <tr>
                  <th colSpan={5}>
                    {data.length > 0 && (
                      <h5>Vendors for this Brand:..... {data[0].vendors}</h5>
                    )}
                  </th>
                </tr>
              </tfoot>
            )}
          />
        ) : (
          <div>
            <div className="brand-statistic">
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
                    <span className="counter" style={{ fontSize: 22 }}>
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
            </div>

            <Table
              {...tableProps}
              dataSource={brandData}
              columns={columns_brands}
              rowKey="sku"
              pagination={{
                pageSize: 20,
              }}
              loading={loading}
            />
          </div>
        )}
      </div>
    </div>
  );
};


