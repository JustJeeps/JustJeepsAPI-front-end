import React, {useState, useEffect} from 'react';
import { Table, Input } from 'antd';
import axios from 'axios';


const SkuTable = () => {
  const [data, setData] = useState([]);
  // const BACKEND_URL = "https://jj-api-backend.herokuapp.com";
  // const BACKEND_URL = "  https://1ff8-2607-fea8-58df-feb0-242d-ae03-2e-322c.ngrok-free.app";

  const BACKEND_URL = "http://localhost:8080"; 
  const API_URL = import.meta.env.VITE_API_URL;


  useEffect(() => {
    const getProductbysku = async () => {
      try {
         const res = await axios.get(`${API_URL}/api/products/BST-56820-15`);
         const responseData = res.data;
         console.log('Data from backend ....:', responseData);
         // Process the response data from backend if needed
         if (responseData) {
           setData([responseData]);
         }
      } catch (error) {
        console.error('Failed to fetch data from backend:', error);
      }
    };
    getProductbysku();
  }, []);

  console.log('Data after', data);

  // Define columns for the table
  const columns = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
    },
    {
      title: 'Image',
      dataIndex: 'image',
      key: 'image',
      render: (image) => <img src={image} alt="Product" width="50" />,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price, record) => (
        <Input
          value={price}
          onChange={(e) => handlePriceChange(e, record.sku)}
          style={{ width: 80 }}
          prefix="$"
        />
      ),
    },
    {
      title: 'Vendor Name',
      dataIndex: 'vendorProducts',
      key: 'vendor_id',
      render: (vendorProducts) =>
        vendorProducts.map((vendorProduct) => (
          <div key={vendorProduct.id}>{vendorProduct.vendor.name}</div>
        )),
    },
    {
      title: 'Vendor Cost',
      dataIndex: 'vendorProducts',
      key: 'vendor_cost',
      render: (vendorProducts) =>
        vendorProducts.map((vendorProduct) => (
          <div key={vendorProduct.id}>{`$${vendorProduct.vendor_cost}`}</div>
        )),
    },
    {
      title: 'Margin %',
      key: 'margin',
      render: (record) => {
        const { price, vendorProducts } = record;
        return vendorProducts.map((vendorProduct) => {
          const { vendor_cost } = vendorProduct;
          const margin = ((price - vendor_cost) / vendor_cost) * 100;
          return <div key={vendorProduct.vendor_id}>{`${margin.toFixed(2)}%`}</div>;
        });
      },
    },
    {
      title: 'Vendor Inventory',
      dataIndex: 'vendorProducts',
      key: 'vendor_inventory',
      render: (vendorProducts) =>
        vendorProducts.map((vendorProduct) => (
          <div key={vendorProduct.id}>{vendorProduct.vendor_inventory}</div>
        )),
    },
    {
      title: 'Vendor SKU   ',
      dataIndex: 'vendorProducts',
      key: 'vendor_sku',
      render: (vendorProducts) =>
        vendorProducts.map((vendorProduct) => (
          <div key={vendorProduct.id}>{vendorProduct.vendor_sku}</div>
        )),
    },
    {
      title: 'Competitor Price',
      dataIndex: 'competitorProducts',
      key: 'competitor_price',
      render: (competitorProducts) =>
        competitorProducts.length > 0 ? (
          <div key={competitorProducts[0].id}>{`$${competitorProducts[0].competitor_price}`}</div>
        ) : (
          '-'
        ),
    },
  ];

  const columns_brands = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
    },
    {
      title: 'Image',
      dataIndex: 'image',
      key: 'image',
      render: (image) => <img src={image} alt="Product" width="50" />,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price, record) => (
        <Input
          value={price}
          onChange={(e) => handlePriceChange(e, record.sku)}
          style={{ width: 80 }}
          prefix="$"
        />
      ),
    },
    {
      title: 'Vendor Name',
      dataIndex: 'vendorProducts',
      key: 'vendor_id',
      render: (vendorProducts) =>
      
        vendorProducts.map((vendorProduct) => (
          <div key={vendorProduct.id}>{vendorProduct.vendor.name}</div>
        )),
    },
    {
      title: 'Vendor Cost',
      dataIndex: 'vendorProducts',
      key: 'vendor_cost',
      render: (vendorProducts) =>
        vendorProducts.map((vendorProduct) => (
          <div key={vendorProduct.id}>{`$${vendorProduct.vendor_cost}`}</div>
        )),
    },
    {
      title: 'Margin %',
      key: 'margin',
      render: (record) => {
        const { price, vendorProducts } = record;
        return vendorProducts.map((vendorProduct) => {
          const { vendor_cost } = vendorProduct;
          const margin = ((price - vendor_cost) / vendor_cost) * 100;
          return <div key={vendorProduct.vendor_id}>{`${margin.toFixed(2)}%`}</div>;
        });
      },
    },
    {
      title: 'Vendor Inventory',
      dataIndex: 'vendorProducts',
      key: 'vendor_inventory',
      render: (vendorProducts) =>
        vendorProducts.map((vendorProduct) => (
          <div key={vendorProduct.id}>{vendorProduct.vendor_inventory}</div>
        )),
    },
    {
      title: 'Vendor SKU',
      dataIndex: 'vendorProducts',
      key: 'vendor_sku',
      render: (vendorProducts) =>
        vendorProducts.map((vendorProduct) => (
          <div key={vendorProduct.id}>{vendorProduct.vendor_sku}</div>
        )),
    },
    {
      title: 'Competitor Price',
      dataIndex: 'competitorProducts',
      key: 'competitor_price',
      render: (competitorProducts) =>
        competitorProducts.length > 0 ? (
          <div key={competitorProducts[0].id}>{`$${competitorProducts[0].competitor_price}`}</div>
        ) : (
          '-'
        ),
    },
  ];
  
  return (
    <div>

      <Table
        dataSource={data}
        columns={columns}
        rowKey="sku"
        pagination={{ pageSize: 10 }} // Change pageSize as needed
      />
  
      <Table
      dataSource={productsByBrand}
      columns={columns_brands}
      rowKey="sku"
      pagination={{ pageSize: 10 }} // Change pageSize as needed
    />

    </div>
  );
};

