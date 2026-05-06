<script lang="ts">
	import BottomSheet from './BottomSheet.svelte';
	import CategoryGlyph from './CategoryGlyph.svelte';
	import { formatCurrency, formatDate } from '$lib/utils/format';
	import type { Category, Transaction } from '$lib/types';

	type Props = {
		open: boolean;
		category: (Category & { id: string }) | null;
		transactions: (Transaction & { id: string })[];
		periodLabel: string;
		onClose: () => void;
	};

	let { open, category, transactions, periodLabel, onClose }: Props = $props();

	let total = $derived(transactions.reduce((s, t) => s + Math.abs(t.amount), 0));
</script>

<BottomSheet {open} {onClose} title={category?.name ?? 'Category'}>
	{#if category}
		<div class="body">
			<div class="head">
				<CategoryGlyph icon={category.icon} size={32} />
				<div class="head-text">
					<div class="head-name">{category.name}</div>
					<div class="head-period">{periodLabel}</div>
				</div>
				<div class="head-total tabular">{formatCurrency(total)}</div>
			</div>

			{#if transactions.length === 0}
				<p class="empty">No transactions in this period.</p>
			{:else}
				<ul class="rows">
					{#each transactions as tx, i (tx.id)}
						<li class="row" class:last={i === transactions.length - 1}>
							<span class="row-text">
								<span class="row-name">{tx.displayName}</span>
								<span class="row-meta">{formatDate(tx.postedDate)}</span>
							</span>
							<span class="row-amount tabular">
								{tx.amount < 0 ? '−' : '+'}{formatCurrency(Math.abs(tx.amount))}
							</span>
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
		display: flex;
		align-items: center;
		gap: 14px;
		padding-bottom: 12px;
		border-bottom: 0.5px solid var(--separator);
	}

	.head-text {
		flex: 1;
		min-width: 0;
	}

	.head-name {
		font-size: 18px;
		font-weight: 600;
		letter-spacing: -0.022em;
		color: var(--text-primary);
	}

	.head-period {
		font-size: 12px;
		color: var(--text-tertiary);
		margin-top: 2px;
	}

	.head-total {
		font-size: 22px;
		font-weight: 500;
		letter-spacing: -0.022em;
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
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		padding: 12px 0;
		border-bottom: 0.5px solid var(--separator);
	}

	.row.last {
		border-bottom: none;
	}

	.row-text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.row-name {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary);
	}

	.row-meta {
		font-size: 12px;
		color: var(--text-tertiary);
	}

	.row-amount {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary);
	}
</style>
