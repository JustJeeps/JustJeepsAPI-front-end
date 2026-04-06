
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx-js-style';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const PURCHASER_INITIALS = ['PM', 'KD', 'JD', 'JK'];
const WAITING_RESPONSE_DAYS = 30;

function getTodayLabel() {
  const now = new Date();
  return now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getShippingCostValue(row) {
  if (!row) return '';
  if (row.shipping_cost_jj !== undefined && row.shipping_cost_jj !== null) return row.shipping_cost_jj;
  return '';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailHtml(report, dateStr, initials) {
  const columns = [
    {
      key: 'increment_id',
      label: 'Order ID',
      width: 120,
      format: (row) => {
        if (!row.increment_id) return '';
        return escapeHtml(row.increment_id);
      },
    },
    { key: 'custom_po_number', label: 'PO#', width: 160 },
    { key: 'custom_order_note', label: 'Order Note', width: 420 },
  ];

  const colWidthStyle = (col) => col.width ? `min-width:${col.width}px;` : '';

  const table = (rows) => {
    const header = `
      <tr>
        ${columns.map((col) => `<th style=\"text-align:left;padding:10px 12px;background:#f8f4ef;border:1px solid #d9d9d9;font-size:13px;color:#5b6676;${colWidthStyle(col)}\">${escapeHtml(col.label)}</th>`).join('')}
      </tr>
    `;

    const body = rows.map((row, index) => {
      const bg = index % 2 === 0 ? '#ffffff' : '#fcfbf9';
      const cells = columns.map((col) => {
        const raw = col.format ? col.format(row) : escapeHtml(row[col.key] ?? '');
        const align = ['total_qty_ordered', 'base_total_due', 'shipping_cost'].includes(col.key) ? 'right' : 'left';
        const color = col.key === 'base_total_due' && Number(row.base_total_due) > 0 ? '#b42318' : '#1c2430';
        return `<td style=\"padding:10px 12px;border:1px solid #d9d9d9;text-align:${align};color:${color};${colWidthStyle(col)}\">${raw}</td>`;
      }).join('');
      return `<tr style=\"background:${bg};\">${cells}</tr>`;
    }).join('');

    return `
      <table style=\"width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;table-layout:auto;\">
        <thead>${header}</thead>
        <tbody>${body}</tbody>
      </table>
    `;
  };

  const renderSection = (title, rows) => {
    if (!rows.length) return '';
    return `
      <h3 style=\"margin:16px 0 8px;color:#1c2430;\">${escapeHtml(title)}</h3>
      ${table(rows)}
    `;
  };

  const initialsText = Array.isArray(initials) && initials.length ? initials.join(', ') : 'All';
  return `
    <div style=\"font-family:Arial,sans-serif;max-width:920px;margin:0 auto;color:#1c2430;\">
      ${renderSection(`Orders closed on ${dateStr}`, report?.closed || [])}
      ${renderSection(`Orders followed up on ${dateStr}`, report?.followedUp || [])}
      ${renderSection(`Orders with tickets on ${dateStr}`, report?.tickets || [])}
      ${renderSection(`Orders assigned to staff on ${dateStr}`, report?.assigned || [])}
      ${renderSection('Orders waiting for a response', report?.waiting || [])}
    </div>
  `;
}

function isOlderThanDays(isoDate, days) {
  if (!isoDate) return false;
  const createdAt = new Date(isoDate);
  if (Number.isNaN(createdAt.getTime())) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return createdAt < cutoff;
}

function buildWaitingOverdueEmail(orders) {
  const subject = 'Orders waiting for a response (30+ days)';
  const lines = [
    'Hi Jerry,',
    '',
    'Could you please cancel the orders below? I have not received a response for over 30 days.',
    '',
    'Order ID:',
  ];
  orders.forEach((order, index) => {
    const orderId = order.increment_id || order.entity_id || 'Unknown';
    const note = order.custom_order_note ? ` (Order Note: ${order.custom_order_note})` : '';
    lines.push(`${index + 1}. ${orderId}${note}`);
  });
  if (!orders.length) {
    lines.push('No orders found.');
  }
  return {
    subject,
    body: lines.join('\n'),
  };
}

