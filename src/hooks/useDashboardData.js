import { useState, useEffect } from "react";
import axios from "axios";

export const useDashboardData = () => {
  const [state, setState] = useState({
    totalSum: 0,
    totalByMonth: {},
    totalCount: 0,
    aveValue:0,
    totalQty:0,
    totalCurMonth:0,
    totalLastMonth:0,
    orders:[],
  });
  const API_URL = import.meta.env.VITE_API_URL;

    // const BACKEND_URL = "  https://1ff8-2607-fea8-58df-feb0-242d-ae03-2e-322c.ngrok-free.app";

    // const BACKEND_URL = "http://localhost:8080";

    //(`${BACKEND_URL}`/api/products/BST-56820-15``)

  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       const all = await Promise.all([
  //         axios.get(`${API_URL}`/totalGrandTotalByMonth`),
  //         axios.get(``${API_URL}`/totalOrderInfo``),
  //       ]);
  //       setState((prev) => ({
  //         ...prev,
  //         orders: all[0].data.orders,
  //         totalByMonth: all[0].data.total_by_month,
  //         totalCurMonth: all[0].data.total_this_month,
  //         totalLastMonth: all[0].data.total_last_month || 262450,
  //         totalSum: all[1].data.totalSum,
  //         totalCount: all[1].data.count,
  //         aveValue: all[1].data.avg,
  //         totalQty: all[1].data.totalQty,
  //       }));
  //     } catch (error) {
  //       console.error("Failed to fetch data from backend:", error);
  //     }
  //   };
  //   fetchData();
  // }, []);

  return { state };
};

export const useDashboardpoData = () => {
  const [state, setState] = useState({
    numProduct: 0,
    totalSold: 0,
    topPopular: []
  });

  // useEffect(() => {
  //   try {
  //     const fetchData = async () => {
  //       try {
  //         const all = await Promise.all([
  //           axios.get(`http://localhost:8080/productinfo`),
  //           axios.get(`http://localhost:8080/toppopularproduct`),
  //         ]);
  //         setState((prev) => ({
  //           ...prev,
  //           numProduct: all[0].data.numProduct,
  //           totalSold:all[0].data.totalSold,
  //           topPopular: all[1].data,
  //         }));
  //       } catch (error) {
  //         console.error("Failed to fetch data from backend:", error);
  //       }
  //     };
  //     fetchData();
      
  //   } catch (error) {
      
  //   }
  // },[]
  // );
  return { state };
}
