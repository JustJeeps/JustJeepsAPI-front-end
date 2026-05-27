import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Alert, Button, Card, Col, Input, Row, Select, Space, Spin, Statistic, Table, Tag, Typography } from 'antd';
import { EyeOutlined, SearchOutlined } from '@ant-design/icons';
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

const DEFAULT_PROFILE_TAG = { key: 'returningProfile', text: 'Returning customer profile available', color: 'blue' };

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

function buildFraudTags(indicators = {}, options = {}) {
  const { includePositive = true } = options;
  const keys = includePositive
    ? Object.keys(FRAUD_LABELS)
    : ['noPurchaseHistory', 'firstTimeCustomer'];

  return keys
    .filter((key) => indicators[key])
    .map((key) => ({ key, ...FRAUD_LABELS[key] }));
}

export default function QuickBooksCustomerLookup() {
  const [query, setQuery] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 40, total: 0 });
  const [searchLoading, setSearchLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [detailsError, setDetailsError] = useState('');
  const [results, setResults] = useState([]);
  const [selectedCustomerCode, setSelectedCustomerCode] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [sortState, setSortState] = useState({ field: 'customerName', order: 'ascend' });
  const [focusSelectedOnly, setFocusSelectedOnly] = useState(false);

  const resetSearchState = useCallback((pageSize = pagination.pageSize) => {
    setResults([]);
    setSelectedCustomerCode('');
    setSelectedCustomer(null);
    setSearchError('');
    setPagination({ current: 1, pageSize, total: 0 });
  }, [pagination.pageSize]);

  const runSearch = useCallback(async (
    nextQuery,
    nextField,
    nextPage = 1,
    nextPageSize = pagination.pageSize,
    nextSortField = sortState.field,
    nextSortOrder = sortState.order
  ) => {
    const trimmed = String(nextQuery || '').trim();

    if (!trimmed && !showAllCustomers) {
      resetSearchState(nextPageSize);
      return;
    }

    setSearchLoading(true);
    setSearchError('');

    try {
      const response = await axios.get(`${API_BASE_URL}/api/quickbooks/customers/search`, {
        params: {
          q: trimmed,
          field: nextField,
          page: nextPage,
          limit: nextPageSize,
          sortBy: nextSortField,
          sortOrder: nextSortOrder === 'descend' ? 'desc' : 'asc',
        },
      });

      const nextResults = response.data?.results || [];
      setResults(nextResults);
      setPagination({
        current: Number(response.data?.page || nextPage),
        pageSize: Number(response.data?.limit || nextPageSize),
        total: Number(response.data?.total || nextResults.length),
      });

      if (!nextResults.length) {
        setSelectedCustomerCode('');
        setSelectedCustomer(null);
      }
    } catch (error) {
      setResults([]);
      setSelectedCustomerCode('');
      setSelectedCustomer(null);
      setPagination((prev) => ({ ...prev, total: 0 }));
      const backendMessage = error.response?.data?.error;
      const isGenericBackendFailure = /failed to search quickbooks customers/i.test(String(backendMessage || ''));
      setSearchError(
        !backendMessage || isGenericBackendFailure
          ? 'Search is temporarily unavailable. Please try again.'
          : backendMessage
      );
    } finally {
      setSearchLoading(false);
    }
  }, [pagination.pageSize, resetSearchState, showAllCustomers, sortState.field, sortState.order]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      runSearch(query, searchField, 1, pagination.pageSize);
    }, 250);

    return () => window.clearTimeout(handle);
  }, [query, searchField, runSearch, pagination.pageSize, showAllCustomers]);

  const handleTableChange = useCallback((nextPagination, _filters, sorter) => {
    const normalizedSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    const nextSortField = normalizedSorter?.field || sortState.field;
    const nextSortOrder = normalizedSorter?.order || null;

    if (nextSortOrder) {
      setSortState({ field: nextSortField, order: nextSortOrder });
      runSearch(query, searchField, nextPagination.current, nextPagination.pageSize, nextSortField, nextSortOrder);
      return;
    }

    setSortState({ field: 'customerName', order: 'ascend' });
    runSearch(query, searchField, nextPagination.current, nextPagination.pageSize, 'customerName', 'ascend');
  }, [query, searchField, runSearch, sortState.field]);

  const handleShowAllCustomers = useCallback(() => {
    const nextShowAll = !showAllCustomers;
    setShowAllCustomers(nextShowAll);

    if (!nextShowAll) {
      setQuery('');
      resetSearchState(pagination.pageSize);
      return;
    }

    setQuery('');
  }, [pagination.pageSize, resetSearchState, showAllCustomers]);

  const handleViewCustomer = useCallback((customerCode) => {
    setSelectedCustomerCode(customerCode);
    setFocusSelectedOnly(true);
  }, []);

  const visibleResults = useMemo(() => {
    if (!focusSelectedOnly) return results;
    return results.filter((record) => record.customerCode === selectedCustomerCode);
  }, [focusSelectedOnly, results, selectedCustomerCode]);

  useEffect(() => {
    if (!focusSelectedOnly || !selectedCustomerCode) return;

    const stillVisible = results.some((record) => record.customerCode === selectedCustomerCode);
    if (!stillVisible) {
      setFocusSelectedOnly(false);
    }
  }, [focusSelectedOnly, results, selectedCustomerCode]);

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
      title: 'View',
      key: 'view',
      width: 70,
      align: 'center',
      render: (_, record) => (
        <Button
          type='text'
          size='small'
          icon={<EyeOutlined />}
          onClick={(event) => {
            event.stopPropagation();
            handleViewCustomer(record.customerCode);
          }}
          aria-label={`View ${record.customerName || record.customerCode}`}
        />
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (_, record) => {
        const rowTags = buildFraudTags(record.fraudIndicators, { includePositive: false });
        const displayTags = rowTags.length ? rowTags : [DEFAULT_PROFILE_TAG];

        return (
          <div>
            <div className='qb-lookup__cell-title'>{record.customerName || record.customerCode}</div>
            <div className='qb-lookup__muted'>Code: {record.customerCode}</div>
            <div className='qb-lookup__table-signal'>
              {displayTags.map((tag) => (
                <Tag key={`${record.customerCode}-${tag.key}`} color={tag.color}>{tag.text}</Tag>
              ))}
            </div>
          </div>
        );
      },
      sorter: true,
      sortOrder: sortState.field === 'customerName' ? sortState.order : null,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (value) => value || '-',
      sorter: true,
      sortOrder: sortState.field === 'email' ? sortState.order : null,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (value) => value || '-',
      sorter: true,
      sortOrder: sortState.field === 'phone' ? sortState.order : null,
    },
    {
      title: 'Invoices',
      dataIndex: 'totalInvoices',
      key: 'totalInvoices',
      width: 110,
      sorter: true,
      sortOrder: sortState.field === 'totalInvoices' ? sortState.order : null,
    },
    {
      title: 'Payments',
      dataIndex: 'totalPayments',
      key: 'totalPayments',
      width: 110,
      sorter: true,
      sortOrder: sortState.field === 'totalPayments' ? sortState.order : null,
    },
    {
      title: 'Lifetime Value',
      dataIndex: 'lifetimeValue',
      key: 'lifetimeValue',
      width: 160,
      render: (value) => formatCurrency(value),
      sorter: true,
      sortOrder: sortState.field === 'lifetimeValue' ? sortState.order : null,
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      render: (value) => value || '-',
      sorter: true,
      sortOrder: sortState.field === 'address' ? sortState.order : null,
    },
  ]), [handleViewCustomer, sortState.field, sortState.order]);

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
            <Col xs={24} md={4}>
              <Button
                onClick={handleShowAllCustomers}
                style={{ width: '100%' }}
              >
                {showAllCustomers ? 'Hide All Customers' : 'Show All Customers'}
              </Button>
            </Col>
            <Col xs={24} md={8}>
              <Select
                value={searchField}
                options={SEARCH_FIELDS}
                onChange={setSearchField}
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={24} md={12}>
              <Input
                value={query}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (nextValue.trim()) {
                    setShowAllCustomers(false);
                  }
                  setQuery(nextValue);
                }}
                prefix={<SearchOutlined />}
                placeholder='Type at least 2 characters to search...'
                allowClear
              />
            </Col>
          </Row>

          {searchError ? <Alert type='error' showIcon message={searchError} /> : null}

          {focusSelectedOnly && selectedCustomerCode ? (
            <Button onClick={() => setFocusSelectedOnly(false)}>
              Show All Results
            </Button>
          ) : null}

          <Table
            rowKey='customerCode'
            loading={searchLoading}
            columns={searchColumns}
            dataSource={visibleResults}
            pagination={focusSelectedOnly ? false : {
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              pageSizeOptions: ['20', '40', '80', '120'],
            }}
            onChange={handleTableChange}
            onRow={(record) => ({
              onClick: () => handleViewCustomer(record.customerCode),
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
              emptyText: query.trim().length < 1 && !showAllCustomers
                ? 'Use search or click Show All Customers'
                : 'No matching customers found in QuickBooks Desktop data',
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