function buildDateTokens(input) {
  if (!input) return { all: [], month: [], day: [] };
  const monthMap = {
    jan: 'january',
    feb: 'february',
    mar: 'march',
    apr: 'april',
    may: 'may',
    jun: 'june',
    jul: 'july',
    aug: 'august',
    sep: 'september',
    sept: 'september',
    oct: 'october',
    nov: 'november',
    dec: 'december',
  };
  const raw = input.toString().toLowerCase().trim();
  if (!raw) return { all: [], month: [], day: [] };
  const parts = raw.split(/\s+/).filter(Boolean);
  const tokens = new Set(parts);
  const monthTokens = new Set();
  const dayTokens = new Set();
  const monthPart = parts.find((part) => /[a-z]/.test(part));
  const dayPart = parts.find((part) => /\d/.test(part));
  if (monthPart) {
    const cleanedMonth = monthPart.replace(/[^a-z]/g, '');
    if (cleanedMonth) {
      tokens.add(cleanedMonth);
      monthTokens.add(cleanedMonth);
      if (monthMap[cleanedMonth]) {
        tokens.add(monthMap[cleanedMonth]);
        monthTokens.add(monthMap[cleanedMonth]);
      } else {
        const normalizedKey = cleanedMonth.slice(0, 3);
        if (monthMap[normalizedKey]) {
          tokens.add(normalizedKey);
          tokens.add(monthMap[normalizedKey]);
          monthTokens.add(normalizedKey);
          monthTokens.add(monthMap[normalizedKey]);
        }
      }
    }
  }
  if (dayPart) {
    const digits = dayPart.replace(/\D/g, '');
    if (digits) {
      const dayNumber = String(Number(digits));
      const dayZero = digits.padStart(2, '0');
      tokens.add(dayNumber);
      tokens.add(dayZero);
      dayTokens.add(dayNumber);
      dayTokens.add(dayZero);
    }
  }
  return {
    all: Array.from(tokens).filter(Boolean),
    month: Array.from(monthTokens).filter(Boolean),
    day: Array.from(dayTokens).filter(Boolean),
  };
}

