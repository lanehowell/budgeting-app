<script lang="ts">
	import BottomSheet from './BottomSheet.svelte';
	import Button from './Button.svelte';
	import { formatCurrency, formatDate } from '$lib/utils/format';
	import { updateTransaction } from '$lib/data/transactions';
	import type { Transaction } from '$lib/types';

	type Props = {
		open: boolean;
		transactions: (Transaction & { id: string })[];
		transferCategoryId: string | null;
		onClose: () => void;
	};

	let { open, transactions, transferCategoryId, onClose }: Props = $props();

	type Pair = {
		key: string;
		a: Transaction & { id: string };
		b: Transaction & { id: string };
	};

	let pairs = $derived.by((): Pair[] => {
		const byId = new Map(transactions.map((t) => [t.id, t]));
		const seen = new Set<string>();
		const out: Pair[] = [];
		for (const tx of transactions) {
			if (!tx.transferSuggested || tx.categoryId !== null) continue;
			if (!tx.transferPairId) continue;
			if (seen.has(tx.id)) continue;
			const partner = byId.get(tx.transferPairId);
			if (!partner) continue;
			if (partner.categoryId !== null) continue;
			seen.add(tx.id);
			seen.add(partner.id);
			const outgoing = tx.amount < 0 ? tx : partner;
			const incoming = tx.amount < 0 ? partner : tx;
			out.push({ key: `${outgoing.id}|${incoming.id}`, a: outgoing, b: incoming });
		}
		return out;
	});

	let working = $state<string | null>(null);

	async function confirmPair(pair: Pair) {
		if (!transferCategoryId) return;
		working = pair.key;
		try {
			await Promise.all([
				updateTransaction(pair.a.id, {
					categoryId: transferCategoryId,
					isTransfer: true,
					transferSuggested: false
				}),
				updateTransaction(pair.b.id, {
					categoryId: transferCategoryId,
					isTransfer: true,
					transferSuggested: false
				})
			]);
		} catch (err) {
			console.error('Confirm transfer failed', err);
		} finally {
			working = null;
		}
	}

	async function dismissPair(pair: Pair) {
		working = pair.key;
		try {
			await Promise.all([
				updateTransaction(pair.a.id, { transferSuggested: false }),
				updateTransaction(pair.b.id, { transferSuggested: false })
			]);
		} catch (err) {
			console.error('Dismiss transfer failed', err);
		} finally {
			working = null;
		}
	}
</script>

<BottomSheet {open} {onClose} title="Suggested transfers">
	<div class="body">
		<h2 class="sheet-title">Suggested transfers</h2>
		<p class="lede">
			These look like transfers between your accounts. Confirming categorizes both sides as
			Transfer so they don't count as spending.
		</p>

		{#if pairs.length === 0}
			<p class="empty">Nothing to review.</p>
		{:else}
			<ul class="pairs">
				{#each pairs as pair (pair.key)}
					<li class="pair">
						<div class="pair-row">
							<span class="dir">From</span>
							<span class="meta">{pair.a.displayName} · {formatDate(pair.a.postedDate)}</span>
							<span class="amount tabular neg">−{formatCurrency(Math.abs(pair.a.amount))}</span>
						</div>
						<div class="pair-row">
							<span class="dir">To</span>
							<span class="meta">{pair.b.displayName} · {formatDate(pair.b.postedDate)}</span>
							<span class="amount tabular pos">+{formatCurrency(Math.abs(pair.b.amount))}</span>
						</div>
						<div class="pair-actions">
							<Button
								variant="secondary"
								onclick={() => dismissPair(pair)}
								disabled={working === pair.key}
							>
								Not a transfer
							</Button>
							<Button
								variant="primary"
								onclick={() => confirmPair(pair)}
								disabled={working === pair.key || !transferCategoryId}
							>
								{working === pair.key ? 'Saving…' : 'Confirm'}
							</Button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}

		<div class="actions">
			<Button variant="secondary" fullWidth onclick={onClose}>Done</Button>
		</div>
	</div>
</BottomSheet>

<style>
	.body {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.sheet-title {
		font-size: 22px;
		font-weight: 600;
		letter-spacing: -0.022em;
	}

	.lede {
		font-size: 13px;
		color: var(--text-secondary);
		line-height: 1.45;
	}

	.empty {
		font-size: 14px;
		color: var(--text-tertiary);
		text-align: center;
		padding: 16px 0;
	}

	.pairs {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.pair {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 14px;
		border: 0.5px solid var(--separator);
		border-radius: var(--radius-card);
	}

	.pair-row {
		display: grid;
		grid-template-columns: 44px 1fr auto;
		align-items: baseline;
		gap: 10px;
	}

	.dir {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.067em;
		text-transform: uppercase;
		color: var(--text-tertiary);
	}

	.meta {
		font-size: 13px;
		color: var(--text-primary);
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.amount {
		font-size: 14px;
		font-weight: 500;
	}

	.amount.neg {
		color: var(--text-primary);
	}

	.amount.pos {
		color: var(--success);
	}

	.pair-actions {
		display: flex;
		gap: 8px;
		margin-top: 4px;
	}

	.actions {
		display: flex;
	}
</style>
