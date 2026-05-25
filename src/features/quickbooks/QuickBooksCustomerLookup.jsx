import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Alert, Card, Col, Input, Row, Select, Space, Spin, Statistic, Table, Tag, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import './quickbooksCustomerLookup.scss';

const { Title, Text } = Typography;
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const SEARCH_FIELDS = [
  { label: 'All fields', value: 'all' },
  { label: 'Customer code', value: 'code' },
  { label: 'Customer name', value: 'name' },
  { label: 'Address', value: 'address' },
  { label: 'Email', value: 'email' },
  { label: 'Phone number', value: 'phone' },
];

const FRAUD_LABELS = {
  noPurchaseHistory: { text: 'No purchase history', color: 'error' },
  firstTimeCustomer: { text: 'Single recorded purchase', color: 'warning' },
  significantPurchaseHistory: { text: 'Significant purchase history', color: 'success' },
};

function formatCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '$0.00';
  return number.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function buildFraudTags(indicators = {}) {
  return Object.entries(FRAUD_LABELS)
    .filter(([key]) => indicators[key])
    .map(([key, meta]) => ({ key, ...meta }));
}

export default function QuickBooksCustomerLookup() {
  const [query, setQuery] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [searchLoading, setSearchLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [detailsError, setDetailsError] = useState('');
  const [results, setResults] = useState([]);
  const [selectedCustomerCode, setSelectedCustomerCode] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const runSearch = useCallback(async (nextQuery, nextField) => {
    const trimmed = String(nextQuery || '').trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSelectedCustomerCode('');
      setSelectedCustomer(null);
      setSearchError('');
      return;
    }

    setSearchLoading(true);
    setSearchError('');

    try {
      const response = await axios.get(`${API_BASE_URL}/api/quickbooks/customers/search`, {
        params: {
          q: trimmed,
          field: nextField,
          limit: 40,
        },
      });

      const nextResults = response.data?.results || [];
      setResults(nextResults);

      if (!nextResults.length) {
        setSelectedCustomerCode('');
        setSelectedCustomer(null);
      }
    } catch (error) {
      setResults([]);
      setSelectedCustomerCode('');
      setSelectedCustomer(null);
      setSearchError(error.response?.data?.error || 'Failed to search QuickBooks customers');
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      runSearch(query, searchField);
    }, 250);

    return () => window.clearTimeout(handle);
  }, [query, searchField, runSearch]);

  useEffect(() => {
    const customerCode = selectedCustomerCode || '';
    if (!customerCode) {
      setSelectedCustomer(null);
      setDetailsError('');
      return;
    }

    const fetchDetails = async () => {
      setDetailLoading(true);
      setDetailsError('');

      try {
        const response = await axios.get(`${API_BASE_URL}/api/quickbooks/customers/details`, {
          params: { customerCode },
        });
        setSelectedCustomer(response.data);
      } catch (error) {
        setSelectedCustomer(null);
        setDetailsError(error.response?.data?.error || 'Failed to fetch customer details');
      } finally {
        setDetailLoading(false);
      }
    };

    fetchDetails();
  }, [selectedCustomerCode]);

  const searchColumns = useMemo(() => ([
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (_, record) => (
        <div>
          <div className='qb-lookup__cell-title'>{record.customerName || record.customerCode}</div>
          <div className='qb-lookup__muted'>Code: {record.customerCode}</div>
          {record.fraudIndicators?.firstTimeCustomer ? (
            <div className='qb-lookup__table-signal'>
              <Tag color={FRAUD_LABELS.firstTimeCustomer.color}>{FRAUD_LABELS.firstTimeCustomer.text}</Tag>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (value) => value || '-',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (value) => value || '-',
    },
    {
      title: 'Invoices',
      dataIndex: 'totalInvoices',
      key: 'totalInvoices',
      width: 110,
    },
    {
      title: 'Payments',
      dataIndex: 'totalPayments',
      key: 'totalPayments',
      width: 110,
    },
    {
      title: 'Lifetime Value',
      dataIndex: 'lifetimeValue',
      key: 'lifetimeValue',
      width: 160,
      render: (value) => formatCurrency(value),
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      render: (value) => value || '-',
    },
  ]), []);

  const transactionColumns = useMemo(() => ([
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 130,
      render: (value) => formatDate(value),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 150,
    },
    {
      title: 'Reference',
      dataIndex: 'referenceNumber',
      key: 'referenceNumber',
      width: 170,
      render: (value) => value || '-',
    },
    {
      title: 'Account',
      dataIndex: 'account',
      key: 'account',
      width: 220,
      render: (value) => value || '-',
    },
    {
      title: 'Memo',
      dataIndex: 'memo',
      key: 'memo',
      render: (value) => value || '-',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      align: 'right',
      render: (value) => formatCurrency(value),
    },
  ]), []);

  const analysis = selectedCustomer?.analysis || {};
  const fraudTags = buildFraudTags(analysis.fraudIndicators);
  const isHighAttention = Boolean(analysis.fraudIndicators?.noPurchaseHistory);

  return (
    <div className='qb-lookup'>
      <div className='qb-lookup__hero'>
        <div>
          <p className='qb-lookup__eyebrow'>Fraud Review</p>
          <Title level={2}>QuickBooks Customer Lookup</Title>
          <Text className='qb-lookup__subtitle'>
            Search by code, customer name, address, email, or phone to verify purchase history fast.
          </Text>
        </div>
      </div>

      <Card className='qb-lookup__search-card'>
        <Space direction='vertical' size={14} style={{ width: '100%' }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={8}>
              <Select
                value={searchField}
                options={SEARCH_FIELDS}
                onChange={setSearchField}
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={24} md={16}>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                prefix={<SearchOutlined />}
                placeholder='Type at least 2 characters to search...'
                allowClear
              />
            </Col>
          </Row>

          {searchError ? <Alert type='error' showIcon message={searchError} /> : null}

          <Table
            rowKey='customerCode'
            loading={searchLoading}
            columns={searchColumns}
            dataSource={results}
            pagination={{ pageSize: 8 }}
            onRow={(record) => ({
              onClick: () => setSelectedCustomerCode(record.customerCode),
            })}
            rowClassName={(record) => {
              const classNames = [];
              if (record.fraudIndicators?.noPurchaseHistory) {
                classNames.push('qb-lookup__row--attention');
              }
              if (record.customerCode === selectedCustomerCode) {
                classNames.push('qb-lookup__row--selected');
              }
              return classNames.join(' ');
            }}
            locale={{
              emptyText: query.trim().length < 2
                ? 'Enter 2+ characters to search customers'
                : 'No matching customers found',
            }}
          />
        </Space>
      </Card>

      {detailsError ? <Alert type='error' showIcon message={detailsError} style={{ marginTop: 16 }} /> : null}

      <div className='qb-lookup__details'>
        {detailLoading ? (
          <div className='qb-lookup__loading'>
            <Spin size='large' />
          </div>
        ) : selectedCustomer ? (
          <>
            <Card className={`qb-lookup__summary-card${isHighAttention ? ' qb-lookup__summary-card--attention' : ''}`}>
              <Row gutter={[16, 16]} align='middle'>
                <Col xs={24} md={14}>
                  <Title level={4} style={{ marginBottom: 6 }}>{selectedCustomer.customerName || selectedCustomer.customerCode}</Title>
                  <div className='qb-lookup__fraud-tags qb-lookup__fraud-tags--near-name'>
                    {fraudTags.length ? fraudTags.map((tag) => (
                      <Tag key={tag.key} color={tag.color}>{tag.text}</Tag>
                    )) : <Tag color='blue'>Returning customer profile available</Tag>}
                  </div>
                  <div className='qb-lookup__meta-grid'>
                    <div><strong>Code:</strong> {selectedCustomer.customerCode || '-'}</div>
                    <div><strong>Email:</strong> {selectedCustomer.email || '-'}</div>
                    <div><strong>Phone:</strong> {selectedCustomer.phone || '-'}</div>
                    <div><strong>Address:</strong> {selectedCustomer.address || '-'}</div>
                    <div><strong>Current QuickBooks Balance:</strong> {formatCurrency(selectedCustomer.currentQuickBooksBalance)}</div>
                    <div><strong>Years as Customer:</strong> {analysis.yearsAsCustomer ?? 0}</div>
                  </div>
                </Col>

                <Col xs={24} md={10}>
                  <div className='qb-lookup__stats-grid'>
                    <Statistic title='Has Purchased Before' value={analysis.hasPurchasedBefore ? 'Yes' : 'No'} />
                    <Statistic title='Total Invoices' value={analysis.totalInvoices || 0} />
                    <Statistic title='Total Payments' value={analysis.totalPayments || 0} />
                    <Statistic title='Total Amount Purchased' value={formatCurrency(analysis.totalAmountPurchased)} />
                    <Statistic title='Lifetime Value' value={formatCurrency(analysis.lifetimeValue)} />
                    <Statistic title='First Purchase' value={formatDate(analysis.firstPurchaseDate)} />
                    <Statistic title='Last Purchase' value={formatDate(analysis.lastPurchaseDate)} />
                  </div>
                </Col>
              </Row>

            </Card>

            <Card className='qb-lookup__transactions-card' title='Recent Invoices and Payments'>
              <Table
                rowKey={(record, index) => `${record.type}-${record.referenceNumber}-${record.date}-${index}`}
                columns={transactionColumns}
                dataSource={selectedCustomer.recentTransactions || []}
                pagination={{ pageSize: 10 }}
              />
            </Card>
          </>
        ) : (
          <Card className='qb-lookup__empty'>
            Select a customer from search results to view summary and transaction history.
          </Card>
        )}
      </div>
    </div>
  );
}
