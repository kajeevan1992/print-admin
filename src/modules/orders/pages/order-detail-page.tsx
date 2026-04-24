'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Select } from '@/components/forms/select';
import { Input } from '@/components/forms/input';
import { ordersService } from '@/services/orders.service';
import type { Order, OrderStatus, PaymentStatus, ProductionStage } from '@/modules/orders/types';

const tabs = ['Summary', 'Items', 'Production', 'Notes', 'Activity'];

export function OrderDetailPage({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ordersService.getOrder(id);
      setOrder(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Card>Loading order...</Card>;
  if (error || !order) return <Card className="text-red-200">{error ?? 'Order not found'}</Card>;

  const updateStatus = async (status: OrderStatus) => setOrder((await ordersService.updateOrderStatus(order.id, status)).data);
  const updatePayment = async (paymentStatus: PaymentStatus) => setOrder((await ordersService.updatePaymentStatus(order.id, paymentStatus)).data);
  const updateProduction = async (productionStage: ProductionStage) => setOrder((await ordersService.updateProductionStage(order.id, productionStage)).data);
  const addNote = async () => {
    if (!note.trim()) return;
    setOrder((await ordersService.addNote(order.id, note)).data);
    setNote('');
  };

  return (
    <div>
      <PageHeader
        title={`Order ${order.orderNumber}`}
        subtitle={`${order.customerName} · ${order.organizationName} · ${order.storeName}`}
        actions={<><Button>Download Proof</Button><PrimaryButton>Open Production Job</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-4 xl:grid-cols-4">
        <MetricCard label="Total" value={`${order.currency} ${order.total.toLocaleString()}`} />
        <MetricCard label="Status" value={order.status.replace(/-/g, ' ')} />
        <MetricCard label="Production" value={order.productionStage.replace(/-/g, ' ')} />
        <MetricCard label="Due Date" value={order.dueDate} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <h3 className="mb-4 text-sm font-semibold">Order Controls</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <Select options={['draft', 'pending', 'approved', 'in-production', 'shipped', 'completed', 'cancelled']} value={order.status} onChange={(e) => void updateStatus(e.target.value as OrderStatus)} />
            <Select options={['unpaid', 'authorized', 'paid', 'refunded']} value={order.paymentStatus} onChange={(e) => void updatePayment(e.target.value as PaymentStatus)} />
            <Select options={['prepress', 'proofing', 'queued', 'printing', 'finishing', 'dispatch']} value={order.productionStage} onChange={(e) => void updateProduction(e.target.value as ProductionStage)} />
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold">Shipment</h3>
          <p className="text-sm text-textMuted">{order.shippingMethod}</p>
          <p className="mt-2 text-sm">Tracking: <span className="text-textMuted">{order.trackingNumber || 'Not assigned yet'}</span></p>
        </Card>
      </div>

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'Summary' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="mb-3 text-sm font-semibold">Customer</h3>
            <div className="space-y-2 text-sm">
              <p>{order.customerName}</p>
              <p className="text-textMuted">{order.customerEmail}</p>
              <p className="text-textMuted">{order.organizationName}</p>
            </div>
          </Card>
          <Card>
            <h3 className="mb-3 text-sm font-semibold">Addresses</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Shipping</p>
                <p className="text-textMuted">{order.shippingAddress}</p>
              </div>
              <div>
                <p className="font-medium">Billing</p>
                <p className="text-textMuted">{order.billingAddress}</p>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === 'Items' ? (
        <Card>
          <h3 className="mb-4 text-sm font-semibold">Line Items</h3>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-panelMuted p-3">
                <img src={item.thumbnail} alt={item.productName} className="h-14 w-14 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-xs text-textMuted">{item.sku}</p>
                </div>
                <div className="text-sm text-textMuted">Qty {item.quantity}</div>
                <div className="text-sm">{order.currency} {item.totalPrice.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {activeTab === 'Production' ? (
        <Card>
          <h3 className="mb-4 text-sm font-semibold">Production Workflow</h3>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {['prepress', 'proofing', 'queued', 'printing', 'finishing', 'dispatch'].map((stage) => (
              <div key={stage} className={`rounded-xl border px-3 py-4 text-center text-sm capitalize ${order.productionStage === stage ? 'border-accent bg-panelMuted' : 'border-border bg-panelMuted/40'}`}>
                {stage}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {activeTab === 'Notes' ? (
        <Card>
          <h3 className="mb-4 text-sm font-semibold">Internal Notes</h3>
          <div className="mb-4 flex gap-2">
            <Input placeholder="Add an internal note..." value={note} onChange={(e) => setNote(e.target.value)} />
            <PrimaryButton onClick={() => void addNote()}>Add Note</PrimaryButton>
          </div>
          <div className="space-y-2">
            {order.notes.map((item, index) => (
              <div key={`${item}-${index}`} className="rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm text-textMuted">{item}</div>
            ))}
          </div>
        </Card>
      ) : null}

      {activeTab === 'Activity' ? (
        <Card>
          <h3 className="mb-4 text-sm font-semibold">Activity Timeline</h3>
          <div className="space-y-3">
            {order.activity.map((event) => (
              <div key={event.id} className="rounded-xl border border-border bg-panelMuted p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{event.label}</p>
                  <p className="text-xs text-textMuted">{event.timestamp}</p>
                </div>
                <p className="mt-1 text-sm text-textMuted">{event.description}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-textMuted">{label}</p>
      <p className="mt-2 text-xl font-semibold capitalize">{value}</p>
    </Card>
  );
}
