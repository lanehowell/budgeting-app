<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SectionLabel from '$lib/components/SectionLabel.svelte';
	import CheckCircle from '$lib/components/CheckCircle.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import BillSheet from '$lib/components/BillSheet.svelte';
	import BillHistorySheet from '$lib/components/BillHistorySheet.svelte';
	import { categories } from '$lib/data/categories';
	import { bills } from '$lib/data/bills';
	import { billPayments, toggleBillPaid } from '$lib/data/billPayments';
	import { settings as settingsStore } from '$lib/data/settings';
	import { formatCurrency } from '$lib/utils/format';
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

	type BillRow = Bill & { id: string; days: number; status: 'overdue' | 'due' | 'paid' };

	let rows = $derived.by((): BillRow[] => {
		return active.map((b) => {
			const days = daysUntilDueDay(b.dueDay);
			const paid = isPaid(b.id);
			const status: BillRow['status'] = paid ? 'paid' : days < 0 ? 'overdue' : 'due';
			return { ...b, days, status };
		});
	});

	let overdue = $derived(rows.filter((r) => r.status === 'overdue').sort((a, b) => a.days - b.days));
	let due = $derived(rows.filter((r) => r.status === 'due').sort((a, b) => a.days - b.days));
	let paid = $derived(rows.filter((r) => r.status === 'paid'));

	let totalDue = $derived([...overdue, ...due].reduce((s, b) => s + b.amount, 0));
	let totalPaid = $derived(paid.reduce((s, b) => s + b.amount, 0));
	let totalAll = $derived(totalDue + totalPaid);

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
	const monthLabel = today
		.toLocaleString('en-US', { month: 'short' })
		.toUpperCase();

	function dueLabelMonth(_dueDay: number): string {
		return monthLabel;
	}

	function dueLabelDay(dueDay: number): string {
		return String(dueDay);
	}

	function paidLabelParts(payment?: BillPayment): { month: string; day: string } {
		if (!payment) return { month: monthLabel, day: '' };
		const d = new Date(payment.paidDate);
		return {
			month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
			day: String(d.getDate())
		};
	}
</script>

