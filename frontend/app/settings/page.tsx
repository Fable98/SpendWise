'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, User, LogOut, Tag, Smartphone, Copy, Check, Play, RefreshCw, Key } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useCategories, useCreateCategory, useDeleteCategory } from '@/hooks/useCategories';
import { useIntegrationTokens, useCreateIntegrationToken, useRevokeIntegrationToken } from '@/hooks/useIntegrations';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['INCOME', 'EXPENSE']),
});
type CategoryFormData = z.infer<typeof categorySchema>;

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { data: categories } = useCategories();
  const { data: tokens } = useIntegrationTokens();
  const createCategoryMutation = useCreateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const createTokenMutation = useCreateIntegrationToken();
  const revokeTokenMutation = useRevokeIntegrationToken();
  const { toast } = useToast();

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [deviceTokenName, setDeviceTokenName] = useState('');
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Webhook Simulator state
  const [simText, setSimText] = useState('Paid ₹450.00 to Starbucks Coffee. UPI Ref: 432589012345');
  const [simPkg, setSimPkg] = useState('com.google.android.apps.nbu.paisa.user');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

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

  const handleCreateToken = async () => {
    if (!deviceTokenName.trim()) {
      toast('Please enter a device or service name', 'error');
      return;
    }
    try {
      const res = await createTokenMutation.mutateAsync({ name: deviceTokenName.trim() });
      setNewlyCreatedToken(res.rawToken || null);
      setDeviceTokenName('');
      toast('Integration token generated!', 'success');
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Failed to generate token', 'error');
    }
  };

  const handleRevokeToken = async (id: string) => {
    try {
      await revokeTokenMutation.mutateAsync(id);
      toast('Integration token revoked', 'success');
    } catch {
      toast('Failed to revoke token', 'error');
    }
  };

  const copyToClipboard = (text: string, type: 'key' | 'url') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
    toast('Copied to clipboard', 'success');
  };

  const handleRunSimulator = async () => {
    if (!tokens || tokens.length === 0) {
      toast('Please generate an integration token first', 'error');
      return;
    }
    setSimLoading(true);
    setSimResult(null);
    try {
      // In simulator, if newly created token is present in state, use that, else call webhook via server
      const tokenHeader = newlyCreatedToken || tokens[0].tokenPrefix;
      const res = await api.post(
        '/integrations/upi/webhook',
        {
          packageName: simPkg,
          body: simText,
          timestamp: Date.now(),
        },
        {
          headers: newlyCreatedToken ? { 'X-SpendWise-Token': newlyCreatedToken } : undefined,
        }
      );
      setSimResult(res.data);
      toast(res.data?.message || 'Simulator executed successfully', 'success');
    } catch (err: any) {
      setSimResult(err?.response?.data || { error: 'Request failed' });
      toast(err?.response?.data?.message || 'Simulator request failed', 'error');
    } finally {
      setSimLoading(false);
    }
  };

  const webhookEndpointUrl = typeof window !== 'undefined'
    ? `${window.location.origin.replace(':3000', ':3001')}/api/v1/integrations/upi/webhook`
    : 'http://localhost:3001/api/v1/integrations/upi/webhook';

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

        {/* Google Pay & Live UPI Sync */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <CardTitle>Google Pay & Live UPI Sync</CardTitle>
                <p className="text-gray-400 text-xs mt-0.5">
                  Stream live transactions automatically from GPay notifications & bank SMS
                </p>
              </div>
            </div>
            <Button
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                setNewlyCreatedToken(null);
                setTokenModalOpen(true);
              }}
            >
              New Sync Token
            </Button>
          </CardHeader>
          <CardBody className="space-y-6">
            {/* Active tokens */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Active Integration Devices & Tokens
              </p>
              {tokens && tokens.length > 0 ? (
                <div className="space-y-2">
                  {tokens.map((tok) => (
                    <div
                      key={tok.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-surface-700/60 border border-surface-600"
                    >
                      <div className="flex items-center gap-3">
                        <Key className="w-4 h-4 text-emerald-400" />
                        <div>
                          <p className="text-sm font-medium text-white">{tok.name}</p>
                          <p className="text-xs text-gray-400 font-mono">
                            Prefix: {tok.tokenPrefix}••••••••
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">
                          {tok.lastUsedAt
                            ? `Last sync ${new Date(tok.lastUsedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : 'Never synced'}
                        </span>
                        <button
                          onClick={() => handleRevokeToken(tok.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Revoke token"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-surface-700/30 border border-dashed border-surface-600 text-center">
                  <p className="text-sm text-gray-400">No integration tokens created yet.</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Click &quot;New Sync Token&quot; to connect Tasker, MacroDroid, or the Android companion app.
                  </p>
                </div>
              )}
            </div>

            {/* Webhook endpoint URL box */}
            <div className="p-4 rounded-xl bg-surface-900 border border-surface-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Webhook Endpoint URL
                </span>
                <button
                  onClick={() => copyToClipboard(webhookEndpointUrl, 'url')}
                  className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-medium cursor-pointer"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedUrl ? 'Copied' : 'Copy URL'}
                </button>
              </div>
              <p className="text-xs font-mono text-gray-300 break-all bg-surface-800 p-2 rounded border border-surface-700">
                {webhookEndpointUrl}
              </p>
              <p className="text-[11px] text-gray-500">
                Send a <code>POST</code> request with header <code>X-SpendWise-Token: &lt;your_token&gt;</code> and JSON body <code>&#123; &quot;body&quot;: &quot;...&quot; &#125;</code>.
              </p>
            </div>

            {/* Interactive Ingestion Simulator */}
            <div className="p-4 rounded-xl bg-surface-700/30 border border-surface-700 space-y-3">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-brand-400" />
                <span className="text-sm font-semibold text-white">Live Ingestion Simulator</span>
              </div>
              <p className="text-xs text-gray-400">
                Test parsing, auto-categorization, and deduplication with sample GPay text.
              </p>
              <div className="space-y-2">
                <Input
                  label="Sample Notification / SMS Body"
                  value={simText}
                  onChange={(e) => setSimText(e.target.value)}
                  placeholder="e.g. Paid ₹450 to Starbucks Coffee. UPI Ref: 432589012345"
                />
                <Button
                  size="sm"
                  leftIcon={simLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  onClick={handleRunSimulator}
                  isLoading={simLoading}
                  className="mt-2"
                >
                  Simulate Webhook
                </Button>
              </div>

              {simResult && (
                <div className="mt-3 p-3 rounded-lg bg-surface-800 border border-surface-600 text-xs font-mono text-gray-300 overflow-x-auto">
                  <span className="text-gray-400 block mb-1 font-sans font-semibold">Simulator Response:</span>
                  <pre>{JSON.stringify(simResult, null, 2)}</pre>
                </div>
              )}
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

      {/* Generate token modal */}
      <Modal
        isOpen={tokenModalOpen}
        onClose={() => {
          setTokenModalOpen(false);
          setNewlyCreatedToken(null);
        }}
        title="Connect Google Pay / Mobile Device"
        size="md"
      >
        {!newlyCreatedToken ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Generate a secure integration token to authorize Tasker, MacroDroid, or the Android companion service to push live notifications to your SpendWise account.
            </p>
            <Input
              label="Device or Application Name"
              placeholder="e.g. My Pixel Phone (Tasker)"
              value={deviceTokenName}
              onChange={(e) => setDeviceTokenName(e.target.value)}
            />
            <Button
              className="w-full mt-2"
              onClick={handleCreateToken}
              isLoading={createTokenMutation.isPending}
            >
              Generate Secret Token
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              Token generated! Copy it now. For security reasons, it will not be displayed again.
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-400 uppercase">
                Your Secret Integration Token
              </label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={newlyCreatedToken}
                  className="w-full rounded-lg border border-surface-600 bg-surface-900 text-white font-mono text-xs px-3 py-2.5"
                />
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  onClick={() => copyToClipboard(newlyCreatedToken, 'key')}
                >
                  {copiedKey ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface-700/40 text-xs text-gray-300 space-y-2">
              <p className="font-semibold text-white">How to use in Tasker / MacroDroid:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>Trigger: Notification from <code>com.google.android.apps.nbu.paisa.user</code> or Bank SMS</li>
                <li>Action: HTTP Request <code>POST</code> to <code>{webhookEndpointUrl}</code></li>
                <li>Header: <code>X-SpendWise-Token: {newlyCreatedToken.slice(0, 16)}...</code></li>
                <li>Body (JSON): <code>&#123; &quot;body&quot;: &quot;%antext&quot; &#125;</code></li>
              </ul>
            </div>

            <Button
              className="w-full"
              variant="secondary"
              onClick={() => {
                setTokenModalOpen(false);
                setNewlyCreatedToken(null);
              }}
            >
              Done
            </Button>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