function matchesDateTokenSet(poNorm, tokens) {
  if (!tokens.length) return true;
  return tokens.some((token) => new RegExp(`\\b${token}\\b`, 'i').test(poNorm));
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
  buildSectionRows(`Orders with tickets on ${dateStr}`, report?.tickets || []);
  buildSectionRows(`Orders assigned to staff on ${dateStr}`, report?.assigned || []);
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
  const [date, setDate] = useState(getTodayLabel());
  const [initials, setInitials] = useState(PURCHASER_INITIALS);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState({
    closed: false,
    followedUp: false,
    tickets: false,
    assigned: false,
    waiting: false,
  });

  const handleGenerate = async () => {
    if (!date || !initials.length) return;
    setReportLoading(true);
    setError('');
    setCopyStatus('');
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
      const closed = [], followedUp = [], tickets = [], assigned = [], waiting = [];
      for (const o of orders) {
        const po = o.custom_po_number;
        const poNorm = normalizePo(po);
        const notSet = /\bnot set\b/i.test(poNorm);
        const hasTicket = /\bticket\b/i.test(poNorm);
        const hasInitials = initials.some((init) =>
          new RegExp(`\\b${escapeRegex(init)}\\b`, 'i').test(poNorm)
        );
        const dateTokens = buildDateTokens(dateStr);
        const hasDate =
          dateTokens.all.length > 0 &&
          matchesDateTokenSet(poNorm, dateTokens.month) &&
          matchesDateTokenSet(poNorm, dateTokens.day);
        const noteNorm = normalizePo(o.custom_order_note);
        const isAssigned = /\bassigned\s+to\b/i.test(noteNorm) &&
          matchesDateTokenSet(noteNorm, dateTokens.month) &&
          matchesDateTokenSet(noteNorm, dateTokens.day);
        if (!notSet && hasInitials && hasDate && hasTicket) tickets.push(o);
        else if (isAssigned) assigned.push(o);
        else if (!notSet && hasInitials && hasDate && !hasTicket) closed.push(o);
        else if (notSet && hasInitials && hasDate) followedUp.push(o);
        else if (notSet && hasInitials && !hasDate) waiting.push(o);
      }
      setReport({ closed, followedUp, tickets, assigned, waiting });
    } catch (err) {
      setError('Failed to fetch report data.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleExport = () => {
    if (report && date) exportToExcel(report, date);
  };

  const handlePreview = () => {
    if (!report || !date) return;
    const html = buildEmailHtml(report, date, initials);
    setPreviewHtml(html);
    setCopyStatus('');
    setPreviewOpen(true);
  };

  const handleCopyHtml = async () => {
    if (!previewHtml) return;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const htmlBlob = new Blob([previewHtml], { type: 'text/html' });
        const textBlob = new Blob([previewHtml], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob,
          }),
        ]);
        setCopyStatus('Copied formatted table to clipboard.');
      } else {
        await navigator.clipboard.writeText(previewHtml);
        setCopyStatus('Copied HTML to clipboard.');
      }
    } catch (err) {
      setCopyStatus('Failed to copy HTML.');
    }
  };

  const waitingOverdue = (report?.waiting || []).filter((order) =>
    isOlderThanDays(order.created_at, WAITING_RESPONSE_DAYS)
  );

  const handleWaitingOverdueEmail = () => {
    const { subject, body } = buildWaitingOverdueEmail(waitingOverdue);
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
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
          max-width: 1600px;
          margin: 0 auto;
          display: grid;
          gap: 28px;
          width: 100%;
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

        .pr-success {
          color: #027a48;
          font-weight: 600;
        }

        .pr-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          padding: 24px;
        }

        .pr-modal {
          width: min(980px, 100%);
          max-height: 90vh;
          background: #fff;
          border-radius: 16px;
          border: 1px solid var(--stroke);
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.2);
          display: grid;
          grid-template-rows: auto 1fr auto;
        }

        .pr-modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--stroke);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .pr-modal-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--ink);
        }

        .pr-modal-body {
          padding: 16px 20px;
          overflow: auto;
          background: #f9fafb;
        }

        .pr-modal-footer {
          padding: 12px 20px;
          border-top: 1px solid var(--stroke);
          display: flex;
          gap: 12px;
          justify-content: flex-end;
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

        .pr-section.collapsed {
          min-height: 0;
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

        @media (max-width: 900px) {
          .pr-shell {
            gap: 18px;
          }

          .pr-toolbar {
            grid-template-columns: 1fr;
            padding: 14px;
          }

          .pr-actions {
            width: 100%;
          }

          .pr-btn {
            width: 100%;
            text-align: center;
          }

          .pr-section {
            padding: 16px;
          }

          .pr-table-wrap {
            max-height: 60vh;
          }
        }

        @media (max-width: 600px) {
          .pr-container {
            padding: 48px 16px 90px;
          }

          .pr-title {
            font-size: 26px;
          }

          .pr-subtitle {
            font-size: 13px;
          }

          .pr-modal {
            max-height: 92vh;
          }

          .pr-modal-header,
          .pr-modal-body,
          .pr-modal-footer {
            padding: 12px 14px;
          }

          .pr-table {
            font-size: 12px;
          }

          .pr-table th,
          .pr-table td {
            padding: 8px 10px;
          }
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
            <button className="pr-btn secondary" onClick={handlePreview} disabled={!report}>
              Preview Email
            </button>
          </div>
          {error && <div className="pr-error">{error}</div>}
          {copyStatus && <div className="pr-success">{copyStatus}</div>}
        </div>

        {report && (
          <div className="pr-shell">
            <div className={`pr-section${collapsed.closed ? ' collapsed' : ''}`}>
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

            <div className={`pr-section${collapsed.followedUp ? ' collapsed' : ''}`}>
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

            <div className={`pr-section${collapsed.tickets ? ' collapsed' : ''}`}>
              <div className="pr-section-header">
                <button
                  type="button"
                  className="pr-toggle"
                  onClick={() => setCollapsed((prev) => ({ ...prev, tickets: !prev.tickets }))}
                >
                  {collapsed.tickets ? '▶' : '▼'}
                </button>
                <h3 className="pr-section-title">Orders with tickets on {date} ({report.tickets.length})</h3>
              </div>
              {!collapsed.tickets && <ReportTable rows={report.tickets} />}
            </div>

            <div className={`pr-section${collapsed.assigned ? ' collapsed' : ''}`}>
              <div className="pr-section-header">
                <button
                  type="button"
                  className="pr-toggle"
                  onClick={() => setCollapsed((prev) => ({ ...prev, assigned: !prev.assigned }))}
                >
                  {collapsed.assigned ? '▶' : '▼'}
                </button>
                <h3 className="pr-section-title">Orders assigned to staff on {date} ({report.assigned.length})</h3>
              </div>
              {!collapsed.assigned && <ReportTable rows={report.assigned} />}
            </div>

            <div className={`pr-section${collapsed.waiting ? ' collapsed' : ''}`}>
              <div className="pr-section-header">
                <button
                  type="button"
                  className="pr-toggle"
                  onClick={() => setCollapsed((prev) => ({ ...prev, waiting: !prev.waiting }))}
                >
                  {collapsed.waiting ? '▶' : '▼'}
                </button>
                <h3 className="pr-section-title">Orders waiting for a response ({report.waiting.length})</h3>
                <button
                  type="button"
                  className="pr-btn secondary"
                  onClick={handleWaitingOverdueEmail}
                  disabled={!waitingOverdue.length}
                >
                  Email 30+ day waiting ({waitingOverdue.length})
                </button>
              </div>
              {!collapsed.waiting && <ReportTable rows={report.waiting} />}
            </div>
          </div>
        )}
      </div>
      {previewOpen && (
        <div className="pr-modal-backdrop" onClick={() => setPreviewOpen(false)}>
          <div className="pr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pr-modal-header">
              <h3 className="pr-modal-title">Email Preview</h3>
              <button className="pr-btn secondary" onClick={() => setPreviewOpen(false)}>Close</button>
            </div>
            <div className="pr-modal-body">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
            <div className="pr-modal-footer">
              <button className="pr-btn secondary" onClick={handleCopyHtml}>Copy Table</button>
            </div>
          </div>
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