<div class="page">
	<div class="pad">
		<PageHeader title="Bills" eyebrow={`Pay period · ${payPeriod.label.long}`}>
			{#snippet actions()}
				<button class="head-btn" aria-label="Add bill" onclick={openAdd}>
					<Icon name="plus" size={18} />
				</button>
			{/snippet}
		</PageHeader>
	</div>

	<div class="pad summary">
		<div class="row baseline">
			<span class="big tabular" data-danger={overdue.length > 0}>
				{formatCurrency(totalDue)}
			</span>
			<span class="big-sub muted">
				{overdue.length > 0
					? `${overdue.length} overdue`
					: totalDue > 0
						? 'due this period'
						: 'all paid'}
			</span>
		</div>

		<div class="progress-block">
			<div class="progress-meta tabular">
				<span>{paid.length} of {rows.length} paid</span>
				<span>{formatCurrency(totalPaid)} / {formatCurrency(totalAll)}</span>
			</div>
			<div class="progress-track">
				<div
					class="progress-fill"
					style="width: {totalAll > 0 ? (totalPaid / totalAll) * 100 : 0}%"
				></div>
			</div>
		</div>
	</div>

	{#if rows.length === 0}
		<div class="pad">
			<p class="empty">No bills yet — tap + to add one.</p>
		</div>
	{/if}

	{#if overdue.length > 0}
		<section class="group">
			<div class="pad">
				<SectionLabel
					label="Overdue"
					tone="danger"
					count={overdue.length}
					accessory={formatCurrency(overdue.reduce((s, b) => s + b.amount, 0))}
				/>
			</div>
			<div class="pad">
				<ul class="rows">
					{#each overdue as bill, i (bill.id)}
						{@const cat = cats.find((c) => c.id === bill.categoryId)}
						<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
						<li
							class="row-line interactive"
							class:last={i === overdue.length - 1}
							role="button"
							tabindex="0"
							onclick={() => openEdit(bill)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									openEdit(bill);
								}
							}}
						>
							<span class="date-stamp">
								<span class="ds-month">{dueLabelMonth(bill.dueDay)}</span>
								<span class="ds-day tabular">{dueLabelDay(bill.dueDay)}</span>
							</span>
							<CheckCircle checked={false} onClick={() => togglePaid(bill)} />
							<span class="title-block">
								<span class="title-text">{bill.name}</span>
								<span class="title-meta">
									{cat?.name ?? '—'} · {Math.abs(bill.days)} day{Math.abs(bill.days) === 1 ? '' : 's'} overdue
								</span>
							</span>
							<span class="amount tabular">{formatCurrency(bill.amount)}</span>
						</li>
					{/each}
				</ul>
			</div>
		</section>
	{/if}

	{#if due.length > 0}
		<section class="group">
			<div class="pad">
				<SectionLabel
					label="Upcoming"
					count={due.length}
					accessory={formatCurrency(due.reduce((s, b) => s + b.amount, 0))}
				/>
			</div>
			<div class="pad">
				<ul class="rows">
					{#each due as bill, i (bill.id)}
						{@const cat = cats.find((c) => c.id === bill.categoryId)}
						<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
						<li
							class="row-line interactive"
							class:last={i === due.length - 1}
							role="button"
							tabindex="0"
							onclick={() => openEdit(bill)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									openEdit(bill);
								}
							}}
						>
							<span class="date-stamp">
								<span class="ds-month">{dueLabelMonth(bill.dueDay)}</span>
								<span class="ds-day tabular">{dueLabelDay(bill.dueDay)}</span>
							</span>
							<CheckCircle checked={false} onClick={() => togglePaid(bill)} />
							<span class="title-block">
								<span class="title-text">{bill.name}</span>
								<span class="title-meta">
									{cat?.name ?? '—'} · in {bill.days} day{bill.days === 1 ? '' : 's'}
								</span>
							</span>
							<span class="amount tabular">{formatCurrency(bill.amount)}</span>
						</li>
					{/each}
				</ul>
			</div>
		</section>
	{/if}

	{#if paid.length > 0}
		<section class="group">
			<div class="pad">
				<SectionLabel
					label="Paid"
					count={paid.length}
					accessory={formatCurrency(totalPaid)}
				/>
			</div>
			<div class="pad">
				<ul class="rows">
					{#each paid as bill, i (bill.id)}
						{@const cat = cats.find((c) => c.id === bill.categoryId)}
						{@const pay = paidPaymentFor(bill.id)}
						{@const labels = paidLabelParts(pay)}
						<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
						<li
							class="row-line dim interactive"
							class:last={i === paid.length - 1}
							role="button"
							tabindex="0"
							onclick={() => openEdit(bill)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									openEdit(bill);
								}
							}}
						>
							<span class="date-stamp">
								<span class="ds-month">{labels.month}</span>
								<span class="ds-day tabular">{labels.day}</span>
							</span>
							<CheckCircle checked={true} onClick={() => togglePaid(bill)} />
							<span class="title-block">
								<span class="title-text strike">{bill.name}</span>
								<span class="title-meta">{cat?.name ?? '—'} · paid</span>
							</span>
							<span class="amount tabular">{formatCurrency(bill.amount)}</span>
						</li>
					{/each}
				</ul>
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

	.summary {
		padding-bottom: 28px;
	}

	.row.baseline {
		display: flex;
		align-items: baseline;
		gap: 12px;
	}

	.big {
		font-family: var(--font-num);
		font-variant-numeric: tabular-nums;
		font-size: 44px;
		font-weight: 500;
		letter-spacing: -0.036em;
		color: var(--text-primary);
		line-height: 1;
	}

	.big[data-danger='true'] {
		color: var(--danger);
	}

	.big-sub {
		font-size: 13px;
		font-weight: 500;
	}

	.muted {
		color: var(--text-secondary);
	}

	.progress-block {
		margin-top: 18px;
	}

	.progress-meta {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 8px;
		font-size: 12px;
		color: var(--text-tertiary);
	}

	.progress-track {
		height: 3px;
		background: var(--fill-1);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--text-primary);
		transition: width 350ms cubic-bezier(0.3, 0.7, 0.4, 1);
	}

	.empty {
		color: var(--text-tertiary);
		font-size: 14px;
		padding: 16px 0;
	}

	.group {
		margin-bottom: 28px;
	}

	.rows {
		display: flex;
		flex-direction: column;
	}

	.row-line {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 14px 0;
		border-bottom: 0.5px solid var(--separator);
	}

	.row-line.last {
		border-bottom: none;
	}

	.row-line.dim {
		opacity: 0.5;
	}

	.row-line.interactive {
		cursor: pointer;
		transition: opacity 100ms var(--ease-standard);
	}

	.row-line.interactive:active {
		opacity: 0.6;
	}

	.head-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 999px;
		color: var(--text-secondary);
		background: var(--fill-1);
		transition:
			transform 100ms var(--ease-standard),
			background-color 150ms var(--ease-standard);
	}
	.head-btn:active {
		transform: scale(0.94);
	}

	.date-stamp {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 38px;
		flex-shrink: 0;
	}

	.ds-month {
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.067em;
		text-transform: uppercase;
		color: var(--text-tertiary);
		line-height: 1;
		margin-bottom: 3px;
	}

	.ds-day {
		font-size: 18px;
		font-weight: 500;
		color: var(--text-primary);
		line-height: 1;
		letter-spacing: -0.022em;
	}

	.title-block {
		flex: 1 1 auto;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.title-text {
		font-size: 15px;
		font-weight: 500;
		color: var(--text-primary);
		letter-spacing: -0.013em;
		line-height: 1.2;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.title-text.strike {
		text-decoration: line-through;
		text-decoration-color: var(--text-tertiary);
	}

	.title-meta {
		font-size: 12px;
		color: var(--text-tertiary);
	}

	.amount {
		font-size: 16px;
		font-weight: 500;
		color: var(--text-primary);
		letter-spacing: -0.019em;
	}
</style>
