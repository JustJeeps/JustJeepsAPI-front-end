import { Spin } from 'antd';

const TableTop = ({
  orderCount,
  notSetCount,
  staleNotSetCount,
  todayCount,
  yesterdayCount,
  last7DaysCount,
  todaySalesTotal,
  yesterdaySalesTotal,
  last7DaysSalesTotal,
  gwCount,
  pmCount,
  kdCount,
  onNotSetClick,
  onNotSet3DaysClick,
  onPmClick,
  onKdClick,
  onTodayClick,
  onYesterdayClick,
  onLast7DaysClick,
  activePoStatus,
  activeDateFilter,
  loading = false
}) => {

  // Dollar value of sales: only rendered when the backend sent it (restricted
  // to allowlisted users), so other users see the cards unchanged. The backend
  // sends per-currency sums ({ CAD: 4153, USD: 310 }); each currency gets its
  // own line so CAD and USD are never mixed.
  const formatMoney = (value) =>
    `$${Number(value).toLocaleString('en-CA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;

  const formatSalesTotal = (totals) => {
    if (totals == null || typeof totals !== 'object') return null;
    const lines = Object.entries(totals)
      .filter(([, amount]) => Number(amount) !== 0)
      .sort(([a], [b]) => a.localeCompare(b)) // CAD before USD
      .map(([currency, amount]) => `${formatMoney(amount)} ${currency}`);
    return lines.length ? lines : null;
  };

  const metrics = [
    {
      label: 'Not Set',
      value: notSetCount,
      color: '#ff4d4f',
      bgColor: '#fff2f0',
      borderColor: '#ffccc7',
      onClick: onNotSetClick,
      isActive: activePoStatus === 'not_set',
    },
    {
      label: 'Not Set > 4days',
      value: staleNotSetCount,
      color: '#cf1322',
      bgColor: '#fff1f0',
      borderColor: '#ffa39e',
      onClick: onNotSet3DaysClick,
      isActive: activePoStatus === 'not_set_4days',
    },
    {
      label: 'Today',
      value: todayCount,
      salesTotal: formatSalesTotal(todaySalesTotal),
      color: '#1890ff',
      bgColor: '#e6f7ff',
      borderColor: '#91d5ff',
      onClick: onTodayClick,
      isActive: activeDateFilter === 'today',
    },
    {
      label: 'Yesterday',
      value: yesterdayCount,
      salesTotal: formatSalesTotal(yesterdaySalesTotal),
      color: '#faad14',
      bgColor: '#fffbe6',
      borderColor: '#ffe58f',
      onClick: onYesterdayClick,
      isActive: activeDateFilter === 'yesterday',
    },
    {
      label: '7 Days',
      value: last7DaysCount,
      salesTotal: formatSalesTotal(last7DaysSalesTotal),
      color: '#722ed1',
      bgColor: '#f9f0ff',
      borderColor: '#d3adf7',
      onClick: onLast7DaysClick,
      isActive: activeDateFilter === 'last7days',
    },
    {
      label: 'PM Not Set',
      value: pmCount,
      color: '#eb2f96',
      bgColor: '#fff0f6',
      borderColor: '#ffadd2',
      onClick: onPmClick,
      isActive: activePoStatus === 'pm_not_set',
    },
    {
      label: 'KD Not Set',
      value: kdCount,
      color: '#13c2c2',
      bgColor: '#e6fffb',
      borderColor: '#87e8de',
      onClick: onKdClick,
      isActive: activePoStatus === 'kd_not_set',
    },
  ];

  return (
    <div
      className="tabletop-metrics"
      style={{
        display: 'flex',
        gap: 'var(--tt-card-gap, 8px)',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
      }}
    >
      {metrics.map((metric, index) => (
        <div
          key={index}
          onClick={metric.onClick}
          className={`tabletop-card${metric.isActive ? ' tabletop-card-active' : ''}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--tt-card-padding, 8px 16px)',
            minWidth: 'var(--tt-card-min-width, 80px)',
            minHeight: 'var(--tt-card-height, 60px)',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: metric.isActive ? metric.bgColor : '#fff',
            border: `2px solid ${metric.isActive ? metric.color : metric.borderColor}`,
            boxShadow: metric.isActive
              ? `0 2px 8px ${metric.color}40`
              : '0 1px 3px rgba(0,0,0,0.08)',
          }}
          onMouseEnter={(e) => {
            if (!metric.isActive) {
              e.currentTarget.style.backgroundColor = metric.bgColor;
              e.currentTarget.style.borderColor = metric.color;
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 4px 12px ${metric.color}30`;
            }
          }}
          onMouseLeave={(e) => {
            if (!metric.isActive) {
              e.currentTarget.style.backgroundColor = '#fff';
              e.currentTarget.style.borderColor = metric.borderColor;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
            }
          }}
        >
          <span style={{
            fontSize: 'var(--tt-label-size, 11px)',
            fontWeight: 500,
            color: '#666',
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
          }}>
            {metric.label}
          </span>
          {loading ? (
            <Spin size="small" />
          ) : (
            <>
              <span style={{
                fontSize: 'var(--tt-value-size, 20px)',
                fontWeight: 700,
                color: metric.color,
                lineHeight: 1.2,
              }}>
                {metric.value}
              </span>
              {metric.salesTotal && metric.salesTotal.map((line) => (
                <span key={line} style={{
                  fontSize: 'var(--tt-label-size, 11px)',
                  fontWeight: 600,
                  color: metric.color,
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                }}>
                  {line}
                </span>
              ))}
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default TableTop;
