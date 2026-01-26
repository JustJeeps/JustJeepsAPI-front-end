import {
  DollarCircleOutlined,
  LikeOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { Card, Col, Row, Statistic } from 'antd';
import { useDashboardData } from '../../hooks/useDashboardData';

const cardStyle = {
  height: '120px',               // ✅ fixed height for all cards
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  textAlign: 'center',
};

const TableTop = ({ orderCount, notSetCount, todayCount, yesterdayCount, last7DaysCount, gwCount, pmCount, onNotSetClick, onPmClick, loading = false }) => {
  console.log('orderCount', orderCount);
  const { state } = useDashboardData();

  return (
    <Row gutter={16}>
      <Col span={4}>
        {/* <Card bordered={false} style={cardStyle}>
          <Statistic
            title='Orders Pulled'
            value={orderCount}
            valueStyle={{ color: '#3f8600' }}
            prefix={<LikeOutlined />}
            loading={loading}
          />
        </Card> */}
      </Col>

    <Col span={4}>
        <Card
          bordered={false}
          style={{ ...cardStyle, cursor: 'pointer', border: '1px solid #ff4d4f' }}
          onClick={onNotSetClick}
          hoverable
        >
          <Statistic title='Not Set Orders' value={notSetCount} valueStyle={{ color: '#ff4d4f' }} loading={loading} />
        </Card>
      </Col>

      <Col span={4}>
        <Card bordered={false} style={cardStyle}>
          <Statistic
            title="Today's Orders"
            value={todayCount}
            valueStyle={{ color: '#1890ff' }}
            loading={loading}
          />
        </Card>
      </Col>

      <Col span={4}>
        <Card bordered={false} style={cardStyle}>
          <Statistic
            title="Yesterday's Orders"
            value={yesterdayCount}
            valueStyle={{ color: '#faad14' }}
            loading={loading}
          />
        </Card>
      </Col>

      <Col span={4}>
        <Card bordered={false} style={cardStyle}>
          <Statistic
            title='Last 7 Days'
            value={last7DaysCount}
            valueStyle={{ color: '#722ed1' }}
            loading={loading}
          />
        </Card>
      </Col>

      <Col span={4}>
        <Card
          bordered={false}
          style={{ ...cardStyle, cursor: 'pointer', border: '1px solid #eb2f96' }}
          onClick={onPmClick}
          hoverable
        >
          <Statistic
            title='PM Not Set Orders'
            value={pmCount}
            valueStyle={{ color: '#eb2f96' }}
            loading={loading}
          />
        </Card>
      </Col>

      {/* <Col span={4}>
        <Card bordered={false} style={cardStyle}>
          <Statistic
            title='Current Date & Time'
            value={new Date().toLocaleString()}
            valueStyle={{ color: '#4B0082' }}
            prefix={<CalendarOutlined />}
          />
        </Card>
      </Col> */}
    </Row>
  );
};

export default TableTop;
