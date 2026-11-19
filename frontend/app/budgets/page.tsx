'use client';

import React, { useState } from 'react';
import { Plus, AlertTriangle, TrendingUp, Trash2, Pencil } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget } from '@/hooks/useBudgets';
import { useCategoriesByType } from '@/hooks/useCategories';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatPercent, getCurrentMonth, getMonthName } from '@/lib/utils';
import type { Budget } from '@/types';

const budgetSchema = z.object({
  categoryId: z.string().min(1, 'Please select a category'),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount'),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: getMonthName(i + 1),
}));

const YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - 1 + i;
  return { value: String(y), label: String(y) };
});

export default function BudgetsPage() {
  const { month, year } = getCurrentMonth();
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [selectedYear, setSelectedYear] = useState(year);
  const [createOpen, setCreateOpen] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [deleteBudget, setDeleteBudget] = useState<Budget | null>(null);

  const { data: budgets, isLoading } = useBudgets(selectedYear, selectedMonth);
  const { data: expenseCategories } = useCategoriesByType('EXPENSE');
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const deleteMutation = useDeleteBudget();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { month: selectedMonth, year: selectedYear },
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    formState: { errors: editErrors },
  } = useForm<{ amount: string }>({
    resolver: zodResolver(z.object({ amount: z.string().regex(/^\d+(\.\d{1,2})?$/) })),
    values: editBudget ? { amount: editBudget.amount } : undefined,
  });

  const handleCreate = async (data: BudgetFormData) => {
    try {
      await createMutation.mutateAsync(data);
      setCreateOpen(false);
      reset();
      toast('Budget created', 'success');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast(msg || 'Failed to create budget', 'error');
    }
  };

  const handleUpdate = async (data: { amount: string }) => {
    if (!editBudget) return;
    try {
      await updateMutation.mutateAsync({ id: editBudget.id, amount: data.amount });
      setEditBudget(null);
      toast('Budget updated', 'success');
    } catch {
      toast('Failed to update budget', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteBudget) return;
    try {
      await deleteMutation.mutateAsync(deleteBudget.id);
      setDeleteBudget(null);
      toast('Budget deleted', 'success');
    } catch {
      toast('Failed to delete budget', 'error');
    }
  };

  const categoryOptions = expenseCategories?.map((c) => ({ value: c.id, label: c.name })) ?? [];

  const totalBudgeted = budgets?.reduce((s, b) => s + parseFloat(b.amount), 0) ?? 0;
  const totalSpent = budgets?.reduce((s, b) => s + parseFloat(b.spent ?? '0'), 0) ?? 0;
  const overBudgetCount = budgets?.filter((b) => b.isOverBudget).length ?? 0;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Budgets</h1>
            <p className="text-gray-400 mt-1 text-sm">
              Monthly spending limits and progress
            </p>
          </div>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
            New Budget
          </Button>
        </div>

        {/* Month/Year picker */}
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <Select
                options={MONTHS}
                value={String(selectedMonth)}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-40"
              />
              <Select
                options={YEARS}
                value={String(selectedYear)}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-28"
              />
              {overBudgetCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-red-400 ml-auto">
                  <AlertTriangle className="w-4 h-4" />
                  {overBudgetCount} over budget
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Summary row */}
        {!isLoading && budgets && budgets.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Budgeted', value: formatCurrency(totalBudgeted), color: 'text-brand-400' },
              { label: 'Total Spent', value: formatCurrency(totalSpent), color: totalSpent > totalBudgeted ? 'text-red-400' : 'text-emerald-400' },
              { label: 'Remaining', value: formatCurrency(totalBudgeted - totalSpent), color: totalSpent > totalBudgeted ? 'text-red-400' : 'text-gray-200' },
            ].map((s) => (
              <Card key={s.label}>
                <CardBody className="p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</p>
                  <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {/* Budget cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-44" />)}
          </div>
        ) : !budgets || budgets.length === 0 ? (
          <Card>
            <CardBody className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-surface-700 flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-gray-500" />
              </div>
              <p className="text-gray-400 font-medium">No budgets for this month</p>
              <p className="text-gray-600 text-sm mt-1">Create budgets to track spending limits</p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgets.map((budget) => {
              const pct = budget.utilizationPct ?? 0;
              const isOver = budget.isOverBudget;
              const isWarn = budget.isWarning && !isOver;
              const barColor = isOver ? 'bg-red-500' : isWarn ? 'bg-amber-400' : 'bg-brand-500';

              return (
                <Card key={budget.id} className={isOver ? 'border-red-500/30' : isWarn ? 'border-amber-500/20' : ''}>
                  <CardBody className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-white">{budget.category?.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {getMonthName(budget.month)} {budget.year}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {isOver && <AlertTriangle className="w-4 h-4 text-red-400" />}
                        {isWarn && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                        <button
                          onClick={() => setEditBudget(budget)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-brand-400 hover:bg-brand-500/10 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteBudget(budget)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{formatCurrency(budget.spent ?? '0')} spent</span>
                        <span
                          className={
                            isOver ? 'text-red-400 font-medium' : isWarn ? 'text-amber-400 font-medium' : ''
                          }
                        >
                          {formatPercent(pct)}
                        </span>
                      </div>
                      <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className={isOver ? 'text-red-400' : 'text-gray-500'}>
                          {isOver ? 'Over by ' : 'Remaining: '}
                          <span className="font-medium">
                            {isOver
                              ? formatCurrency(Math.abs(parseFloat(budget.remaining ?? '0')))
                              : formatCurrency(budget.remaining ?? '0')}
                          </span>
                        </span>
                        <span className="text-gray-500">
                          Limit: <span className="font-medium text-gray-300">{formatCurrency(budget.amount)}</span>
                        </span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create budget modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Budget">
        <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
          <Select
            label="Category"
            options={categoryOptions}
            placeholder="Select expense category"
            error={errors.categoryId?.message}
            {...register('categoryId')}
          />
          <Input
            label="Budget Amount"
            placeholder="0.00"
            leftElement={<span className="text-sm">$</span>}
            error={errors.amount?.message}
            {...register('amount')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Month"
              options={MONTHS}
              error={errors.month?.message}
              {...register('month')}
            />
            <Select
              label="Year"
              options={YEARS}
              error={errors.year?.message}
              {...register('year')}
            />
          </div>
          <Button type="submit" className="w-full" size="lg" isLoading={createMutation.isPending}>
            Create Budget
          </Button>
        </form>
      </Modal>

      {/* Edit budget modal */}
      <Modal isOpen={!!editBudget} onClose={() => setEditBudget(null)} title="Edit Budget" size="sm">
        <form onSubmit={handleEditSubmit(handleUpdate)} className="space-y-4">
          <Input
            label="Budget Amount"
            leftElement={<span className="text-sm">$</span>}
            error={editErrors.amount?.message}
            {...registerEdit('amount')}
          />
          <Button type="submit" className="w-full" isLoading={updateMutation.isPending}>
            Update Budget
          </Button>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!deleteBudget} onClose={() => setDeleteBudget(null)} title="Delete Budget" size="sm">
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            Delete the{' '}
            <span className="text-white font-medium">{deleteBudget?.category?.name}</span> budget
            for{' '}
            <span className="text-white font-medium">
              {deleteBudget && `${getMonthName(deleteBudget.month)} ${deleteBudget.year}`}
            </span>
            ? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteBudget(null)}>
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
