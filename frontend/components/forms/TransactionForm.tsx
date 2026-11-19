'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCategories } from '@/hooks/useCategories';
import { formatDateInput } from '@/lib/utils';
import type { Transaction } from '@/types';

const schema = z.object({
  amount: z
    .string()
    .min(1, 'Amount is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount (e.g. 50.00)'),
  type: z.enum(['INCOME', 'EXPENSE']),
  categoryId: z.string().min(1, 'Please select a category'),
  description: z.string().max(500).optional(),
  transactionDate: z.string().min(1, 'Date is required'),
});

type FormData = z.infer<typeof schema>;

interface TransactionFormProps {
  defaultValues?: Partial<Transaction>;
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function TransactionForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'Save',
}: TransactionFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: defaultValues?.type || 'EXPENSE',
      amount: defaultValues?.amount || '',
      categoryId: defaultValues?.categoryId || '',
      description: defaultValues?.description || '',
      transactionDate: defaultValues?.transactionDate
        ? formatDateInput(defaultValues.transactionDate)
        : formatDateInput(new Date()),
    },
  });

  const selectedType = watch('type');
  const { data: categories } = useCategories();

  const categoryOptions =
    categories
      ?.filter((c) => c.type === selectedType)
      .map((c) => ({ value: c.id, label: c.name })) ?? [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Type toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Type</label>
        <div className="grid grid-cols-2 gap-2">
          {(['EXPENSE', 'INCOME'] as const).map((t) => (
            <label
              key={t}
              className={`flex items-center justify-center py-2.5 rounded-lg border cursor-pointer transition-all text-sm font-medium ${
                selectedType === t
                  ? t === 'INCOME'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
                    : 'bg-red-500/15 border-red-500/50 text-red-400'
                  : 'border-surface-600 text-gray-500 hover:border-surface-500'
              }`}
            >
              <input type="radio" value={t} {...register('type')} className="sr-only" />
              {t === 'INCOME' ? '↑ Income' : '↓ Expense'}
            </label>
          ))}
        </div>
        {errors.type && <p className="text-xs text-red-400 mt-1">{errors.type.message}</p>}
      </div>

      <Input
        label="Amount"
        placeholder="0.00"
        error={errors.amount?.message}
        leftElement={<span className="text-sm">$</span>}
        {...register('amount')}
      />

      <Select
        label="Category"
        options={categoryOptions}
        placeholder="Select a category"
        error={errors.categoryId?.message}
        {...register('categoryId')}
      />

      <Input
        label="Description"
        placeholder="What was this for? (optional)"
        error={errors.description?.message}
        {...register('description')}
      />

      <Input
        label="Date"
        type="date"
        error={errors.transactionDate?.message}
        {...register('transactionDate')}
      />

      <Button type="submit" isLoading={isLoading} className="w-full" size="lg">
        {submitLabel}
      </Button>
    </form>
  );
}
