'use client';

import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

interface Transaction {
  amount: number;
  type: 'income' | 'expense';
  category: string;
}

interface FinancialChartsProps {
  transactions: Transaction[];
}

const COLORS = ['#A8FF00', '#3B82F6', '#EF4444', '#F97316', '#8B5CF6', '#EC4899'];

export default function FinancialCharts({ transactions }: FinancialChartsProps) {
  const expenseByCategory = useMemo(() => {
    const categoryMap: { [key: string]: number } = {};
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        if (categoryMap[t.category]) {
          categoryMap[t.category] += t.amount;
        } else {
          categoryMap[t.category] = t.amount;
        }
      });
    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const incomeVsExpenseData = useMemo(() => {
    const summary = transactions.reduce(
      (acc, curr) => {
        if (curr.type === 'income') {
          acc.Pemasukan += curr.amount;
        } else {
          acc.Pengeluaran += curr.amount;
        }
        return acc;
      },
      { Pemasukan: 0, Pengeluaran: 0 }
    );
    return [{ name: 'Total', ...summary }];
  }, [transactions]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
      <div className="bg-[#121212] p-6 rounded-lg border border-gray-800">
        <h3 className="font-bold text-lg mb-4">Komposisi Pengeluaran</h3>
        {expenseByCategory.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={expenseByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                // PERBAIKAN DI SINI:
                label={({ name, percent }) => {
                  if (percent === undefined) return name; // Jika persen tidak ada, tampilkan nama saja
                  return `${name} ${(percent * 100).toFixed(0)}%`; // Jika ada, tampilkan dengan persen
                }}
              >
                {expenseByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-gray-500">Belum ada data pengeluaran.</p>
          </div>
        )}
      </div>

      <div className="bg-[#121212] p-6 rounded-lg border border-gray-800">
        <h3 className="font-bold text-lg mb-4">Pemasukan vs Pengeluaran</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={incomeVsExpenseData}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}/>
            <Legend />
            <Bar dataKey="Pemasukan" fill="#22C55E" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Pengeluaran" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
