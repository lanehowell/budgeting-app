<script lang="ts">
	import BottomSheet from './BottomSheet.svelte';
	import { formatCurrency, formatDateLong } from '$lib/utils/format';
	import type { Bill, BillPayment } from '$lib/types';

	type Props = {
		open: boolean;
		bill: (Bill & { id: string }) | null;
		payments: (BillPayment & { id: string })[];
		onClose: () => void;
	};

	let { open, bill, payments, onClose }: Props = $props();

	let billPayments = $derived(
		bill ? payments.filter((p) => p.billId === bill.id) : []
	);

	let sorted = $derived(
		[...billPayments].sort((a, b) => (a.periodKey < b.periodKey ? 1 : -1))
	);

	let total = $derived(billPayments.reduce((s, p) => s + p.amount, 0));
</script>

<BottomSheet {open} {onClose} title="Payment history">
	{#if bill}
		<div class="body">
			<div class="head">
				<h2 class="sheet-title">{bill.name}</h2>
				<div class="sub">
					{billPayments.length} payment{billPayments.length === 1 ? '' : 's'} ·
					<span class="tabular">{formatCurrency(total)}</span>
				</div>
			</div>

			{#if sorted.length === 0}
				<p class="empty">No payments recorded yet.</p>
			{:else}
				<ul class="rows">
					{#each sorted as p, i (p.id)}
						<li class="row" class:last={i === sorted.length - 1}>
							<span class="row-text">
								<span class="row-period">{p.periodKey}</span>
								<span class="row-meta">
									{formatDateLong(p.paidDate)}{p.autoLinked ? ' · auto-linked' : ''}
								</span>
							</span>
							<span class="row-amount tabular">{formatCurrency(p.amount)}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</BottomSheet>

<style>
	.body {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.head {
		padding-bottom: 12px;
		border-bottom: 0.5px solid var(--separator);
	}

	.sheet-title {
		font-size: 22px;
		font-weight: 600;
		letter-spacing: -0.022em;
	}

	.sub {
		font-size: 12px;
		color: var(--text-tertiary);
		margin-top: 4px;
	}

	.empty {
		color: var(--text-tertiary);
		font-size: 14px;
		text-align: center;
		padding: 16px 0;
	}

	.rows {
		display: flex;
		flex-direction: column;
	}

	.row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 0;
		border-bottom: 0.5px solid var(--separator);
	}

	.row.last {
		border-bottom: none;
	}

	.row-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.row-period {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}

	.row-meta {
		font-size: 12px;
		color: var(--text-tertiary);
	}

	.row-amount {
		font-size: 14px;
		font-weight: 500;
	}
</style>