export default SkuTable;

const products = [
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

function getProductsByBrand(products, brandName) {
  return products.filter((product) => product.brand_name === brandName);
}

const bestopProducts = getProductsByBrand(products, 'BESTOP');
console.log(bestopProducts);

const brands = [
  {
  "brand_name": "BESTOP"
  },
  {
  "brand_name": "Bubba Rope"
  },
  {
  "brand_name": "MOPAR"
  },
  {
  "brand_name": "Just Jeeps"
  },
  {
  "brand_name": ""
  },
  {
  "brand_name": "Addictive Desert Designs"
  },
  {
  "brand_name": "Alloy USA"
  },
  {
  "brand_name": "American Expedition Vehicles (MAP)"
  },
  {
  "brand_name": "Air Design"
  },
  {
  "brand_name": "OMIX-ADA"
  },
  {
  "brand_name": "AMP Research"
  },
  {
  "brand_name": "ARB"
  },
  {
  "brand_name": "Aries Automotive"
  },
  {
  "brand_name": "KeyParts"
  },
  {
  "brand_name": "Trail Master"
  },
  {
  "brand_name": "Auto Ventshade"
  },
  {
  "brand_name": "Banks Power"
  },
  {
  "brand_name": "BedRug"
  },
  {
  "brand_name": "BF Goodrich Tires"
  },
  {
  "brand_name": "Bilstein"
  },
  {
  "brand_name": "Black Rock Wheels"
  },
  {
  "brand_name": "Body Armor 4x4"
  },
  {
  "brand_name": "BUSHWACKER"
  },
  {
  "brand_name": "Borgeson"
  },
  {
  "brand_name": "CARR"
  },
  {
  "brand_name": "Smittybilt"
  },
  {
  "brand_name": "Cobra Electronics"
  },
  {
  "brand_name": "Corsa Performance"
  },
  {
  "brand_name": "Crown Automotive"
  },
  {
  "brand_name": "RT Off-Road"
  },
  {
  "brand_name": "Daystar"
  },
  {
  "brand_name": "D&C Designs"
  },
  {
  "brand_name": "EATON"
  },
  {
  "brand_name": "Dana Spicer"
  },
  {
  "brand_name": "Dirty Dog 4X4"
  },
  {
  "brand_name": "Rampage Products"
  },
  {
  "brand_name": "DV8 OffRoad"
  },
  {
  "brand_name": "GOODYEAR"
  },
  {
  "brand_name": "Draw-Tite"
  },
  {
  "brand_name": "Dunlop"
  },
  {
  "brand_name": "DynoMax Exhaust"
  },
  {
  "brand_name": "EBC Brakes"
  },
  {
  "brand_name": "Energy Suspension"
  },
  {
  "brand_name": "Fab Fours"
  },
  {
  "brand_name": "Factor 55"
  },
  {
  "brand_name": "Faulkner"
  },
  {
  "brand_name": "FlowMaster"
  },
  {
  "brand_name": "Fuel Off-Road"
  },
  {
  "brand_name": "Gibson Performance"
  },
  {
  "brand_name": "Go Rhino"
  },
  {
  "brand_name": "Gorilla Automotive"
  },
  {
  "brand_name": "Harken Hoister"
  },
  {
  "brand_name": "HELLA"
  },
  {
  "brand_name": "Hi-Lift Jack"
  },
  {
  "brand_name": "Husky Liners"
  },
  {
  "brand_name": "Hopkins"
  },
  {
  "brand_name": "Hypertech"
  },
  {
  "brand_name": "In Pro Carwear"
  },
  {
  "brand_name": "JBA Performance Exhaust"
  },
  {
  "brand_name": "PSC Steering"
  },
  {
  "brand_name": "J.W. Speaker"
  },
  {
  "brand_name": "K&N"
  },
  {
  "brand_name": "KC HILITES"
  },
  {
  "brand_name": "Kentrol"
  },
  {
  "brand_name": "KMC Wheels"
  },
  {
  "brand_name": "Automotive Gold"
  },
  {
  "brand_name": "Plasticolor"
  },
  {
  "brand_name": "Lange Originals"
  },
  {
  "brand_name": "LUK Clutches"
  },
  {
  "brand_name": "Mountain Offroad"
  },
  {
  "brand_name": "MagnaFlow"
  },
  {
  "brand_name": "MBRP Inc"
  },
  {
  "brand_name": "MICKEY THOMPSON Tires/Wheels"
  },
  {
  "brand_name": "McGard Wheel Locks"
  },
  {
  "brand_name": "Nitto Tire"
  },
  {
  "brand_name": "MOOG"
  },
  {
  "brand_name": "Toyo Tires"
  },
  {
  "brand_name": "Rugged Ridge"
  },
  {
  "brand_name": "Optima Batteries"
  },
  {
  "brand_name": "Pavement Ends"
  },
  {
  "brand_name": "PIAA"
  },
  {
  "brand_name": "Poison Spyder Customs"
  },
  {
  "brand_name": "Power Trax"
  },
  {
  "brand_name": "PRO COMP Alloy Wheels"
  },
  {
  "brand_name": "Pro Series"
  },
  {
  "brand_name": "Putco"
  },
  {
  "brand_name": "Rigid Industries"
  },
  {
  "brand_name": "Rancho"
  },
  {
  "brand_name": "Rhino-Rack"
  },
  {
  "brand_name": "Rock Krawler Suspension"
  },
  {
  "brand_name": "Rough Country"
  },
  {
  "brand_name": "Rubicon Express"
  },
  {
  "brand_name": "Auto Rust Technicians"
  },
  {
  "brand_name": "Skyjacker Suspension"
  },
  {
  "brand_name": "SpiderTrax"
  },
  {
  "brand_name": "Sprint Booster"
  },
  {
  "brand_name": "Thule Racks"
  },
  {
  "brand_name": "Synergy MFG"
  },
  {
  "brand_name": "TeraFlex"
  },
  {
  "brand_name": "Tuffy Products"
  },
  {
  "brand_name": "Vertically Driven Products"
  },
  {
  "brand_name": "WARN"
  },
  {
  "brand_name": "Warrior Products"
  },
  {
  "brand_name": "WeatherTech"
  },
  {
  "brand_name": "XENON"
  },
  {
  "brand_name": "ReadyLIFT"
  },
  {
  "brand_name": "G2 Axle & Gear"
  },
  {
  "brand_name": "Viair"
  },
  {
  "brand_name": "UWS Storage"
  },
  {
  "brand_name": "Old Man Emu"
  },
  {
  "brand_name": "Jet Performance"
  },
  {
  "brand_name": "Borla Performance"
  },
  {
  "brand_name": "Dorman"
  },
  {
  "brand_name": "TrailFX"
  },
  {
  "brand_name": "Ripp Supercharger"
  },
  {
  "brand_name": "T-Rex"
  },
  {
  "brand_name": "Grote"
  },
  {
  "brand_name": "Bolt Lock"
  },
  {
  "brand_name": "Rock Hard 4X4"
  },
  {
  "brand_name": "Sailun Tires"
  },
  {
  "brand_name": "ANZO USA"
  },
  {
  "brand_name": "Jammock"
  },
  {
  "brand_name": "Jeep Tweaks"
  },
  {
  "brand_name": "Lube Locker"
  },
  {
  "brand_name": "RotoPax"
  },
  {
  "brand_name": "JKS Manufacturing"
  },
  {
  "brand_name": "aFe Power"
  },
  {
  "brand_name": "POR-15"
  },
  {
  "brand_name": "Fox Racing"
  },
  {
  "brand_name": "Switch-Pros"
  },
  {
  "brand_name": "Novak Conversions"
  },
  {
  "brand_name": "ODYSSEY Battery"
  },
  {
  "brand_name": "Brand Motion"
  },
  {
  "brand_name": "MORryde"
  },
  {
  "brand_name": "Westin Automotive"
  },
  {
  "brand_name": "Recon"
  },
  {
  "brand_name": "Max-Bilt"
  },
  {
  "brand_name": "American Racing"
  },
  {
  "brand_name": "Cooper Tires"
  },
  {
  "brand_name": "Centerforce"
  },
  {
  "brand_name": "Oracle Lighting"
  },
  {
  "brand_name": "Spyder Automotive"
  },
  {
  "brand_name": "ZROADZ"
  },
  {
  "brand_name": "Alpine"
  },
  {
  "brand_name": "Excalibur"
  },
  {
  "brand_name": "N-Fab"
  },
  {
  "brand_name": "Superchips"
  },
  {
  "brand_name": "Rock Slide Engineering"
  },
  {
  "brand_name": "MONROE Shocks & Struts"
  },
  {
  "brand_name": "Rightline Gear"
  },
  {
  "brand_name": "Bridgestone"
  },
  {
  "brand_name": "AirBedz"
  },
  {
  "brand_name": "Artec Industries"
  },
  {
  "brand_name": "Currie Enterprises"
  },
  {
  "brand_name": "AEM"
  },
  {
  "brand_name": "Pro Eagle"
  },
  {
  "brand_name": "Baja Designs"
  },
  {
  "brand_name": "Advance Adapters"
  },
  {
  "brand_name": "TuxMat"
  },
  {
  "brand_name": "S&B Filters"
  },
  {
  "brand_name": "INSYNC"
  },
  {
  "brand_name": "MACPEK"
  },
  {
  "brand_name": "Pedal Commander"
  },
  {
  "brand_name": "Kleinn"
  },
  {
  "brand_name": "Dynatrac"
  },
  {
  "brand_name": "RockJock"
  },
  {
  "brand_name": "Eibach Springs"
  },
  {
  "brand_name": "Fishbone Offroad"
  },
  {
  "brand_name": "Power Stop"
  },
  {
  "brand_name": "Trail Head Customs"
  },
  {
  "brand_name": "Dirty Life"
  },
  {
  "brand_name": "Falken WildPeak"
  },
  {
  "brand_name": "AMI Styling"
  },
  {
  "brand_name": "RSI"
  },
  {
  "brand_name": "Garvin Wilderness"
  },
  {
  "brand_name": "Superlift"
  },
  {
  "brand_name": "Curt Manufacturing"
  },
  {
  "brand_name": "Rust Buster"
  },
  {
  "brand_name": "Overland Vehicle Systems"
  },
  {
  "brand_name": "Decked"
  },
  {
  "brand_name": "Z Automotive"
  },
  {
  "brand_name": "AO Coolers"
  },
  {
  "brand_name": "MCE"
  },
  {
  "brand_name": "Surco"
  },
  {
  "brand_name": "DeeZee"
  },
  {
  "brand_name": "Fabtech"
  },
  {
  "brand_name": "Napier Sportz"
  },
  {
  "brand_name": "Road Armor"
  },
  {
  "brand_name": "Maxxis"
  },
  {
  "brand_name": "Method Race Wheels"
  },
  {
  "brand_name": "Paramount Automotive"
  },
  {
  "brand_name": "Black Rhino"
  },
  {
  "brand_name": "Pilot Automotive"
  },
  {
  "brand_name": "Diver Down"
  },
  {
  "brand_name": "Quadratec"
  },
  {
  "brand_name": "Genright Off Road"
  },
  {
  "brand_name": "Tekonsha"
  },
  {
  "brand_name": "Yukon"
  },
  {
  "brand_name": "Vision X"
  },
  {
  "brand_name": "ProMaxx Automotive"
  },
  {
  "brand_name": "Zone Offroad"
  },
  {
  "brand_name": "Blue Ox"
  },
  {
  "brand_name": "RainX"
  },
  {
  "brand_name": "ANCO"
  },
  {
  "brand_name": "Krystal Kleer"
  },
  {
  "brand_name": "Scosche"
  },
  {
  "brand_name": "ClearlidZ"
  },
  {
  "brand_name": "Misch 4x4"
  },
  {
  "brand_name": "XG Cargo"
  },
  {
  "brand_name": "Iron Cross"
  },
  {
  "brand_name": "EVO Manufacturing"
  },
  {
  "brand_name": "Boomerang Enterprises"
  },
  {
  "brand_name": "Magnum by Raptor Series"
  },
  {
  "brand_name": "Husky Towing Products"
  },
  {
  "brand_name": "MasterTop"
  },
  {
  "brand_name": "Mishimoto"
  },
  {
  "brand_name": "DU-HA"
  },
  {
  "brand_name": "Rockagator"
  },
  {
  "brand_name": "A.R.E."
  },
  {
  "brand_name": "OFFGRID"
  },
  {
  "brand_name": "Tuff Stuff 4x4"
  },
  {
  "brand_name": "Stromberg Carlson Products"
  },
  {
  "brand_name": "NGK"
  },
  {
  "brand_name": "TecStyle"
  },
  {
  "brand_name": "Exposed Racks"
  },
  {
  "brand_name": "TACTIK"
  },
  {
  "brand_name": "Super Swamper"
  },
  {
  "brand_name": "Hellwig Suspension"
  },
  {
  "brand_name": "Heininger Automotive"
  },
  {
  "brand_name": "Garage Smart"
  },
  {
  "brand_name": "Fifteen52"
  },
  {
  "brand_name": "AIRAID"
  },
  {
  "brand_name": "Auto Custom Carpets"
  },
  {
  "brand_name": "Corbeau"
  },
  {
  "brand_name": "Overtread"
  },
  {
  "brand_name": "Stinger Off-Road"
  },
  {
  "brand_name": "Black Horse Offroad"
  },
  {
  "brand_name": "Vivid Lumen"
  },
  {
  "brand_name": "Kicker Jeep Audio & Electronics"
  },
  {
  "brand_name": "Mamba Offroad"
  },
  {
  "brand_name": "Mirage Unlimited"
  },
  {
  "brand_name": "Motor City Aftermarket"
  },
  {
  "brand_name": "Overland Outfitters"
  },
  {
  "brand_name": "Reaper Off-Road"
  },
  {
  "brand_name": "American Trail Products"
  },
  {
  "brand_name": "MD Juan"
  },
  {
  "brand_name": "Rival 4x4"
  },
  {
  "brand_name": "Rox Offroad"
  },
  {
  "brand_name": "Romik"
  },
  {
  "brand_name": "Fairchild Industries"
  },
  {
  "brand_name": "LoD Offroad"
  },
  {
  "brand_name": "AJT Design"
  },
  {
  "brand_name": "VersaHitch"
  },
  {
  "brand_name": "Cliffride"
  },
  {
  "brand_name": "CargoGlide"
  },
  {
  "brand_name": "Covercraft"
  },
  {
  "brand_name": "Steer Smarts"
  },
  {
  "brand_name": "Diode Dynamics"
  },
  {
  "brand_name": "Kumho"
  },
  {
  "brand_name": "Quake LED"
  },
  {
  "brand_name": "Precision Replacement Parts"
  },
  {
  "brand_name": "Meyer Products"
  },
  {
  "brand_name": "Tom Woods"
  },
  {
  "brand_name": "RockNob"
  },
  {
  "brand_name": "SpiderWebShade"
  },
  {
  "brand_name": "NOCO"
  },
  {
  "brand_name": "Schumacher"
  },
  {
  "brand_name": "YKW"
  },
  {
  "brand_name": "THIBERT"
  },
  {
  "brand_name": "Jeep"
  },
  {
  "brand_name": "Camco"
  },
  {
  "brand_name": "GT Styling"
  },
  {
  "brand_name": "CAT"
  },
  {
  "brand_name": "Cervini's Auto Design"
  },
  {
  "brand_name": "Extang"
  },
  {
  "brand_name": "Armorlite"
  },
  {
  "brand_name": "Seatbelt Solutions"
  },
  {
  "brand_name": "Savvy Off Road"
  },
  {
  "brand_name": "Motive Gear"
  },
  {
  "brand_name": "Wilco Offroad"
  },
  {
  "brand_name": "Griffin Radiator"
  },
  {
  "brand_name": "Outback Adventures"
  },
  {
  "brand_name": "SpeedFX"
  },
  {
  "brand_name": "Chemical Guys"
  },
  {
  "brand_name": "Lumatron"
  },
  {
  "brand_name": "Phoenix Graphix"
  },
  {
  "brand_name": "Roam Adventure Co."
  },
  {
  "brand_name": "Dometic"
  },
  {
  "brand_name": "Rolling Big Power"
  },
  {
  "brand_name": "Carnivore"
  },
  {
  "brand_name": "American Outlaw"
  },
  {
  "brand_name": "Autowatch Canada"
  },
  {
  "brand_name": "Briidea"
  },
  {
  "brand_name": "Full Auto"
  },
  {
  "brand_name": "Rugged Radios"
  },
  {
  "brand_name": "Under The Sun"
  },
  {
  "brand_name": "BDS Suspension"
  },
  {
  "brand_name": "Pacer Performance Products"
  },
  {
  "brand_name": "SeaSucker"
  },
  {
  "brand_name": "Michelin"
  },
  {
  "brand_name": "Firestone"
  },
  {
  "brand_name": "AccuPart"
  },
  {
  "brand_name": "RES-Q"
  },
  {
  "brand_name": "Lynx"
  },
  {
  "brand_name": "Timbren"
  },
  {
  "brand_name": "Element - Fire Extinguishers"
  },
  {
  "brand_name": "Mayhem Wheels"
  },
  {
  "brand_name": "Havoc Offroad"
  },
  {
  "brand_name": "Safety Seal"
  },
  {
  "brand_name": "HyLine OffRoad"
  },
  {
  "brand_name": "Accuair"
  }
  ]


