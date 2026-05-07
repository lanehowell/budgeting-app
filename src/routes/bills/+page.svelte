<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Card from '$lib/components/Card.svelte';
	import AnimatedNumber from '$lib/components/AnimatedNumber.svelte';
	import ProgressRing from '$lib/components/ProgressRing.svelte';
	import CheckCircle from '$lib/components/CheckCircle.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import CategoryGlyph from '$lib/components/CategoryGlyph.svelte';
	import BillSheet from '$lib/components/BillSheet.svelte';
	import BillHistorySheet from '$lib/components/BillHistorySheet.svelte';
	import { categories } from '$lib/data/categories';
	import { bills } from '$lib/data/bills';
	import { billPayments, toggleBillPaid } from '$lib/data/billPayments';
	import { settings as settingsStore } from '$lib/data/settings';
	import { formatCurrency } from '$lib/utils/format';

	function fmtWhole(n: number): string {
		return `$${Math.round(n).toLocaleString('en-US')}`;
	}
	import { daysUntilDueDay, getCurrentPeriod } from '$lib/utils/payPeriod';
	import type { Bill, BillPayment, Category, Settings } from '$lib/types';

	let billsList = $state<(Bill & { id: string })[]>([]);
	let payments = $state<(BillPayment & { id: string })[]>([]);
	let cats = $state<(Category & { id: string })[]>([]);
	let liveSettings = $state<(Settings & { id: string }) | null>(null);

	$effect(() => bills.subscribe((v) => (billsList = v as typeof billsList)));
	$effect(() => billPayments.subscribe((v) => (payments = v as typeof payments)));
	$effect(() => categories.subscribe((v) => (cats = v as typeof cats)));
	$effect(() => settingsStore.subscribe((v) => (liveSettings = v)));

	let payPeriod = $derived(getCurrentPeriod(liveSettings));
	let period = $derived(payPeriod.key);

	function isPaid(billId: string): boolean {
		return payments.some((p) => p.billId === billId && p.periodKey === period);
	}

	function paidPaymentFor(billId: string): BillPayment | undefined {
		return payments.find((p) => p.billId === billId && p.periodKey === period);
	}

	async function togglePaid(bill: Bill & { id: string }) {
		await toggleBillPaid(bill.id, period, bill.amount);
	}

	let active = $derived(billsList.filter((b) => b.isActive));
	let categoryById = $derived(new Map(cats.map((c) => [c.id, c])));

	type BillRow = Bill & { id: string; days: number; status: 'overdue' | 'due' | 'paid' };

	let rows = $derived.by((): BillRow[] => {
		return active.map((b) => {
			const days = daysUntilDueDay(b.dueDay);
			const paid = isPaid(b.id);
			const status: BillRow['status'] = paid ? 'paid' : days < 0 ? 'overdue' : 'due';
			return { ...b, days, status };
		});
	});

	let overdue = $derived(
		rows.filter((r) => r.status === 'overdue').sort((a, b) => a.days - b.days)
	);
	let due = $derived(rows.filter((r) => r.status === 'due').sort((a, b) => a.days - b.days));
	let paid = $derived(rows.filter((r) => r.status === 'paid'));

	let totalAll = $derived(rows.reduce((s, b) => s + b.amount, 0));
	let totalPaid = $derived(paid.reduce((s, b) => s + b.amount, 0));
	let totalRemaining = $derived(totalAll - totalPaid);
	let paidRatio = $derived(totalAll > 0 ? totalPaid / totalAll : 0);

	let billSheetOpen = $state(false);
	let editingBill = $state<(Bill & { id: string }) | null>(null);
	let historyBill = $state<(Bill & { id: string }) | null>(null);

	function openAdd() {
		editingBill = null;
		billSheetOpen = true;
	}

	function openEdit(b: Bill & { id: string }) {
		editingBill = b;
		billSheetOpen = true;
	}

	function closeSheet() {
		billSheetOpen = false;
		editingBill = null;
	}

	function openHistory(b: Bill & { id: string }) {
		billSheetOpen = false;
		historyBill = b;
	}

	function closeHistory() {
		historyBill = null;
	}

	const today = new Date();

	function dueDateLabel(dueDay: number): string {
		// Bills are calendar-day recurring; show "Apr N"
		return `${today.toLocaleString('en-US', { month: 'short' })} ${dueDay}`;
	}

	function paidDateLabel(payment?: BillPayment): string | null {
		if (!payment) return null;
		const d = new Date(payment.paidDate);
		return d.toLocaleString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<div class="page">
	<div class="pad">
		<PageHeader title="Bills" subtitle={payPeriod.label.long}>
			{#snippet actions()}
				<button class="head-btn" aria-label="Add bill" onclick={openAdd}>
					<Icon name="plus" size={18} />
				</button>
			{/snippet}
		</PageHeader>
	</div>

	{#if rows.length > 0}
		<div class="pad hero-wrap">
			<Card padding={20}>
				<div class="hero-top">
					<div class="hero-text">
						<div class="hero-eyebrow">Remaining to pay</div>
						<div class="hero-num">
							<AnimatedNumber
								value={totalRemaining}
								class={totalRemaining > 0 && overdue.length > 0 ? 'hero-num-danger' : ''}
							/>
						</div>
					</div>
					<ProgressRing value={paidRatio} size={64} stroke={7} />
				</div>
				<div class="bar-track" aria-hidden="true">
					<div class="bar-fill" style="width: {paidRatio * 100}%"></div>
				</div>
				<div class="hero-meta">
					<span><b>{paid.length}</b> of {rows.length} paid</span>
					<span class="tabular">{fmtWhole(totalPaid)} of {fmtWhole(totalAll)}</span>
				</div>
			</Card>
		</div>
	{:else}
		<div class="pad empty-wrap">
			<Card padding={28}>
				<p class="empty-text">No bills yet. Tap + to add one.</p>
			</Card>
		</div>
	{/if}

	{#if overdue.length > 0}
		<section class="group">
			<div class="pad section-head">
				<span class="lab danger">Overdue · {overdue.length}</span>
				<span class="acc tabular">{formatCurrency(overdue.reduce((s, b) => s + b.amount, 0))}</span>
			</div>
			<div class="pad rows">
				{#each overdue as bill (bill.id)}
					{@const cat = categoryById.get(bill.categoryId)}
					<Card padding={12} interactive onclick={() => openEdit(bill)}>
						<div class="row">
							<CheckCircle checked={false} onClick={() => togglePaid(bill)} ariaLabel="Mark {bill.name} paid" />
							<div class="title-block">
								<div class="title-text danger">{bill.name}</div>
								<div class="title-meta">
									{#if cat}
										<span class="cat-dot" style:background={cat.color}></span>
									{/if}
									<span>{cat?.name ?? '—'}</span>
									<span>· Apr {bill.dueDay} · {Math.abs(bill.days)} day{Math.abs(bill.days) === 1 ? '' : 's'} overdue</span>
								</div>
							</div>
							<div class="amount tabular">{formatCurrency(bill.amount)}</div>
						</div>
					</Card>
				{/each}
			</div>
		</section>
	{/if}

	{#if due.length > 0}
		<section class="group">
			<div class="pad section-head">
				<span class="lab">Upcoming · {due.length}</span>
				<span class="acc tabular">{formatCurrency(due.reduce((s, b) => s + b.amount, 0))}</span>
			</div>
			<div class="pad rows">
				{#each due as bill (bill.id)}
					{@const cat = categoryById.get(bill.categoryId)}
					<Card padding={12} interactive onclick={() => openEdit(bill)}>
						<div class="row">
							<CheckCircle checked={false} onClick={() => togglePaid(bill)} ariaLabel="Mark {bill.name} paid" />
							<div class="title-block">
								<div class="title-text">{bill.name}</div>
								<div class="title-meta">
									{#if cat}
										<span class="cat-dot" style:background={cat.color}></span>
									{/if}
									<span>{cat?.name ?? '—'}</span>
									<span>· {dueDateLabel(bill.dueDay)}</span>
								</div>
							</div>
							<div class="amount tabular">{formatCurrency(bill.amount)}</div>
						</div>
					</Card>
				{/each}
			</div>
		</section>
	{/if}

	{#if paid.length > 0}
		<section class="group">
			<div class="pad section-head">
				<span class="lab">Paid · {paid.length}</span>
				<span class="acc tabular">{formatCurrency(totalPaid)}</span>
			</div>
			<div class="pad rows">
				{#each paid as bill (bill.id)}
					{@const cat = categoryById.get(bill.categoryId)}
					{@const pay = paidPaymentFor(bill.id)}
					<Card padding={12} interactive onclick={() => openEdit(bill)}>
						<div class="row paid-row">
							<CheckCircle checked={true} onClick={() => togglePaid(bill)} ariaLabel="Mark {bill.name} unpaid" />
							<div class="title-block">
								<div class="title-text strike">{bill.name}</div>
								<div class="title-meta">
									{#if cat}
										<span class="cat-dot" style:background={cat.color}></span>
									{/if}
									<span>{cat?.name ?? '—'}</span>
									<span>· paid {paidDateLabel(pay) ?? ''}</span>
								</div>
							</div>
							<div class="amount tabular muted">{formatCurrency(bill.amount)}</div>
						</div>
					</Card>
				{/each}
			</div>
		</section>
	{/if}
</div>

<BillSheet
	open={billSheetOpen}
	bill={editingBill}
	categories={cats}
	onClose={closeSheet}
	onShowHistory={openHistory}
/>

<BillHistorySheet open={historyBill !== null} bill={historyBill} payments={payments} onClose={closeHistory} />

<style>
	.page {
		padding-bottom: 32px;
	}

	.pad {
		padding: 0 var(--side-pad);
	}

	.hero-wrap {
		padding-bottom: 14px;
	}

	.hero-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 14px;
		gap: 16px;
	}

	.hero-text {
		min-width: 0;
	}

	.hero-eyebrow {
		font-size: 13px;
		color: var(--text-secondary);
		font-weight: 500;
		letter-spacing: -0.005em;
	}

	.hero-num {
		margin-top: 2px;
		font-size: 34px;
		font-weight: 700;
		letter-spacing: -0.025em;
		color: var(--text-primary);
		line-height: 1.1;
	}

	:global(.hero-num .num.hero-num-danger) {
		color: var(--danger);
	}

	.bar-track {
		height: 6px;
		border-radius: 3px;
		background: var(--track);
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		border-radius: 3px;
		background: var(--accent);
		transition: width 500ms cubic-bezier(0.3, 0.7, 0.4, 1);
	}

	.hero-meta {
		display: flex;
		justify-content: space-between;
		margin-top: 10px;
		font-size: 13px;
		color: var(--text-secondary);
	}

	.hero-meta b {
		color: var(--text-primary);
		font-weight: 600;
	}

	.empty-wrap {
		padding-bottom: 14px;
	}

	.empty-text {
		text-align: center;
		color: var(--text-secondary);
		font-size: 14px;
	}

	.group {
		margin-bottom: 24px;
	}

	.section-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding-top: 18px;
		padding-bottom: 10px;
	}

	.lab {
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.lab.danger {
		color: var(--danger);
	}

	.acc {
		font-size: 12px;
		color: var(--text-tertiary);
		font-weight: 500;
	}

	.rows {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.row.paid-row {
		opacity: 0.6;
	}

	.title-block {
		flex: 1 1 auto;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.title-text {
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: -0.013em;
		line-height: 1.2;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.title-text.danger {
		color: var(--danger);
	}

	.title-text.strike {
		text-decoration: line-through;
		text-decoration-color: var(--text-tertiary);
		color: var(--text-secondary);
	}

	.title-meta {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: var(--text-tertiary);
	}

	.cat-dot {
		display: inline-block;
		width: 6px;
		height: 6px;
		border-radius: 999px;
		flex-shrink: 0;
	}

	.amount {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: -0.013em;
	}

	.amount.muted {
		color: var(--text-secondary);
	}

	.head-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 999px;
		color: var(--text-secondary);
		background: var(--card);
		transition:
			transform 100ms var(--ease-standard),
			background-color 150ms var(--ease-standard);
	}
	.head-btn:active {
		transform: scale(0.94);
	}
</style>
