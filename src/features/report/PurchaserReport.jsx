
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx-js-style';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const PURCHASER_INITIALS = ['PM', 'KD', 'JD', 'JK'];

function getShippingCostValue(row) {
  if (!row) return '';
  if (row.shipping_cost_jj !== undefined && row.shipping_cost_jj !== null) return row.shipping_cost_jj;
  return '';
}

function exportToExcel(report, dateStr) {
  const wb = XLSX.utils.book_new();
  const columns = [
    // { key: 'created_at', label: 'Order Date' },
    { key: 'increment_id', label: 'Order ID' },
    { key: 'custom_po_number', label: 'PO#' },
    { key: 'custom_order_note', label: 'Order Note' },
    // { key: 'total_qty_ordered', label: 'Items Ordered Qty' },
    // { key: 'base_total_due', label: 'Total Due' },
    // { key: 'custom_ship_status', label: 'Ship Status' },
    // { key: 'shipping_cost', label: 'Shipping Cost' },
  ];
  const headerRow = columns.map((col) => col.label);
  const headerRowIndexes = [];
  const sectionTitleRowIndexes = [];
  const formatRow = (row) =>
    columns.map((col) => {
      if (col.key === 'created_at') {
        return row[col.key] ? new Date(row[col.key]).toLocaleDateString() : '';
      }
      if (col.key === 'shipping_cost') {
        return getShippingCostValue(row);
      }
      return row[col.key] ?? '';
    });
  const buildSectionRows = (title, rows) => {
    const sectionTitle = title;
    const startIndex = sheetRows.length;
    sectionTitleRowIndexes.push(startIndex);
    headerRowIndexes.push(startIndex + 1);
    sheetRows.push([sectionTitle, ...Array(headerRow.length - 1).fill('')]);
    sheetRows.push(headerRow);
    sheetRows.push(...rows.map(formatRow));
    sheetRows.push([]);
  };
  const sheetRows = [];
  buildSectionRows(`Orders closed on ${dateStr}`, report?.closed || []);
  buildSectionRows(`Orders followed up on ${dateStr}`, report?.followedUp || []);
  buildSectionRows('Orders waiting for a response', report?.waiting || []);
  if (sheetRows.length && sheetRows[sheetRows.length - 1].length === 0) {
    sheetRows.pop();
  }
  const ws = XLSX.utils.aoa_to_sheet(sheetRows);
  const applyBorders = (sheet, { headerRows, titleRows, color }) => {
    if (!sheet['!ref']) return;
    const range = XLSX.utils.decode_range(sheet['!ref']);
    const headerSet = new Set(headerRows);
    const titleSet = new Set(titleRows);
    for (let r = range.s.r; r <= range.e.r; r += 1) {
      const isEmphasisRow = headerSet.has(r) || titleSet.has(r);
      const style = isEmphasisRow ? 'medium' : 'thin';
      const font = isEmphasisRow ? { bold: true } : undefined;
      for (let c = range.s.c; c <= range.e.c; c += 1) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[cellRef];
        if (!cell) continue;
        cell.s = cell.s || {};
        cell.s.border = {
          top: { style, color: { rgb: color } },
          bottom: { style, color: { rgb: color } },
          left: { style, color: { rgb: color } },
          right: { style, color: { rgb: color } },
        };
        if (font) {
          cell.s.font = { ...(cell.s.font || {}), ...font };
        }
      }
    }
  };
  const columnWidths = headerRow.map((_, colIndex) => {
    let maxLen = 0;
    sheetRows.forEach((row) => {
      const cell = row[colIndex];
      if (cell === null || cell === undefined) return;
      const cellText = String(cell);
      if (cellText.length > maxLen) maxLen = cellText.length;
    });
    return { wch: Math.min(Math.max(maxLen + 2, 10), 60) };
  });
  ws['!cols'] = columnWidths;
  ws['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];
  applyBorders(ws, {
    headerRows: headerRowIndexes,
    titleRows: sectionTitleRowIndexes,
    color: '000000',
  });
  XLSX.utils.book_append_sheet(wb, ws, 'Purchaser Report');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `PurchaserReport_${dateStr}.xlsx`);
}

const ALLOWED_USERS = ['tess', 'paula', 'karoline'];

