
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import axios from 'axios';

const PURCHASER_INITIALS = ['PM', 'KD', 'JD', 'JK'];

function exportToExcel(report, dateStr) {
  const wb = XLSX.utils.book_new();
  Object.entries(report).forEach(([key, rows]) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, key);
  });
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `PurchaserReport_${dateStr}.xlsx`);
}

const ALLOWED_USERS = ['tess', 'paula', 'karoline'];

export default function PurchaserReport() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div style={{textAlign:'center',padding:100}}>Loading...</div>;
  }
  const isAllowed = user && ALLOWED_USERS.includes((user.username || user.name || '').toLowerCase());
  if (!isAllowed) {
    // Hide everything, show only access denied
    return null;
  }
  const [date, setDate] = useState('');
  const [initials, setInitials] = useState(PURCHASER_INITIALS);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!date || !initials.length) return;
    setReportLoading(true);
    setError('');
    try {
      // Query backend for orders matching initials only (server-side filtering)
      const params = {
        search: initials.join(' '),
        searchMode: 'any',
        limit: 200,
      };
      let page = 1;
      let allOrders = [];
      let hasMore = true;
      let safeguard = 0;
      while (hasMore && safeguard < 50) {
        const response = await axios.get('/api/orders', { params: { ...params, page } });
        const batch = response.data.data || response.data || [];
        allOrders = allOrders.concat(batch);
        hasMore = batch.length === params.limit;
        page += 1;
        safeguard += 1;
      }
      const orders = allOrders;
      // Client-side classify into closed/followedUp/waiting using same logic as before
      const dateStr = date;
      const normalizePo = (value) =>
        (value || '')
          .toString()
          .toLowerCase()
          .replace(/[-_/]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      const escapeRegex = (value) => value.replace(/([.*+?^=!:${}()|[\]\\])/g, '\\$1');
      const tokensFromInput = (value) =>
        value
          .toString()
          .toLowerCase()
          .split(/\s+/)
          .map((token) => token.trim())
          .filter(Boolean);
      const closed = [], followedUp = [], waiting = [];
      for (const o of orders) {
        const po = o.custom_po_number;
        if (!po) continue;
        const poNorm = normalizePo(po);
        const notSet = /\bnot set\b/i.test(poNorm);
        const hasInitials = initials.some((init) =>
          new RegExp(`\\b${escapeRegex(init)}\\b`, 'i').test(poNorm)
        );
        const dateTokens = tokensFromInput(dateStr);
        const hasDate =
          dateTokens.length > 0 &&
          dateTokens.every((token) =>
            new RegExp(`\\b${escapeRegex(token)}\\b`, 'i').test(poNorm)
          );
        if (!notSet && hasInitials && hasDate) closed.push(o);
        else if (notSet && hasInitials && hasDate) followedUp.push(o);
        else if (notSet && hasInitials && !hasDate) waiting.push(o);
      }
      setReport({ closed, followedUp, waiting });
    } catch (err) {
      setError('Failed to fetch report data.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleExport = () => {
    if (report && date) exportToExcel(report, date);
  };

  return (
    <div style={{ padding: 300 }}>
      <h2 style={{ textAlign: 'center', marginBottom: 32 }}>Purchaser Report</h2>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: 24, boxShadow: '0 2px 8px #f0f1f2', minWidth: 400 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label>
              <span style={{ fontWeight: 500 }}>Report Date:</span>
              <input type="text" placeholder="e.g. Mar 27" value={date} onChange={e => setDate(e.target.value)} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc' }} />
            </label>
            <label>
              <span style={{ fontWeight: 500 }}>Purchaser Initials:</span>
              <select multiple value={initials} onChange={e => setInitials(Array.from(e.target.selectedOptions, o => o.value))} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc', minWidth: 120 }}>
                {PURCHASER_INITIALS.map(init => (
                  <option key={init} value={init}>{init}</option>
                ))}
              </select>
            </label>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={handleGenerate} disabled={reportLoading} style={{ padding: '6px 16px', borderRadius: 4, background: '#145DA0', color: '#fff', border: 'none', fontWeight: 500 }}>{reportLoading ? 'Loading...' : 'Generate Report'}</button>
              <button onClick={handleExport} disabled={!report} style={{ padding: '6px 16px', borderRadius: 4, background: report ? '#ffc107' : '#eee', color: report ? '#333' : '#aaa', border: 'none', fontWeight: 500 }}>Export to Excel</button>
            </div>
            {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
          </div>
        </div>
      </div>
      {report && (
        <div>
          <h3>Orders closed on {date} ({report.closed.length})</h3>
          <ReportTable rows={report.closed} />
          <h3>Orders followed up on {date} ({report.followedUp.length})</h3>
          <ReportTable rows={report.followedUp} />
          <h3>Orders waiting for a response ({report.waiting.length})</h3>
          <ReportTable rows={report.waiting} />
        </div>
      )}
    </div>
  );
}



function ReportTable({ rows }) {
  if (!rows.length) return <div>No results.</div>;
  // Add custom_ship_status and custom_order_note columns
  const columns = [
    { key: 'created_at', label: 'Order Date' },
    { key: 'increment_id', label: 'Order ID' },
    { key: 'total_qty_ordered', label: 'Items Ordered Qty' },
    { key: 'base_total_due', label: 'Total Due' },
    { key: 'custom_po_number', label: 'PO#' },
    { key: 'custom_ship_status', label: 'Ship Status' },
    { key: 'custom_order_note', label: 'Order Note' },
  ];
  return (
    <table style={{ marginBottom: 24, width: '100%', borderCollapse: 'collapse', fontFamily: 'sans-serif', fontSize: 15, background: '#fff' }}>
      <thead>
        <tr style={{ background: '#f5f5f5' }}>
          {columns.map(col => (
            <th key={col.key} style={{ padding: '8px 12px', borderBottom: '2px solid #eee', textAlign: 'left', fontWeight: 600 }}>{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
            {columns.map(col => (
              <td key={col.key} style={{ padding: '8px 8px', borderBottom: '1px solid #f5f5f5' }}>
                {col.key === 'created_at' && row[col.key] ? new Date(row[col.key]).toLocaleDateString()
                  : col.key === 'increment_id' && row.increment_id && row.entity_id ? (
                    <a
                      href={`https://www.justjeeps.com/admin_19q7yi/sales/order/view/order_id/${row.entity_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#1890ff', fontWeight: 600, textDecoration: 'none' }}
                    >
                      {row.increment_id}
                    </a>
                  )
                    : (row[col.key] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
