'use client';

import React, { useState } from 'react';
import { Plus, Search, Filter, Trash2, Pencil, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { TransactionForm } from '@/components/forms/TransactionForm';
import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Transaction, TransactionFilters } from '@/types';

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>({ page: 1, limit: 20 });
  const [createOpen, setCreateOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useTransactions(filters);
  const { data: categories } = useCategories();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();
  const { toast } = useToast();

  const transactions = data?.transactions ?? [];
  const meta = data?.meta;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setFilters((f) => ({ ...f, search: e.target.value || undefined, page: 1 }));
  };

  const handleCreate = async (formData: {
    amount: string;
    type: string;
    categoryId: string;
    description?: string;
    transactionDate: string;
  }) => {
    try {
      await createMutation.mutateAsync({
        ...formData,
        transactionDate: new Date(formData.transactionDate).toISOString(),
      });
      setCreateOpen(false);
      toast('Transaction added successfully', 'success');
    } catch {
      toast('Failed to add transaction', 'error');
    }
  };

  const handleUpdate = async (formData: {
    amount: string;
    type: string;
    categoryId: string;
    description?: string;
    transactionDate: string;
  }) => {
    if (!editTx) return;
    try {
      await updateMutation.mutateAsync({
        id: editTx.id,
        ...formData,
        type: formData.type as 'INCOME' | 'EXPENSE',
        transactionDate: new Date(formData.transactionDate).toISOString(),
      });
      setEditTx(null);
      toast('Transaction updated', 'success');
    } catch {
      toast('Failed to update transaction', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTx) return;
    try {
      await deleteMutation.mutateAsync(deleteTx.id);
      setDeleteTx(null);
      toast('Transaction deleted', 'success');
    } catch {
      toast('Failed to delete transaction', 'error');
    }
  };

  const categoryOptions = [
    { value: '', label: 'All categories' },
    ...(categories?.map((c) => ({ value: c.id, label: c.name })) ?? []),
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Transactions</h1>
            <p className="text-gray-400 mt-1 text-sm">
              {meta ? `${meta.total} transaction${meta.total !== 1 ? 's' : ''}` : ''}
            </p>
          </div>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
            Add Transaction
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardBody className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Search transactions..."
                  value={search}
                  onChange={handleSearch}
                  leftElement={<Search className="w-4 h-4" />}
                />
              </div>
              <Select
                options={[
                  { value: '', label: 'All types' },
                  { value: 'INCOME', label: 'Income' },
                  { value: 'EXPENSE', label: 'Expenses' },
                ]}
                value={filters.type ?? ''}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    type: e.target.value as 'INCOME' | 'EXPENSE' | undefined || undefined,
                    page: 1,
                  }))
                }
                className="sm:w-36"
              />
              <Select
                options={categoryOptions}
                value={filters.categoryId ?? ''}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, categoryId: e.target.value || undefined, page: 1 }))
                }
                className="sm:w-48"
              />
              <Select
                options={[
                  { value: 'transactionDate:desc', label: 'Newest first' },
                  { value: 'transactionDate:asc', label: 'Oldest first' },
                  { value: 'amount:desc', label: 'Amount ↓' },
                  { value: 'amount:asc', label: 'Amount ↑' },
                ]}
                value={`${filters.sortBy ?? 'transactionDate'}:${filters.sortOrder ?? 'desc'}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split(':');
                  setFilters((f) => ({ ...f, sortBy, sortOrder: sortOrder as 'asc' | 'desc', page: 1 }));
                }}
                className="sm:w-40"
              />
            </div>
          </CardBody>
        </Card>

        {/* Table */}
        <Card>
          {isLoading ? (
            <CardBody className="space-y-4">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-2 w-1/4" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-6 rounded" />
                </div>
              ))}
            </CardBody>
          ) : transactions.length === 0 ? (
            <CardBody className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-surface-700 flex items-center justify-center mx-auto mb-3">
                <Filter className="w-6 h-6 text-gray-500" />
              </div>
              <p className="text-gray-400 font-medium">No transactions found</p>
              <p className="text-gray-600 text-sm mt-1">
                {Object.keys(filters).length > 2
                  ? 'Try adjusting your filters'
                  : 'Add your first transaction to get started'}
              </p>
            </CardBody>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-700">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                        Transaction
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                        Category
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                        Date
                      </th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                        Amount
                      </th>
                      <th className="text-right px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700">
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="hover:bg-surface-700/50 transition-colors group"
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                tx.type === 'INCOME'
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'bg-red-500/15 text-red-400'
                              }`}
                            >
                              {tx.type === 'INCOME' ? (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowDownRight className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <span className="text-sm text-white truncate max-w-xs">
                              {tx.description || tx.category?.name || '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          <Badge variant={tx.type === 'INCOME' ? 'income' : 'expense'}>
                            {tx.category?.name ?? '—'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell text-sm text-gray-400">
                          {formatDate(tx.transactionDate)}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <span
                            className={`text-sm font-semibold ${
                              tx.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {tx.type === 'INCOME' ? '+' : '-'}
                            {formatCurrency(tx.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditTx(tx)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-brand-400 hover:bg-brand-500/10 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTx(tx)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-surface-700">
                  <p className="text-xs text-gray-500">
                    Page {meta.page} of {meta.totalPages} ({meta.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!meta.hasPrev}
                      onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!meta.hasNext}
                      onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Create modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Add Transaction">
        <TransactionForm
          onSubmit={handleCreate}
          isLoading={createMutation.isPending}
          submitLabel="Add Transaction"
        />
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editTx} onClose={() => setEditTx(null)} title="Edit Transaction">
        {editTx && (
          <TransactionForm
            defaultValues={editTx}
            onSubmit={handleUpdate}
            isLoading={updateMutation.isPending}
            submitLabel="Update Transaction"
          />
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!deleteTx} onClose={() => setDeleteTx(null)} title="Delete Transaction" size="sm">
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            Are you sure you want to delete this transaction?{' '}
            {deleteTx && (
              <span className="text-white font-medium">
                {deleteTx.description || deleteTx.category?.name} (
                {formatCurrency(deleteTx.amount)})
              </span>
            )}{' '}
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteTx(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleDelete}
              isLoading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