export default function PurchaserReport() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div style={{ textAlign: 'center', padding: 100 }}>Loading...</div>;
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
  const [collapsed, setCollapsed] = useState({
    closed: false,
    followedUp: false,
    waiting: false,
  });

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
        const response = await axios.get(`${API_BASE_URL}/api/orders`, { params: { ...params, page } });
        const batch = response.data.data || response.data || [];
        const totalPages = response.data?.pagination?.totalPages;
        allOrders = allOrders.concat(batch);
        hasMore = Number.isFinite(totalPages) ? page < totalPages : batch.length === params.limit;
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
    <div className="pr-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

        .pr-page {
          --ink: #1c2430;
          --muted: #5b6676;
          --accent: #e56b2f;
          --accent-2: #235789;
          --panel: #ffffff;
          --panel-2: #f8f4ef;
          --stroke: #e6e0d8;
          --shadow: 0 18px 40px rgba(20, 26, 35, 0.12);
          min-height: 100vh;
          padding: 64px 24px 120px;
          background:
            radial-gradient(1200px 600px at 10% -10%, rgba(229, 107, 47, 0.18), transparent 60%),
            radial-gradient(900px 480px at 90% 0%, rgba(35, 87, 137, 0.18), transparent 60%),
            linear-gradient(180deg, #f9f7f4 0%, #f2efe9 100%);
          color: var(--ink);
          font-family: 'IBM Plex Sans', 'Segoe UI', sans-serif;
        }

        .pr-shell {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          gap: 28px;
        }

        .pr-header {
          display: grid;
          gap: 10px;
        }

        .pr-title {
          font-family: 'Space Grotesk', 'IBM Plex Sans', sans-serif;
          font-size: clamp(28px, 3.2vw, 40px);
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0;
        }

        .pr-subtitle {
          color: var(--muted);
          margin: 0;
          font-size: 15px;
        }

        .pr-toolbar {
          background: var(--panel);
          border: 1px solid var(--stroke);
          border-radius: 16px;
          padding: 18px;
          box-shadow: var(--shadow);
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          align-items: end;
        }

        .pr-field {
          display: grid;
          gap: 8px;
          font-size: 13px;
          color: var(--muted);
        }

        .pr-field label {
          font-weight: 600;
          color: var(--ink);
        }

        .pr-input,
        .pr-select {
          background: #fff;
          border: 1px solid var(--stroke);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 14px;
          outline: none;
          transition: border 0.2s ease, box-shadow 0.2s ease;
        }

        .pr-input:focus,
        .pr-select:focus {
          border-color: var(--accent-2);
          box-shadow: 0 0 0 3px rgba(35, 87, 137, 0.12);
        }

        .pr-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .pr-btn {
          border: none;
          padding: 10px 16px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s ease;
        }

        .pr-btn.primary {
          background: linear-gradient(135deg, var(--accent) 0%, #f29c57 100%);
          color: #1c1b18;
          box-shadow: 0 10px 18px rgba(229, 107, 47, 0.25);
        }

        .pr-btn.secondary {
          background: #1c2430;
          color: #fff;
          box-shadow: 0 10px 18px rgba(28, 36, 48, 0.25);
        }

        .pr-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }

        .pr-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .pr-error {
          color: #b42318;
          font-weight: 500;
        }

        .pr-section {
          background: var(--panel);
          border: 1px solid var(--stroke);
          border-radius: 18px;
          padding: 22px 22px 28px;
          min-height: 320px;
          box-shadow: var(--shadow);
          display: grid;
          gap: 12px;
          animation: fadeUp 0.4s ease;
        }

        .pr-section-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .pr-toggle {
          border: 1px solid var(--stroke);
          background: #fff;
          border-radius: 10px;
          padding: 6px 10px;
          font-weight: 600;
          color: var(--accent-2);
        }

        .pr-section-title {
          font-family: 'Space Grotesk', 'IBM Plex Sans', sans-serif;
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }

        .pr-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
        }

        .pr-table-wrap {
          max-height: 80vh;
          overflow: auto;
          border-radius: 12px;
          border: 1px solid var(--stroke);
        }

        .pr-table th {
          text-align: left;
          background: var(--panel-2);
          color: var(--muted);
          font-weight: 600;
          padding: 10px 12px;
          border-bottom: 1px solid var(--stroke);
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .pr-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #f0ebe4;
        }

        .pr-table tbody tr:nth-child(even) {
          background: #fcfbf9;
        }

        .pr-table .num {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .pr-link {
          color: var(--accent-2);
          font-weight: 600;
          text-decoration: none;
        }

        .pr-alert {
          color: #b42318;
          font-weight: 700;
        }

        .pr-alert-pill {
          display: inline-block;
          margin-right: 8px;
          padding: 2px 8px;
          border-radius: 999px;
          background: #fee4e2;
          color: #b42318;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="pr-shell">
        <div className="pr-header">
          <h2 className="pr-title">Purchaser Report</h2>
          <p className="pr-subtitle">Track daily purchase activity, follow-ups, and open responses.</p>
        </div>

        <div className="pr-toolbar">
          <div className="pr-field">
            <label htmlFor="pr-date">Report Date</label>
            <input
              id="pr-date"
              className="pr-input"
              type="text"
              placeholder="e.g. Mar 27"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="pr-field">
            <label htmlFor="pr-initials">Purchaser Initials</label>
            <select
              id="pr-initials"
              className="pr-select"
              multiple
              value={initials}
              onChange={(e) => setInitials(Array.from(e.target.selectedOptions, (o) => o.value))}
            >
              {PURCHASER_INITIALS.map((init) => (
                <option key={init} value={init}>{init}</option>
              ))}
            </select>
          </div>
          <div className="pr-actions">
            <button className="pr-btn primary" onClick={handleGenerate} disabled={reportLoading}>
              {reportLoading ? 'Loading...' : 'Generate Report'}
            </button>
            <button className="pr-btn secondary" onClick={handleExport} disabled={!report}>
              Export to Excel
            </button>
          </div>
          {error && <div className="pr-error">{error}</div>}
        </div>

        {report && (
          <div className="pr-shell">
            <div className="pr-section">
              <div className="pr-section-header">
                <button
                  type="button"
                  className="pr-toggle"
                  onClick={() => setCollapsed((prev) => ({ ...prev, closed: !prev.closed }))}
                >
                  {collapsed.closed ? '▶' : '▼'}
                </button>
                <h3 className="pr-section-title">Orders closed on {date} ({report.closed.length})</h3>
              </div>
              {!collapsed.closed && <ReportTable rows={report.closed} />}
            </div>

            <div className="pr-section">
              <div className="pr-section-header">
                <button
                  type="button"
                  className="pr-toggle"
                  onClick={() => setCollapsed((prev) => ({ ...prev, followedUp: !prev.followedUp }))}
                >
                  {collapsed.followedUp ? '▶' : '▼'}
                </button>
                <h3 className="pr-section-title">Orders followed up on {date} ({report.followedUp.length})</h3>
              </div>
              {!collapsed.followedUp && <ReportTable rows={report.followedUp} />}
            </div>

            <div className="pr-section">
              <div className="pr-section-header">
                <button
                  type="button"
                  className="pr-toggle"
                  onClick={() => setCollapsed((prev) => ({ ...prev, waiting: !prev.waiting }))}
                >
                  {collapsed.waiting ? '▶' : '▼'}
                </button>
                <h3 className="pr-section-title">Orders waiting for a response ({report.waiting.length})</h3>
              </div>
              {!collapsed.waiting && <ReportTable rows={report.waiting} />}
            </div>
          </div>
        )}
      </div>
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
    { key: 'shipping_cost', label: 'Shipping Cost' },
    { key: 'custom_order_note', label: 'Order Note' },
  ];
  return (
    <div className="pr-table-wrap">
      <table className="pr-table">
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            {columns.map(col => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map(col => (
                <td
                  key={col.key}
                  className={[
                    ['total_qty_ordered', 'base_total_due', 'shipping_cost'].includes(col.key) ? 'num' : '',
                    col.key === 'base_total_due' && Number.isFinite(Number(row[col.key])) && Number(row[col.key]) > 0 ? 'pr-alert' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {col.key === 'created_at' && row[col.key] ? new Date(row[col.key]).toLocaleDateString()
                    : col.key === 'increment_id' && row.increment_id && row.entity_id ? (
                      <a
                        className="pr-link"
                        href={`https://www.justjeeps.com/admin_19q7yi/sales/order/view/order_id/${row.entity_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {row.increment_id}
                      </a>
                    )
                      : col.key === 'base_total_due' ? (
                        <>
                          {Number.isFinite(Number(row[col.key])) && Number(row[col.key]) > 0 && (
                            <span className="pr-alert-pill">DUE</span>
                          )}
                          {row[col.key] ?? ''}
                        </>
                      )
                        : col.key === 'shipping_cost' ? (
                          getShippingCostValue(row)
                        )
                        : (row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
