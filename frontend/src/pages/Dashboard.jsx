import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invoiceApi } from '../services/api';
import { formatRupiah } from '../utils/format';
import {
  FileText, TrendingUp, AlertCircle, CheckCircle,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function formatMonth(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['invoices', { page: 1, per_page: 1 }],
    queryFn: () => invoiceApi.list({ page: 1, per_page: 1 }).then((r) => r.data),
  });

  const stats = useMemo(() => ({
    total:   data?.total ?? 0,
    paid:    data?.stats?.paid ?? 0,
    partial: data?.stats?.partial ?? 0,
    unpaid:  data?.stats?.unpaid ?? 0,
    revenue: data?.stats?.revenue ?? 0,
  }), [data]);

  const monthlyData = useMemo(() => {
    const raw = data?.monthly_data ?? [];
    return raw.map((d) => ({
      ...d,
      label: formatMonth(d.month),
      total: Number(d.total),
      received: Number(d.received),
      count: Number(d.count),
    }));
  }, [data]);

  const totalsByMonth = useMemo(() => {
    const raw = data?.monthly_data ?? [];
    return [...raw].reverse();
  }, [data]);

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Ringkasan data invoice keseluruhan</p>
          </div>
        </div>
        <div className="table-empty"><div className="spinner" /><p>Memuat data...</p></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Ringkasan data invoice keseluruhan</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { icon: FileText,    color: 'blue',   value: stats.total,                 label: 'Total Invoice' },
          { icon: CheckCircle, color: 'green',  value: stats.paid,                  label: 'Lunas' },
          { icon: AlertCircle, color: 'orange', value: stats.partial,               label: 'Sebagian' },
          { icon: AlertCircle, color: 'red',    value: stats.unpaid,                label: 'Belum Lunas' },
          { icon: TrendingUp,  color: 'purple', value: formatRupiah(stats.revenue), label: 'Total Diterima' },
        ].map(({ icon: Icon, color, value, label }) => (
          <div key={label} className="stat-card">
            <div className={`stat-icon stat-icon--${color}`}><Icon size={20} /></div>
            <div className="stat-info">
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {monthlyData.length > 0 && (
        <div className="card dashboard-chart-card">
          <h3 className="card-title">Grafik 12 Bulan Terakhir</h3>
          <div className="dashboard-chart-wrap">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={monthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--text-muted)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--text-muted)" tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}jt` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}rb` : v} />
                <Tooltip formatter={(v) => formatRupiah(v)} />
                <Legend />
                <Line type="monotone" dataKey="total"   name="Total"   stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="received" name="Diterima" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Monthly Summary Table */}
      {totalsByMonth.length > 0 && (
        <div className="card">
          <h3 className="card-title">Total per Bulan</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Bulan</th>
                <th className="text-center">Jumlah Invoice</th>
                <th className="text-right">Total Tagihan</th>
                <th className="text-right">Total Diterima</th>
              </tr>
            </thead>
            <tbody>
              {totalsByMonth.map((row) => (
                <tr key={row.month}>
                  <td>{formatMonth(row.month)}</td>
                  <td className="text-center">{row.count}</td>
                  <td className="text-right">{formatRupiah(row.total)}</td>
                  <td className="text-right">{formatRupiah(row.received)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
