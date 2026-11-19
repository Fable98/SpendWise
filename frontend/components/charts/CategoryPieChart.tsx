'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import type { CategoryBreakdownItem } from '@/types';

const COLORS = [
  '#6366f1', '#34d399', '#f59e0b', '#f87171', '#a78bfa',
  '#38bdf8', '#fb923c', '#4ade80', '#e879f9', '#67e8f9',
];

interface Props {
  data: CategoryBreakdownItem[];
}

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: CategoryBreakdownItem }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-800 border border-surface-600 rounded-xl p-3 shadow-xl text-sm">
      <p className="text-white font-medium">{payload[0].name}</p>
      <p className="text-gray-400">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

export function CategoryPieChart({ data }: Props) {
  const chartData = data.map((d) => ({
    name: d.categoryName,
    value: parseFloat(d.total),
    ...d,
  }));

  const total = chartData.reduce((s, d) => s + d.value, 0);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
        No data for this period
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="space-y-1.5 max-h-36 overflow-y-auto">
        {chartData.map((d, i) => {
          const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
          return (
            <div key={d.categoryId} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-gray-400 truncate">{d.categoryName}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-gray-500">{pct}%</span>
                <span className="text-white font-medium">{formatCurrency(d.value)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
