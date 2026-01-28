import { Spin } from 'antd';

const TableTop = ({
  orderCount,
  notSetCount,
  todayCount,
  yesterdayCount,
  last7DaysCount,
  gwCount,
  pmCount,
  onNotSetClick,
  onPmClick,
  onTodayClick,
  onYesterdayClick,
  onLast7DaysClick,
  activeDateFilter,
  loading = false
}) => {

  const metrics = [
    {
      label: 'Not Set',
      value: notSetCount,
      color: '#ff4d4f',
      bgColor: '#fff2f0',
      borderColor: '#ffccc7',
      onClick: onNotSetClick,
      isActive: false,
    },
    {
      label: 'Today',
      value: todayCount,
      color: '#1890ff',
      bgColor: '#e6f7ff',
      borderColor: '#91d5ff',
      onClick: onTodayClick,
      isActive: activeDateFilter === 'today',
    },
    {
      label: 'Yesterday',
      value: yesterdayCount,
      color: '#faad14',
      bgColor: '#fffbe6',
      borderColor: '#ffe58f',
      onClick: onYesterdayClick,
      isActive: activeDateFilter === 'yesterday',
    },
    {
      label: '7 Days',
      value: last7DaysCount,
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
      isActive: false,
    },
  ];

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
    }}>
      {metrics.map((metric, index) => (
        <div
          key={index}
          onClick={metric.onClick}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 16px',
            minWidth: '80px',
            height: '60px',
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
            fontSize: '11px',
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
            <span style={{
              fontSize: '20px',
              fontWeight: 700,
              color: metric.color,
              lineHeight: 1.2,
            }}>
              {metric.value}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default TableTop;
