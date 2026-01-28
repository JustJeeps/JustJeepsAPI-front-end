import { Table, Button, Checkbox, Tag, Tooltip } from 'antd';
import CopyText from '../copyText/CopyText';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckSquareOutlined, TrophyFilled } from '@ant-design/icons';
import { sizeHeight, width } from '@mui/system';



const ProductTable = props => {
	console.log('props', props);
	console.log("props.currency:", props.currency);
console.log("props.orderProductPrice:", props.orderProductPrice);			 
	const [selectedVendorCost, setSelectedVendorCost] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;
	// const BACKEND_URL = "https://jj-api-backend.herokuapp.com";
  const BACKEND_URL = "http://localhost:8080";

	// Function to update an order product
	const handleVendorCostClick = vendorProduct => {
		console.log('vendorProduct', vendorProduct);
		setSelectedVendorCost(vendorProduct.vendor_cost);
		axios
			.post(
				`${API_URL}/order_products/${props.orderProductId}/edit/selected_supplier`,
				{
					selected_supplier_cost: vendorProduct.vendor_cost.toString(),
					selected_supplier: vendorProduct.vendor.name,
				}
			)
			.then(res => {
				console.log(res.data);
			})
			.catch(error => {
				console.error(error);
			});
	};

	useEffect(() => {
  console.log("🔍 Full props in ProductTable:", props);
  if (props.data && props.data.length > 0) {
    console.log("✅ First item in data:", props.data[0]);
    console.log("🧪 keystone_code_site:", props.data[0].keystone_code_site);
  }
}, [props.data]);

	const columns_by_sku = [
		{
			title: 'Brand',
			dataIndex: 'brand_name',
			key: 'brand_name',
			width: 100,
			align: 'center',
			ellipsis: true,
			render: brand => <span style={{ fontSize: '14px' }}>{brand}</span>,
		},

		{
			title: 'Img',
			dataIndex: 'image',
			key: 'image',
			width: 55,
			align: 'center',
			render: image => <img src={image} alt='Product' width='50' />,
		},
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',
			width: 280,
			render: name => (
				<span style={{
					fontSize: '14px',
					fontWeight: 500,
					lineHeight: 1.5,
					display: 'block',
					wordWrap: 'break-word',
					whiteSpace: 'normal',
				}}>
					{name}
				</span>
			),
		},

		{
			title: 'Price',
			dataIndex: 'price',
			key: 'price',
			align: 'center',
			width: 80,
			render: price => {
				const displayPrice = props.orderProductPrice ? props.orderProductPrice : price;
				return <span style={{ fontSize: '15px', fontWeight: 600 }}>${displayPrice.toFixed(2)}</span>;
			},
		},

		// //add BIS it is shipping_freight
		// {
		// 	title: 'BIS',
		// 	dataIndex: 'shipping_freight',
		// 	key: 'shipping_freight',
		// 	align: 'center',
		// 	render: shipping_freight => {
		// 		if (shipping_freight) {
		// 			return `$${shipping_freight.toFixed(2)}`;
		// 		} else {
		// 			return `$0.00`;
		// 		}
		// 	},
		// },

		

		// //all competitor prices
		// {
		// 	title: 'All Competitor Prices',
		// 	dataIndex: 'competitorProducts',
		// 	key: 'competitor_prices',
		// 	render: competitorProducts =>
		// 		competitorProducts.map(competitorProduct => (
		// 			<div key={competitorProduct.id}>{`$${competitorProduct.competitor_price}`}</div>
		// 		)),
		// },

		// //all competitor names from the prices above:
		// {
		// 	title: 'All Competitor Names',
		// 	dataIndex: 'competitorProducts',
		// 	key: 'competitor_names',
		// 	render: competitorProducts =>
		// 		competitorProducts.map(competitorProduct => (
		// 			<div key={competitorProduct.id}>{`${competitorProduct.competitor.name}`}</div>
		// 		)),
		// },

		//concatenate competitor price and name like: $177 (partsEngine)
		{
			title: 'Competitors',
			dataIndex: 'competitorProducts',
			key: 'competitor_prices',
			width: 100,
			align: 'center',
			render: (competitorProducts, record) =>
				competitorProducts.map(competitorProduct => {
					const competitorName = competitorProduct.competitor.name.toLowerCase();
					let link = null;

					// Use specific database codes for competitor links
					if (competitorName.includes('parts') && competitorName.includes('engine')) {
						const partsEngineCode = record.partsEngine_code || record.partsengine_code;
						if (partsEngineCode) {
							if (partsEngineCode.startsWith('http')) {
								link = partsEngineCode;
							} else {
								link = `https://www.partsengine.ca/Search/?q=${encodeURIComponent(partsEngineCode)}`;
							}
						} else {
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
					}

					// Shorten competitor name for display
					const shortName = competitorProduct.competitor.name
						.replace('PartsEngine', 'PE')
						.replace('Quadratec', 'Quad')
						.replace('ExtremeTerrain', 'ET')
						.replace('Morris 4x4', 'Morris')
						.replace('4 Wheel Parts', '4WP');

					return (
						<div key={competitorProduct.id} style={{ marginBottom: '3px', textAlign: 'center' }}>
							{link ? (
								<a
									href={link}
									target="_blank"
									rel="noopener noreferrer"
									style={{
										color: '#1890ff',
										textDecoration: 'underline',
										cursor: 'pointer',
										fontSize: '13px',
									}}
								>
									{`$${competitorProduct.competitor_price} (${shortName})`}
								</a>
							) : (
								<span style={{ fontSize: '13px' }}>{`$${competitorProduct.competitor_price} (${shortName})`}</span>
							)}
						</div>
					);
				}),
		},

// Best Vendor column removed - medal now shown in Vendor column

		// {
    //   title: "Suggested Vendor",
    //   dataIndex: "vendorProducts",
    //   key: "lowest_cost",
    //   align: "center",
		// 	width: '10%',
		// 	render: (vendorProducts, record) => {
		// 		const vendorsWithInventory = vendorProducts.filter(
		// 			(vp) => vp.vendor_inventory > 0
		// 		);
		// 		if (vendorsWithInventory.length === 0) {
		// 			return "-";
		// 		}
		// 		const minVendorProduct = vendorsWithInventory.reduce((min, curr) => {
		// 			if (curr.vendor_cost < min.vendor_cost) {
		// 				return curr;
		// 			}
		// 			return min;
		// 		}, vendorsWithInventory[0]);
			
		// 		const margin =
		// 			((props.orderProductPrice - minVendorProduct.vendor_cost) / minVendorProduct.vendor_cost) * 100;
	
			
		// 		return (
		// 			<div
		// 			style={
    //         //setup green border if margin is greater than 20%
    //         margin > 18 ? { border: "2px solid green" } : { border: "2px solid red" }

    //       }
		// 			>
		// 				<div>{minVendorProduct.vendor.name}</div>
		// 				<div>{`$${minVendorProduct.vendor_cost}`}</div>
		// 				<div> {`${margin.toFixed(0)}%`} </div>
		// 				<Checkbox
		// 					onChange={() => handleVendorCostClick(minVendorProduct)}
		// 					style={{ 
		// 						color: 'green' ,
		// 						//style checkbox is a more professional look
		// 						color: margin > 18 ? "green" : "red",

		// 				}}
						

		// 				/> 
		// 			</div>
		// 		);
		// 	},
			
    // },

{
			title: 'Brand Vendors',
			key: 'vendors_for_brand',
			dataIndex: 'vendors',
			width: 100,
			align: 'center',
			render: (vendors) => {
				if (!vendors) return '-';
				const vendorList = vendors.split(',').map(v => v.trim());
				return (
					<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
						{vendorList.map((vendor, idx) => (
							<span
								key={idx}
								style={{
									backgroundColor: '#fff3cd',
									padding: '3px 8px',
									borderRadius: '4px',
									fontSize: '13px',
									fontWeight: 500,
									color: '#856404',
									whiteSpace: 'nowrap',
								}}
							>
								{vendor}
							</span>
						))}
					</div>
				);
			},
		},

// {
//   title: 'Vendor Name',
//   dataIndex: null,
//   key: 'vendor_id',
//   width: '10%',
//   render: (_, record) =>
//     record.vendorProducts.map(vendorProduct => {
//       const vendorName = vendorProduct.vendor.name;
//       const vendorSKU = vendorProduct.vendor_sku?.trim();
//       const productSKU = vendorProduct.product_sku?.trim();
//       const vendorNameLower = vendorName.toLowerCase();

//       let link = null;

//       if (vendorNameLower === 'meyer') {
//         link = `https://online.meyerdistributing.com/parts/details/${vendorSKU}`;
//       } else if (vendorNameLower === 'omix') {
//         link = `https://omixdealer.com/product-detail/${vendorSKU}`;
//       } else if (vendorNameLower === 'quadratec') {
//         const quadCode = productSKU?.includes('-')
//           ? productSKU.split('-').slice(1).join('-')
//           : productSKU;
//         link = `https://www.quadratecwholesale.com/catalogsearch/result/?q=${quadCode}`;
//       } else if (vendorNameLower === 'tire discounter') {
//         link = `https://www.tdgaccess.ca/Catalog/Search/1?search=${vendorSKU}`;
//       } else if (vendorNameLower === 'keystone') {
//         const keystoneCode = record.keystone_code_site?.trim();
//         if (keystoneCode) {
//           let formattedCode = keystoneCode;
//           // If it starts with BES and ends in two digits, insert hyphen before last 2 digits
//           if (/^BES\d{7}$/.test(keystoneCode)) {
//             formattedCode = `${keystoneCode.slice(0, -2)}-${keystoneCode.slice(-2)}`;
//           }
//           link = `https://wwwsc.ekeystone.com/Search/Detail?pid=${formattedCode}`;
//         }
				
//       }

//       return (
//         <div key={vendorProduct.id}>
//           {link ? (
//             <a href={link} target="_blank" rel="noopener noreferrer">
//               {vendorName}
//             </a>
//           ) : (
//             <span>{vendorName}</span>
//           )}
//         </div>
//       );
//     }),
// },

{
  title: 'Vendor / Cost',
  dataIndex: null,
  key: 'vendor_cost_combined',
  width: 260,
  align: 'center',
  render: (_, record) => {
    // Find the best vendor (highest margin with inventory available)
    // Only consider vendors that have inventory > 0 (exclude null/undefined/0)
    const availableVendors = record.vendorProducts.filter(
      (vp) => vp.vendor_inventory > 0 ||
              (vp.vendor_inventory_string &&
               !vp.vendor_inventory_string.toLowerCase().includes('out') &&
               !vp.vendor_inventory_string.toLowerCase().includes('cad stock: 0 / us stock: 0'))
    );

    let highestMargin = -Infinity;
    let bestVendorIndex = -1;
    availableVendors.forEach((vp, idx) => {
      const adjustedCost = props.currency === 'USD' ? vp.vendor_cost / 1.5 : vp.vendor_cost;
      const margin = ((props.orderProductPrice - adjustedCost) / adjustedCost) * 100;
      if (margin > highestMargin) {
        highestMargin = margin;
        bestVendorIndex = idx;
      }
    });
    const bestVendor = bestVendorIndex >= 0 ? availableVendors[bestVendorIndex] : null;

    return record.vendorProducts.map((vendorProduct) => {
      const vendorName = vendorProduct.vendor.name;
      const vendorSKU = vendorProduct.vendor_sku?.trim();
      const productSKU = vendorProduct.product_sku?.trim();
      const vendorNameLower = vendorName.toLowerCase();

      // Check if this vendor is the best (highest margin with inventory)
      const isBestVendor = bestVendor &&
        vendorProduct.vendor.id === bestVendor.vendor.id &&
        vendorProduct.vendor_cost === bestVendor.vendor_cost;

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
        const keystoneCode = record.keystone_code_site?.trim();
        if (keystoneCode) {
          let formattedCode = keystoneCode;
          if (/^BES\d{7}$/.test(keystoneCode)) {
            formattedCode = `${keystoneCode.slice(0, -2)}-${keystoneCode.slice(-2)}`;
          }
          link = `https://wwwsc.ekeystone.com/Search/Detail?pid=${formattedCode}`;
        }
      } else if (vendorNameLower === 'wheelpros') {
        link = `https://dl.wheelpros.com/ca_en/ymm/search/?api-type=products&p=1&pageSize=24&q=${vendorSKU}&inventorylocations=AL`;
      } else if (vendorNameLower === 'rough country' || vendorNameLower === 'roughcountry') {
        link = vendorSKU
          ? `https://www.roughcountry.com/search/${encodeURIComponent(vendorSKU)}`
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
      } else if (vendorNameLower === 'ctp' || vendorNameLower === 'ctp distributors') {
        const searchableSku = record.searchable_sku?.trim();
        link = searchableSku
          ? `https://www.ctpdistributors.com/search-parts?find=${encodeURIComponent(searchableSku)}`
          : null;
      } else if (vendorNameLower === 't14' || vendorNameLower === 'turn14') {
        link = vendorSKU
          ? `https://turn14.com/search/index.php?vmmPart=${encodeURIComponent(vendorSKU)}`
          : null;
      } else if (vendorNameLower === 'metalcloak') {
        const metalCloakCode = vendorSKU?.replace(/^MTK-/, '');
        link = metalCloakCode
          ? `https://jobber.metalcloak.com/catalogsearch/result/?q=${encodeURIComponent(metalCloakCode)}`
          : null;
      }

      return (
        <div
          key={vendorProduct.id}
          style={{
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            padding: '4px 8px',
            backgroundColor: isBestVendor ? '#f6ffed' : 'transparent',
            borderRadius: '4px',
            border: isBestVendor ? '1px solid #b7eb8f' : '1px solid #f0f0f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {isBestVendor && (
              <TrophyFilled style={{ color: '#52c41a', fontSize: '16px' }} />
            )}
            {link ? (
              <a href={link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', fontWeight: 500 }}>
                {vendorName}
              </a>
            ) : (
              <span style={{ fontSize: '14px', fontWeight: 500 }}>{vendorName}</span>
            )}
          </div>
          <CopyText text={`CAD$ ${vendorProduct.vendor_cost.toFixed(2)} / USD$ ${(vendorProduct.vendor_cost / 1.5).toFixed(2)}`}>
            <span style={{ whiteSpace: 'nowrap', fontSize: '14px', fontWeight: 700, color: '#1890ff' }}>
              ${vendorProduct.vendor_cost.toFixed(2)} / ${(vendorProduct.vendor_cost / 1.5).toFixed(2)}
            </span>
          </CopyText>
        </div>
      );
    });
  },
},

{
  title: "Margin",
  key: "margin",
  align: "center",
  width: 65,
  render: (record) => {
    const { vendorProducts } = record;

    return vendorProducts.map((vendorProduct) => {
      const { vendor_cost, vendor_id } = vendorProduct;

      const adjustedCost =
        props.currency === 'USD' ? vendor_cost / 1.5 : vendor_cost;

      const margin =
        ((props.orderProductPrice - adjustedCost) / adjustedCost) * 100;

      return (
        <div key={vendor_id}>
          <Tag
            color={margin > 18 ? "#1f8e24" : "#f63535"}
            style={{
              fontSize: "15px",
              padding: "4px 8px",
              marginBottom: "5px",
              fontWeight: 600,
            }}
          >
            {isNaN(margin) ? "N/A" : `${margin.toFixed(0)}%`}
          </Tag>
        </div>
      );
    });
  },
}
,



		
		// {
    //   title: "Margin %",
    //   key: "margin",
    //   align: "center",
    //   render: (record) => {
    //     const { price, vendorProducts } = record;
 
    //     return vendorProducts.map((vendorProduct) => {
    //       const { vendor_cost } = vendorProduct;
    //       const margin =
    //         ((props.orderProductPrice - vendor_cost) / vendor_cost) * 100;
    //       const className = margin < 18 ? "red-margin" : "";
    //       return (
    //         <div key={vendorProduct.vendor_id}>
    //           {margin > 18 ? (
    //             <Tag
    //               color="#1f8e24"
    //               style={{
    //                 fontSize: "18px",
    //                 padding: "5px",
    //                 marginBottom: "7px",
    //               }}
    //             >
    //               {margin.toFixed(2)}%
    //             </Tag>
    //           ) : (
    //             <Tag color="#f63535"
    //             style={{
    //               fontSize: "18px",
    //               padding: "5px",
    //               marginBottom: "7px",
    //             }}
    //           >
    //             {margin.toFixed(2)}%</Tag>
    //           )}
    //         </div>
    //       );
    //     });
    //   },
    // },

		//add vendor_inventory_string
		// {
		// 	title: "Vendor Inventory String",
		// 	dataIndex: "vendorProducts",
		// 	key: "vendor_inventory_string",
		// 	align: "center",
		// 	render: (vendorProducts) =>
		// 		vendorProducts.map((vendorProduct) => (
		// 			<div key={vendorProduct.id}>
		// 				{vendorProduct.vendor_inventory_string && (
		// 					<Tag
		// 						color="#1f8e24" // Adjust color or style as needed
		// 						style={{
		// 							fontSize: "18px",
		// 							padding: "5px",
		// 							marginBottom: "12px",
		// 							width: "auto",
		// 						}}
		// 					>
		// 						{vendorProduct.vendor_inventory_string}
		// 					</Tag>
		// 				)}
		// 			</div>
		// 		)),
		// },
		
		
    // { 
		// 	title: "Vendor Inventory",
    //   dataIndex: "vendorProducts",
    //   key: "vendor_inventory",
    //   align: "center",
    //   render: (vendorProducts) =>
    //     vendorProducts.map((vendorProduct) => (
    //       <div
    //         key={vendorProduct.id}
    //       >
    //         {vendorProduct.vendor_inventory > 0 ? (
    //             <Tag
    //               color="#1f8e24"
    //               style={{
    //                 fontSize: "18px",
    //                 padding: "5px",
    //                 marginBottom: "12px",
    //                 width: "45px",
    //               }}
    //             >
    //               {vendorProduct.vendor_inventory}
    //             </Tag>
    //           ) : (
    //             <Tag color="#f63535"
    //             style={{
    //               fontSize: "18px",
    //               padding: "5px",
    //               marginBottom: "12px",
    //               width: "45px",
    //             }}>{vendorProduct.vendor_inventory}</Tag>
    //           )}
    //       </div>
          
    //     )),
    // },

		{
				title: "Inv",
				dataIndex: "vendorProducts",
				key: "vendor_inventory",
				align: "center",
				width: 80,
				render: (vendorProducts) => {
					if (!Array.isArray(vendorProducts)) return <span>-</span>;

					return vendorProducts.map((vendorProduct) => (
						<div key={vendorProduct.id}>
							{vendorProduct.vendor_inventory !== null &&
								vendorProduct.vendor_inventory !== undefined && (
									<Tag
										color={
											vendorProduct.vendor_inventory > 0 ? "#1f8e24" : "#f63535"
										}
										style={{
											fontSize: "15px",
											padding: "4px 8px",
											marginBottom: "5px",
											fontWeight: 600,
										}}
									>
										{vendorProduct.vendor_inventory}
									</Tag>
								)}

							{vendorProduct.vendor_inventory_string !== null &&
								vendorProduct.vendor_inventory_string !== undefined && (
									<Tag
										color={
											vendorProduct.vendor_inventory_string
												.toLowerCase()
												.includes("out") ||
											vendorProduct.vendor_inventory_string
												.toLowerCase()
												.includes("cad stock: 0 / us stock: 0")
												? "#f63535"
												: "#1f8e24"
										}
										style={{
											fontSize: "13px",
											padding: "4px 8px",
											marginBottom: "5px",
										}}
									>
										{vendorProduct.vendor_inventory_string}
									</Tag>
								)}

							{vendorProduct.vendor_inventory === null &&
								(vendorProduct.vendor_inventory_string === null ||
									vendorProduct.vendor_inventory_string === undefined) && (
									<Tag
										color="default"
										style={{
											fontSize: "13px",
											padding: "4px 8px",
											marginBottom: "5px",
										}}
									>
										NO INFO
									</Tag>
								)}
						</div>
					));
				},
			},
		

		// {
		// 	title: "Vendor Inventory",
		// 	dataIndex: "vendorProducts",
		// 	key: "vendor_inventory",
		// 	align: "center",
		// 	width: "10%",
		// 	render: (vendorProducts) =>
		// 		vendorProducts.map((vendorProduct) => (
		// 			<div key={vendorProduct.id}>
		// 				{vendorProduct.vendor_inventory !== null && vendorProduct.vendor_inventory !== undefined && (
		// 					<Tag
		// 						color={vendorProduct.vendor_inventory > 0 ? "#1f8e24" : "#f63535"}
		// 						style={{
		// 							fontSize: "18px",
		// 							padding: "5px",
		// 							marginBottom: "12px",
		// 							width: "45px",
		// 						}}
		// 					>
		// 						{vendorProduct.vendor_inventory}
		// 					</Tag>
		// 				)}
		// 				{vendorProduct.vendor_inventory_string !== null && vendorProduct.vendor_inventory_string !== undefined && (
		// 					<Tag
		// 						color="#1f8e24" // You can adjust the color or style for vendor_inventory_string if needed
		// 						style={{
		// 							fontSize: "18px",
		// 							padding: "5px",
		// 							marginBottom: "12px",
		// 							width: "auto",
		// 						}}
		// 					>
		// 						{vendorProduct.vendor_inventory_string}
		// 					</Tag>
		// 				)}
		// 			</div>
		// 		)),
		// },

		


		// {
		// 	title: 'Vendor SKU   ',
		// 	dataIndex: 'vendorProducts',
		// 	key: 'vendor_sku',
		// 	render: vendorProducts =>
		// 		vendorProducts.map(vendorProduct => (
		// 			<div key={vendorProduct.id}>{vendorProduct.vendor_sku}</div>
		// 		)),
		// },
	
	];

	return (
<div style={{ width: '100%', maxWidth: '100%', overflow: 'auto' }}>
  <Table
    dataSource={props.data}
    columns={columns_by_sku}
    rowKey="sku"
    pagination={false}
    scroll={{ x: 1200, y: 400 }}
    size="middle"
    tableLayout="fixed"
    // footer={() => (
    //   <div style={{ marginTop: '20px', textAlign: 'left' }}>
    //     {props.data.length > 0 && (
    //       <h5 style={{ fontWeight: 600 }}>
    //         Vendors for this Brand:{' '}
    //         <span style={{ fontWeight: 400 }}>{props.data[0].vendors}</span>
    //       </h5>
    //     )}
    //   </div>
    // )}
  />
</div>



		// <div style={{ paddingBottom: '40px' }}>
		// 	<Table
		// 		dataSource={props.data}
		// 		columns={columns_by_sku}
		// 		rowKey='sku'
		// 		pagination={false}
		// 		footer={() => (

		// 			<div>
		// 			{	props.data.length > 0 && (
		// 					<h5>Vendors for this Brand: {props.data[0].vendors}</h5>
		// 				)}
		// 			</div>
		// 		)}
		// 	/>
		// </div>
	);
};

export default ProductTable;


