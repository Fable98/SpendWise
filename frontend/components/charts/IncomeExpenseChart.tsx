'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { MonthlyTrendItem } from '@/types';

interface Props {
  data: MonthlyTrendItem[];
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-800 border border-surface-600 rounded-xl p-3 shadow-xl text-sm">
      <p className="text-gray-400 mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: ${parseFloat(String(p.value)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
      ))}
    </div>
  );
}

export function IncomeExpenseChart({ data }: Props) {
  const formatted = data.map((d) => ({
    month: format(parseISO(d.month + '-01'), 'MMM yy'),
    Income: parseFloat(d.income),
    Expenses: parseFloat(d.expenses),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barSize={20}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d2d4a" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
          width={55}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
        <Legend
          wrapperStyle={{ paddingTop: '16px', fontSize: '13px', color: '#9ca3af' }}
        />
        <Bar dataKey="Income" fill="#34d399" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
