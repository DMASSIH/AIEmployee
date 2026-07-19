'use client';

import { Check, CreditCard, Download, Sparkles } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@aie/ui';
import { PageHeader } from '@/components/shell/page-header';
import { invoices, paymentMethod, plans } from '@/lib/mock/billing';
import { kpis } from '@/lib/mock/analytics';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';

const invoiceTone = { paid: 'success', open: 'warning', void: 'neutral' } as const;

export default function BillingPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Billing" description="Manage your plan, payment method, and invoices." />

      {/* Current plan + usage */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Current plan</CardTitle>
            <Badge tone="accent">Growth</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-semibold tracking-tight">
                  $199<span className="text-sm font-normal text-text-3"> / month</span>
                </p>
                <p className="mt-1 text-[13px] text-text-3">Renews August 1, 2026</p>
              </div>
              <Button variant="outline">Change plan</Button>
            </div>
            <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
              <Meter label="Tasks" used={kpis.tasksMtd} limit={kpis.tasksLimit} format={formatNumber} />
              <Meter label="Employees" used={kpis.activeEmployees} limit={3} format={formatNumber} />
              <Meter
                label="Knowledge"
                used={kpis.knowledgeBytes}
                limit={kpis.knowledgeLimit}
                format={(v) => `${Math.round(v / 1024 / 1024)} MB`}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment method</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-md border border-border p-3">
              <span className="flex size-9 items-center justify-center rounded-md bg-surface-2 text-text-2">
                <CreditCard className="size-4.5" />
              </span>
              <div>
                <p className="text-sm font-medium">{paymentMethod.brand} •••• {paymentMethod.last4}</p>
                <p className="text-[13px] text-text-3">Expires {paymentMethod.exp}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => toast.info('Update payment', 'Stripe checkout arrives in a later milestone.')}>
              Update payment method
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Plans */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Plans</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const current = plan.id === 'growth';
            return (
              <Card key={plan.id} className={plan.highlight ? 'ring-2 ring-accent/20' : undefined}>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{plan.name}</h3>
                    {plan.highlight && <Badge tone="accent">Popular</Badge>}
                  </div>
                  <p className="text-2xl font-semibold tracking-tight">
                    ${plan.monthly}
                    <span className="text-sm font-normal text-text-3"> / mo</span>
                  </p>
                  <ul className="flex flex-col gap-2">
                    {plan.features.slice(0, 4).map((f) => (
                      <li key={f} className="flex items-center gap-2 text-[13px] text-text-2">
                        <Check className="size-3.5 shrink-0 text-success" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button variant={current ? 'outline' : plan.highlight ? 'primary' : 'secondary'} size="sm" disabled={current}>
                    {current ? 'Current plan' : plan.monthly > 199 ? (
                      <>
                        <Sparkles className="size-4" /> Upgrade
                      </>
                    ) : (
                      'Switch'
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Invoices */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Invoices</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Receipt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.number}</TableCell>
                <TableCell className="text-text-2">{formatDate(inv.date)}</TableCell>
                <TableCell className="tabular-nums">{formatCurrency(inv.amount)}</TableCell>
                <TableCell>
                  <Badge tone={invoiceTone[inv.status]} className="capitalize">
                    {inv.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon-sm" aria-label="Download">
                    <Download className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Meter({
  label,
  used,
  limit,
  format,
}: {
  label: string;
  used: number;
  limit: number;
  format: (v: number) => string;
}) {
  const pct = Math.min(100, (used / limit) * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="text-text-2">{label}</span>
        <span className="tabular-nums text-text-3">{format(used)} / {format(limit)}</span>
      </div>
      <Progress value={pct} tone={pct > 90 ? 'danger' : pct > 75 ? 'warning' : 'accent'} />
    </div>
  );
}
