<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { categories } from '$lib/data/categories';
	import { bills } from '$lib/data/bills';
	import { billPayments, toggleBillPaid } from '$lib/data/billPayments';
	import { formatCurrency, dueDayLabel, daysUntilDueDay } from '$lib/utils/format';
	import { currentPeriodKey } from '$lib/utils/payPeriod';
	import type { Bill, BillPayment, Category } from '$lib/types';

	let billsList = $state<(Bill & { id: string })[]>([]);
	let payments = $state<(BillPayment & { id: string })[]>([]);
	let cats = $state<(Category & { id: string })[]>([]);

	$effect(() => bills.subscribe((v) => (billsList = v as typeof billsList)));
	$effect(() => billPayments.subscribe((v) => (payments = v as typeof payments)));
	$effect(() => categories.subscribe((v) => (cats = v as typeof cats)));

	const period = $derived(currentPeriodKey());
	let categoryById = $derived(new Map(cats.map((c) => [c.id, c])));

	function isPaid(billId: string): boolean {
		return payments.some((p) => p.billId === billId && p.periodKey === period);
	}

	async function togglePaid(bill: Bill & { id: string }) {
		await toggleBillPaid(bill.id, period, bill.amount);
	}

	function statusFor(bill: Bill & { id: string }): 'paid' | 'overdue' | 'due-soon' | 'upcoming' {
		if (isPaid(bill.id)) return 'paid';
		const days = daysUntilDueDay(bill.dueDay);
		if (days < 0) return 'overdue';
		if (days <= 7) return 'due-soon';
		return 'upcoming';
	}

	let active = $derived(billsList.filter((b) => b.isActive));

	let sortedBills = $derived(
		[...active].sort((a, b) => daysUntilDueDay(a.dueDay) - daysUntilDueDay(b.dueDay))
	);

	let unpaidTotal = $derived(
		sortedBills.filter((b) => !isPaid(b.id)).reduce((sum, b) => sum + b.amount, 0)
	);
	let unpaidCount = $derived(sortedBills.filter((b) => !isPaid(b.id)).length);
</script>

<PageHeader
	title="Bills"
	summary={billsList.length === 0
		? 'No bills yet — add one to get started'
		: unpaidCount > 0
			? `${formatCurrency(unpaidTotal)} left to pay this period`
			: 'All bills paid for this period'}
>
	{#snippet actions()}
		<button class="icon-btn" aria-label="Add bill">
			<Icon name="plus" size={22} />
		</button>
	{/snippet}
</PageHeader>

{#if sortedBills.length === 0}
	<Card padding>
		<p class="empty subheadline">No bills yet.</p>
	</Card>
{:else}
	<section aria-label="Bills">
		<Card>
			<ul class="rows">
				{#each sortedBills as bill (bill.id)}
					{@const cat = categoryById.get(bill.categoryId)}
					{@const status = statusFor(bill)}
					{@const days = daysUntilDueDay(bill.dueDay)}
					<li class="row" class:paid={status === 'paid'}>
						<button class="bill-tap" onclick={() => togglePaid(bill)} aria-label="Toggle paid">
							<span class="left">
								<span class="dot" style="background:{cat?.color ?? '#8E8E93'}"></span>
								<span class="text">
									<span class="name headline">{bill.name}</span>
									<span class="due footnote">
										Due {dueDayLabel(bill.dueDay)}
										{#if status === 'paid'}
											· Paid
										{:else if status === 'overdue'}
											· {Math.abs(days)} day{Math.abs(days) === 1 ? '' : 's'} overdue
										{:else if status === 'due-soon'}
											· in {days} day{days === 1 ? '' : 's'}
										{:else}
											· in {days} days
										{/if}
									</span>
								</span>
							</span>
							<span class="right">
								<span class="amount tabular headline" class:strike={status === 'paid'}
									>{formatCurrency(bill.amount)}</span
								>
								<span class="badge-wrap">
									{#if status === 'paid'}
										<Badge variant="paid">Paid</Badge>
									{:else if status === 'overdue'}
										<Badge variant="overdue">Overdue</Badge>
									{:else if status === 'due-soon'}
										<Badge variant="due-soon">Due Soon</Badge>
									{/if}
								</span>
							</span>
						</button>
					</li>
				{/each}
			</ul>
		</Card>
	</section>
{/if}

<style>
	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 999px;
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		transition:
			transform 100ms var(--ease-standard),
			background-color 150ms var(--ease-standard);
	}
	.icon-btn:active {
		transform: scale(0.96);
	}

	.empty {
		color: var(--text-tertiary);
		text-align: center;
		padding: 16px 0;
	}

	.rows {
		display: flex;
		flex-direction: column;
	}

	.row + .row {
		border-top: 1px solid var(--separator);
	}

	.bill-tap {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 16px;
		gap: 12px;
		text-align: left;
		transition: background-color 150ms var(--ease-standard);
	}

	.bill-tap:active {
		background: var(--bg-secondary);
	}

	.left {
		display: flex;
		align-items: center;
		gap: 12px;
		flex: 1 1 auto;
		min-width: 0;
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 999px;
		flex-shrink: 0;
	}

	.text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.name {
		color: var(--text-primary);
	}

	.due {
		color: var(--text-tertiary);
	}

	.right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
		flex-shrink: 0;
	}

	.amount {
		color: var(--text-primary);
	}

	.amount.strike {
		color: var(--text-tertiary);
		text-decoration: line-through;
	}

	.badge-wrap {
		min-height: 18px;
	}
</style>
