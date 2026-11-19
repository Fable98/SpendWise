'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, User, LogOut, Tag } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useCategories, useCreateCategory, useDeleteCategory } from '@/hooks/useCategories';
import { useToast } from '@/components/ui/Toast';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['INCOME', 'EXPENSE']),
});
type CategoryFormData = z.infer<typeof categorySchema>;

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { data: categories } = useCategories();
  const createCategoryMutation = useCreateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const { toast } = useToast();
  const [catModalOpen, setCatModalOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { type: 'EXPENSE' },
  });

  const handleCreateCategory = async (data: CategoryFormData) => {
    try {
      await createCategoryMutation.mutateAsync(data);
      setCatModalOpen(false);
      reset();
      toast('Category created', 'success');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast(msg || 'Failed to create category', 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategoryMutation.mutateAsync(id);
      toast('Category deleted', 'success');
    } catch {
      toast('Cannot delete — category may be in use', 'error');
    }
  };

  const userCategories = categories?.filter((c) => c.userId !== null) ?? [];
  const systemCategories = categories?.filter((c) => c.userId === null) ?? [];

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-1 text-sm">Account and preferences</p>
        </div>

        {/* Profile */}
        <Card>
          <CardHeader className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center">
              <User className="w-4 h-4 text-brand-400" />
            </div>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-brand-600 flex items-center justify-center text-xl font-bold text-white flex-shrink-0">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-white text-lg">{user?.name}</p>
                <p className="text-gray-400 text-sm">{user?.email}</p>
                <p className="text-gray-600 text-xs mt-1">
                  Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : '—'}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center">
                <Tag className="w-4 h-4 text-brand-400" />
              </div>
              <div>
                <CardTitle>Categories</CardTitle>
              </div>
            </div>
            <Button
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setCatModalOpen(true)}
            >
              Add Category
            </Button>
          </CardHeader>
          <CardBody className="space-y-4">
            {/* Custom categories */}
            {userCategories.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Your Categories
                </p>
                <div className="space-y-1">
                  {userCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-700 group transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={cat.type === 'INCOME' ? 'income' : 'expense'}>
                          {cat.type}
                        </Badge>
                        <span className="text-sm text-white">{cat.name}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System categories */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Default Categories
              </p>
              <div className="grid grid-cols-2 gap-1">
                {systemCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 py-2 px-3 rounded-lg"
                  >
                    <Badge variant={cat.type === 'INCOME' ? 'income' : 'expense'}>
                      {cat.type}
                    </Badge>
                    <span className="text-sm text-gray-400">{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Sign out */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Sign Out</p>
                <p className="text-sm text-gray-500 mt-0.5">End your current session</p>
              </div>
              <Button
                variant="danger"
                leftIcon={<LogOut className="w-4 h-4" />}
                onClick={() => logout.mutate()}
                isLoading={logout.isPending}
              >
                Sign Out
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Add category modal */}
      <Modal isOpen={catModalOpen} onClose={() => setCatModalOpen(false)} title="Add Category" size="sm">
        <form onSubmit={handleSubmit(handleCreateCategory)} className="space-y-4">
          <Input
            label="Category name"
            placeholder="e.g. Gym & Fitness"
            error={errors.name?.message}
            {...register('name')}
          />
          <Select
            label="Type"
            options={[
              { value: 'EXPENSE', label: 'Expense' },
              { value: 'INCOME', label: 'Income' },
            ]}
            error={errors.type?.message}
            {...register('type')}
          />
          <Button type="submit" className="w-full" isLoading={createCategoryMutation.isPending}>
            Create Category
          </Button>
        </form>
      </Modal>
    </AppLayout>
  );
}
