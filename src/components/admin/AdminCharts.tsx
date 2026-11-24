import React, { useMemo, useState } from 'react';
import type { Order } from '../../types';
import { formatINR } from '../../utils/whatsapp';

interface AdminChartsProps {
  orders: Order[];
  dateLabel: string;
}

interface DailyPoint {
  dateKey: string;
  label: string;
  revenue: number;
  deliveryCharges: number;
  orderCount: number;
}

function buildDailySeries(orders: Order[]): DailyPoint[] {
  const byDay = new Map<string, DailyPoint>();
  const activeOrders = orders.filter((o) => o.status !== 'Cancelled' && o.status !== 'Returned');

  for (const order of activeOrders) {
    const dt = new Date(order.createdAt);
    if (Number.isNaN(dt.getTime())) continue;
    const dateKey = dt.toISOString().slice(0, 10);
    const label = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const existing = byDay.get(dateKey) || {
      dateKey,
      label,
      revenue: 0,
      deliveryCharges: 0,
      orderCount: 0,
    };
    existing.revenue += order.totalAmount;
    existing.deliveryCharges += order.shippingFee;
    existing.orderCount += 1;
    byDay.set(dateKey, existing);
  }

  return Array.from(byDay.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey)).slice(-14);
}

export const AdminCharts: React.FC<AdminChartsProps> = ({ orders, dateLabel }) => {
  const [hoveredRevIdx, setHoveredRevIdx] = useState<number | null>(null);
  const [hoveredBarIdx, setHoveredBarIdx] = useState<number | null>(null);

  const orderStatusData = useMemo(() => {
    const buckets = [
      {
        label: 'Pending / Awaiting',
        color: '#D97706',
        count: orders.filter((o) =>
          ['Pending', 'Pending Confirmation', 'Payment Verification Pending'].includes(o.status)
        ).length,
      },
      {
        label: 'Confirmed / Processing',
        color: '#2563EB',
        count: orders.filter((o) => ['Confirmed', 'Processing'].includes(o.status)).length,
      },
      {
        label: 'Packed',
        color: '#7C3AED',
        count: orders.filter((o) => o.status === 'Packed').length,
      },
      {
        label: 'Shipped / Out',
        color: '#0D9488',
        count: orders.filter((o) => ['Shipped', 'Out for Delivery'].includes(o.status)).length,
      },
      {
        label: 'Delivered',
        color: '#1B4332',
        count: orders.filter((o) => o.status === 'Delivered').length,
      },
      {
        label: 'Cancelled / Returned',
        color: '#DC2626',
        count: orders.filter((o) => ['Cancelled', 'Returned'].includes(o.status)).length,
      },
    ];
    const max = Math.max(1, ...buckets.map((b) => b.count));
    return { buckets, max, total: orders.length };
  }, [orders]);

  const deliveryStatusData = useMemo(() => {
    const delivered = orders.filter((o) => o.status === 'Delivered').length;
    const inTransit = orders.filter((o) => ['Shipped', 'Out for Delivery'].includes(o.status)).length;
    const readyToDispatch = orders.filter((o) =>
      ['Confirmed', 'Processing', 'Packed'].includes(o.status)
    ).length;
    const awaitingConfirm = orders.filter((o) =>
      ['Pending', 'Pending Confirmation', 'Payment Verification Pending'].includes(o.status)
    ).length;
    const returnedOrCancelled = orders.filter((o) =>
      ['Cancelled', 'Returned'].includes(o.status)
    ).length;
    const total = Math.max(1, orders.length);
    return {
      total: orders.length,
      items: [
        { label: 'Delivered Successfully', count: delivered, pct: Math.round((delivered / total) * 100), color: '#1B4332' },
        { label: 'Shipped / Out for Delivery', count: inTransit, pct: Math.round((inTransit / total) * 100), color: '#0284C7' },
        { label: 'Ready to Dispatch (Confirmed/Packed)', count: readyToDispatch, pct: Math.round((readyToDispatch / total) * 100), color: '#B88A3B' },
        { label: 'Awaiting Confirmation', count: awaitingConfirm, pct: Math.round((awaitingConfirm / total) * 100), color: '#D97706' },
        { label: 'Cancelled / Returned', count: returnedOrCancelled, pct: Math.round((returnedOrCancelled / total) * 100), color: '#DC2626' },
      ],
    };
  }, [orders]);

  const dailySeries = useMemo(() => buildDailySeries(orders), [orders]);

  const codVsOnline = useMemo(() => {
    const isCod = (o: Order) => o.paymentMethod.toLowerCase().includes('cash');
    const valid = orders.filter((o) => o.status !== 'Cancelled');
    const codOrders = valid.filter(isCod);
    const onlineOrders = valid.filter((o) => !isCod(o));
    const codTotal = codOrders.reduce((s, o) => s + o.totalAmount, 0);
    const onlineTotal = onlineOrders.reduce((s, o) => s + o.totalAmount, 0);
    const codCollected = codOrders
      .filter((o) => o.paymentStatus === 'Verified Paid')
      .reduce((s, o) => s + o.totalAmount, 0);
    const onlineVerified = onlineOrders
      .filter((o) => o.paymentStatus === 'Verified Paid')
      .reduce((s, o) => s + o.totalAmount, 0);

    return {
      codCount: codOrders.length,
      onlineCount: onlineOrders.length,
      codTotal,
      onlineTotal,
      codCollected,
      onlineVerified,
      maxRev: Math.max(1, codTotal, onlineTotal),
    };
  }, [orders]);

  const paidVsUnpaid = useMemo(() => {
    const paid = orders.filter((o) => o.paymentStatus === 'Verified Paid');
    const pendingVer = orders.filter((o) => o.paymentStatus === 'Verification Pending');
    const unpaid = orders.filter((o) => o.paymentStatus === 'Unpaid' && o.status !== 'Cancelled');
    const rejectedOrRefunded = orders.filter((o) =>
      ['Payment Rejected', 'Refunded'].includes(o.paymentStatus)
    );

    const segments = [
      {
        label: 'Verified Paid',
        count: paid.length,
        amount: paid.reduce((s, o) => s + o.totalAmount, 0),
        color: '#1B4332',
      },
      {
        label: 'Verification Pending',
        count: pendingVer.length,
        amount: pendingVer.reduce((s, o) => s + o.totalAmount, 0),
        color: '#B88A3B',
      },
      {
        label: 'Unpaid / COD Pending',
        count: unpaid.length,
        amount: unpaid.reduce((s, o) => s + o.totalAmount, 0),
        color: '#D97706',
      },
      {
        label: 'Rejected / Refunded',
        count: rejectedOrRefunded.length,
        amount: rejectedOrRefunded.reduce((s, o) => s + o.totalAmount, 0),
        color: '#DC2626',
      },
    ];
    const totalCount = Math.max(
      1,
      segments.reduce((s, seg) => s + seg.count, 0)
    );
    return { segments, rawTotal: segments.reduce((s, seg) => s + seg.count, 0), totalCount };
  }, [orders]);

  const maxRevenue = Math.max(1, ...dailySeries.map((d) => d.revenue));
  const chartW = 460;
  const chartH = 160;
  const padX = 24;
  const padY = 18;
  const innerW = chartW - padX * 2;
  const innerH = chartH - padY * 2;

  const linePoints = dailySeries.map((pt, i) => {
    const x =
      dailySeries.length <= 1
        ? padX + innerW / 2
        : padX + (i / (dailySeries.length - 1)) * innerW;
    const y = padY + innerH - (pt.revenue / maxRevenue) * innerH;
    return { ...pt, x, y };
  });

  const polylineStr = linePoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaStr =
    linePoints.length > 0
      ? `${linePoints[0].x.toFixed(1)},${(padY + innerH).toFixed(1)} ${polylineStr} ${linePoints[
          linePoints.length - 1
        ].x.toFixed(1)},${(padY + innerH).toFixed(1)}`
      : '';

  // SVG Donut math
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let runningOffset = 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
      {/* 1. Order Status Graph */}
      <section className="rounded-xl bg-white border border-slate-200 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#163024]">Order Status Graph</h3>
              <p className="text-xs text-slate-500">{dateLabel} · {orderStatusData.total} orders</p>
            </div>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Live DB</span>
          </div>
          <div className="space-y-3">
            {orderStatusData.buckets.map((bucket) => {
              const pct = Math.round((bucket.count / orderStatusData.max) * 100);
              return (
                <div key={bucket.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium">{bucket.label}</span>
                    <span className="font-semibold text-[#163024] tabular-nums">{bucket.count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${bucket.count > 0 ? Math.max(6, pct) : 0}%`,
                        backgroundColor: bucket.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. Delivery Status Graph */}
      <section className="rounded-xl bg-white border border-slate-200 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#163024]">Delivery Status Graph</h3>
              <p className="text-xs text-slate-500">Fulfillment progress across orders</p>
            </div>
            <span className="text-xs font-semibold text-[#1B4332] tabular-nums">
              {deliveryStatusData.total} Total
            </span>
          </div>
          <div className="space-y-3.5">
            {deliveryStatusData.items.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700">{item.label}</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {item.count} ({item.pct}%)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-md bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all duration-300"
                    style={{
                      width: `${item.count > 0 ? Math.max(4, item.pct) : 0}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Revenue Graph (Area/Line SVG) */}
      <section className="rounded-xl bg-white border border-slate-200 p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[#163024]">Revenue Graph</h3>
            <p className="text-xs text-slate-500">Order value trend ({dateLabel})</p>
          </div>
          <span className="text-xs font-semibold text-[#163024] tabular-nums">
            {formatINR(dailySeries.reduce((s, d) => s + d.revenue, 0))}
          </span>
        </div>

        {dailySeries.length === 0 ? (
          <div className="h-44 flex items-center justify-center rounded-lg bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
            No active revenue orders in selected date range
          </div>
        ) : (
          <div className="relative">
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-44 overflow-visible">
              <defs>
                <linearGradient id="ojasRevFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1B4332" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#1B4332" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {[0, 0.5, 1].map((ratio) => {
                const y = padY + innerH - ratio * innerH;
                return (
                  <line
                    key={ratio}
                    x1={padX}
                    x2={chartW - padX}
                    y1={y}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeDasharray="3 3"
                  />
                );
              })}
              {areaStr && <polygon points={areaStr} fill="url(#ojasRevFill)" />}
              {polylineStr && (
                <polyline
                  fill="none"
                  stroke="#163024"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={polylineStr}
                />
              )}
              {linePoints.map((pt, idx) => (
                <g
                  key={pt.dateKey}
                  onMouseEnter={() => setHoveredRevIdx(idx)}
                  onMouseLeave={() => setHoveredRevIdx(null)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredRevIdx === idx ? 5.5 : 3.5}
                    fill={hoveredRevIdx === idx ? '#B88A3B' : '#163024'}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                </g>
              ))}
            </svg>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 tabular-nums">
              <span>{dailySeries[0]?.label}</span>
              {hoveredRevIdx !== null && linePoints[hoveredRevIdx] ? (
                <span className="font-semibold text-[#163024]">
                  {linePoints[hoveredRevIdx].label}: {formatINR(linePoints[hoveredRevIdx].revenue)} ({linePoints[hoveredRevIdx].orderCount} orders)
                </span>
              ) : (
                <span>Hover points for details</span>
              )}
              <span>{dailySeries[dailySeries.length - 1]?.label}</span>
            </div>
          </div>
        )}
      </section>

      {/* 4. Daily Revenue Graph (Bar Chart) */}
      <section className="rounded-xl bg-white border border-slate-200 p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[#163024]">Daily Revenue Graph</h3>
            <p className="text-xs text-slate-500">Day-by-day sales volume</p>
          </div>
          {hoveredBarIdx !== null && dailySeries[hoveredBarIdx] ? (
            <span className="text-xs font-semibold text-[#163024] tabular-nums">
              {dailySeries[hoveredBarIdx].label}: {formatINR(dailySeries[hoveredBarIdx].revenue)}
            </span>
          ) : (
            <span className="text-[11px] text-slate-500">Last {dailySeries.length || 0} active days</span>
          )}
        </div>

        {dailySeries.length === 0 ? (
          <div className="h-44 flex items-center justify-center rounded-lg bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
            No daily revenue recorded for selected filter
          </div>
        ) : (
          <div className="h-44 flex items-end gap-1.5 pt-4 pb-1 border-b border-slate-200">
            {dailySeries.map((pt, idx) => {
              const heightPct = Math.max(8, Math.round((pt.revenue / maxRevenue) * 100));
              const isHovered = hoveredBarIdx === idx;
              return (
                <div
                  key={pt.dateKey}
                  onMouseEnter={() => setHoveredBarIdx(idx)}
                  onMouseLeave={() => setHoveredBarIdx(null)}
                  className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                  title={`${pt.label}: ${formatINR(pt.revenue)} (${pt.orderCount} orders)`}
                >
                  <div
                    className={`w-full max-w-[28px] rounded-t-md transition-all ${
                      isHovered ? 'bg-[#B88A3B]' : 'bg-[#163024]'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[10px] text-slate-500 mt-1.5 truncate max-w-full tabular-nums">
                    {pt.label.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Cash on Delivery Graph */}
      <section className="rounded-xl bg-white border border-slate-200 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#163024]">Cash on Delivery Graph</h3>
              <p className="text-xs text-slate-500">COD vs Online UPI order mix</p>
            </div>
            <span className="text-xs font-medium text-slate-600 tabular-nums">
              {codVsOnline.codCount + codVsOnline.onlineCount} active
            </span>
          </div>

          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#163024]">Cash on Delivery (COD)</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {codVsOnline.codCount} orders · {formatINR(codVsOnline.codTotal)}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-[#D97706] rounded-full"
                  style={{
                    width: `${
                      codVsOnline.codTotal > 0
                        ? Math.max(6, Math.round((codVsOnline.codTotal / codVsOnline.maxRev) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-600 tabular-nums">
                Owner-confirmed collected: {formatINR(codVsOnline.codCollected)} · Pending collection:{' '}
                {formatINR(Math.max(0, codVsOnline.codTotal - codVsOnline.codCollected))}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#163024]">Online UPI (Paytm / GPay / PhonePe)</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {codVsOnline.onlineCount} orders · {formatINR(codVsOnline.onlineTotal)}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-[#1B4332] rounded-full"
                  style={{
                    width: `${
                      codVsOnline.onlineTotal > 0
                        ? Math.max(6, Math.round((codVsOnline.onlineTotal / codVsOnline.maxRev) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-600 tabular-nums">
                Verified Paid: {formatINR(codVsOnline.onlineVerified)} · Awaiting verification:{' '}
                {formatINR(Math.max(0, codVsOnline.onlineTotal - codVsOnline.onlineVerified))}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Paid vs Unpaid Orders Graph */}
      <section className="rounded-xl bg-white border border-slate-200 p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[#163024]">Paid vs Unpaid Orders Graph</h3>
            <p className="text-xs text-slate-500">Verification &amp; settlement split</p>
          </div>
          <span className="text-xs font-semibold text-slate-700 tabular-nums">
            {paidVsUnpaid.rawTotal} Orders
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-32 h-32 shrink-0">
            <svg viewBox="0 0 132 132" className="w-32 h-32 -rotate-90">
              <circle
                cx="66"
                cy="66"
                r={radius}
                fill="none"
                stroke="#F1F5F9"
                strokeWidth="16"
              />
              {paidVsUnpaid.rawTotal > 0 &&
                paidVsUnpaid.segments.map((seg) => {
                  const segLength = (seg.count / paidVsUnpaid.totalCount) * circumference;
                  const offset = runningOffset;
                  runningOffset += segLength;
                  if (seg.count === 0) return null;
                  return (
                    <circle
                      key={seg.label}
                      cx="66"
                      cy="66"
                      r={radius}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="16"
                      strokeDasharray={`${segLength} ${circumference - segLength}`}
                      strokeDashoffset={-offset}
                    />
                  );
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-lg font-bold text-[#163024] tabular-nums">
                {paidVsUnpaid.segments[0].count}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500">Paid</span>
            </div>
          </div>

          <div className="flex-1 w-full space-y-2">
            {paidVsUnpaid.segments.map((seg) => (
              <div key={seg.label} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-slate-700 truncate">{seg.label}</span>
                </div>
                <span className="font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                  {seg.count} · {formatINR(seg.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
