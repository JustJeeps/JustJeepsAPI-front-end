// enrich-orders-json.js
// Usage: node enrich-orders-json.js
// Adds dummy custom_ship_status and custom_order_note fields to each order in orders.json

const fs = require('fs');
const path = require('path');

const ORDERS_PATH = path.join(__dirname, '../public/orders.json');
const OUTPUT_PATH = path.join(__dirname, '../public/orders_enriched.json');

const statuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Canceled'];

function getRandomStatus() {
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function getRandomNote(i) {
  return `Note for order #${i + 1}`;
}

const orders = JSON.parse(fs.readFileSync(ORDERS_PATH, 'utf8'));

const enriched = orders.map((order, i) => ({
  ...order,
  custom_ship_status: getRandomStatus(),
  custom_order_note: getRandomNote(i),
}));

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(enriched, null, 2));
console.log(`Enriched orders written to ${OUTPUT_PATH}`);