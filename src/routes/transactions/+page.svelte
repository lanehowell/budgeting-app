<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import Button from '$lib/components/Button.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { categories } from '$lib/data/categories';
	import { transactions, updateTransaction } from '$lib/data/transactions';
	import { addMerchantRule } from '$lib/data/merchantRules';
	import { formatCurrency, formatDate, formatDateLong } from '$lib/utils/format';
	import type { Category, Transaction } from '$lib/types';

	let txList = $state<(Transaction & { id: string })[]>([]);
	let cats = $state<(Category & { id: string })[]>([]);

	$effect(() => transactions.subscribe((v) => (txList = v as typeof txList)));
	$effect(() => categories.subscribe((v) => (cats = v as typeof cats)));

	let categoryById = $derived(new Map(cats.map((c) => [c.id, c])));

	let showAll = $state(false);
	let activeId = $state<string | null>(null);
	let editDisplayName = $state('');
	let editCategoryId = $state<string | null>(null);
	let saveAsRule = $state(false);
	let saving = $state(false);

	let activeTransaction = $derived(txList.find((t) => t.id === activeId) ?? null);

	let visible = $derived(
		showAll
			? [...txList].sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime())
			: txList
					.filter((t) => t.categoryId === null)
					.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime())
	);

	let uncategorizedCount = $derived(txList.filter((t) => t.categoryId === null).length);

	function openSheet(tx: Transaction & { id: string }) {
		activeId = tx.id;
		editDisplayName = tx.displayName;
		editCategoryId = tx.categoryId;
		saveAsRule = false;
	}

	function closeSheet() {
		if (saving) return;
		activeId = null;
	}

	async function save() {
		if (!activeTransaction) return;
		saving = true;
		try {
			const cat = editCategoryId ? categoryById.get(editCategoryId) : undefined;
			const cleanName = editDisplayName.trim() || activeTransaction.displayName;
			await updateTransaction(activeTransaction.id, {
				displayName: cleanName,
				categoryId: editCategoryId,
				isTransfer: cat?.isTransferCategory ?? false
			});
			if (saveAsRule && editCategoryId) {
				await addMerchantRule({
					pattern: activeTransaction.rawDescription.split(/\s+/).slice(0, 2).join(' '),
					matchType: 'contains',
					categoryId: editCategoryId,
					displayName: cleanName,
					priority: 10,
					createdAt: new Date().toISOString()
				});
			}
			activeId = null;
		} catch (e) {
			console.error('Save failed', e);
		} finally {
			saving = false;
		}
	}
</script>

<PageHeader
	title="Transactions"
	summary={txList.length === 0
		? 'No transactions yet'
		: uncategorizedCount > 0
			? `${uncategorizedCount} uncategorized`
			: 'All caught up'}
>
	{#snippet actions()}
		<button class="icon-btn" aria-label="Refresh" title="Refresh">
			<Icon name="refresh-cw" size={20} />
		</button>
	{/snippet}
</PageHeader>

<div class="filter-row">
	<div class="segmented" role="tablist" aria-label="View">
		<button
			role="tab"
			aria-selected={!showAll}
			class="seg"
			class:active={!showAll}
			onclick={() => (showAll = false)}
		>
			Uncategorized
		</button>
		<button
			role="tab"
			aria-selected={showAll}
			class="seg"
			class:active={showAll}
			onclick={() => (showAll = true)}
		>
			All
		</button>
	</div>
</div>

<section aria-label="Transactions">
	{#if visible.length === 0}
		<Card padding>
			<p class="empty subheadline">
				{showAll
					? 'No transactions yet.'
					: 'No uncategorized transactions. Switch to All to see history.'}
			</p>
		</Card>
	{:else}
		<Card>
			<ul class="rows">
				{#each visible as tx (tx.id)}
					{@const cat = tx.categoryId ? categoryById.get(tx.categoryId) : null}
					<li class="row">
						<button class="tx-tap" onclick={() => openSheet(tx)}>
							<span class="left">
								<span class="dot" style="background:{cat?.color ?? 'var(--text-quaternary)'}"></span>
								<span class="text">
									<span class="name headline" class:pending={tx.pending}>
										{tx.displayName}
									</span>
									<span class="meta footnote">
										{formatDate(tx.postedDate)}
										{#if tx.pending}
											· <span class="pending-tag">Pending</span>
										{/if}
									</span>
								</span>
							</span>
							<span class="right">
								<span class="amount tabular headline">
									{tx.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(tx.amount))}
								</span>
								<span class="badge-wrap">
									{#if !cat}
										<Badge variant="uncategorized">Uncategorized</Badge>
									{:else}
										<span class="cat-label footnote">{cat.name}</span>
									{/if}
								</span>
							</span>
						</button>
					</li>
				{/each}
			</ul>
		</Card>
	{/if}
</section>

<BottomSheet open={activeTransaction !== null} onClose={closeSheet} title="Categorize transaction">
	{#if activeTransaction}
		<div class="sheet-body">
			<p class="raw caption">{activeTransaction.rawDescription}</p>

			<label class="field">
				<span class="field-label footnote">Display name</span>
				<input
					type="text"
					class="text-input"
					bind:value={editDisplayName}
					placeholder="Merchant name"
				/>
			</label>

			<div class="meta-grid">
				<div class="meta-item">
					<span class="footnote dim">Amount</span>
					<span class="title-2 tabular" class:neg={activeTransaction.amount < 0}>
						{activeTransaction.amount < 0 ? '-' : '+'}{formatCurrency(
							Math.abs(activeTransaction.amount)
						)}
					</span>
				</div>
				<div class="meta-item">
					<span class="footnote dim">Date</span>
					<span class="callout">{formatDateLong(activeTransaction.postedDate)}</span>
				</div>
			</div>

			<div class="categories">
				<span class="footnote dim section-label">Category</span>
				<div class="cat-grid">
					{#each cats as c (c.id)}
						<button
							class="cat-chip"
							class:selected={editCategoryId === c.id}
							onclick={() => (editCategoryId = c.id)}
						>
							<span class="dot" style="background:{c.color}"></span>
							<span class="footnote">{c.name}</span>
						</button>
					{/each}
				</div>
			</div>

			<label class="rule-row">
				<input type="checkbox" bind:checked={saveAsRule} />
				<span class="callout">Save as rule for future matching transactions</span>
			</label>

			<div class="actions">
				<Button variant="secondary" fullWidth onclick={closeSheet}>Cancel</Button>
				<Button variant="primary" fullWidth onclick={save} disabled={saving}>
					{saving ? 'Saving…' : 'Save'}
				</Button>
			</div>
		</div>
	{/if}
</BottomSheet>

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
	}

	.filter-row {
		margin-bottom: 16px;
	}

	.segmented {
		display: inline-flex;
		background: var(--bg-secondary);
		border-radius: 10px;
		padding: 3px;
		gap: 2px;
	}

	.seg {
		padding: 8px 16px;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		color: var(--text-secondary);
		min-height: 36px;
	}

	.seg.active {
		background: var(--bg-elevated);
		color: var(--text-primary);
		font-weight: 600;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
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

	.tx-tap {
		display: flex;
		width: 100%;
		padding: 14px 16px;
		gap: 12px;
		align-items: center;
		justify-content: space-between;
		text-align: left;
		transition: background-color 150ms var(--ease-standard);
	}

	.tx-tap:active {
		background: var(--bg-secondary);
	}

	.left {
		display: flex;
		gap: 12px;
		align-items: center;
		min-width: 0;
		flex: 1 1 auto;
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
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.name.pending {
		font-style: italic;
		color: var(--text-secondary);
	}

	.meta {
		color: var(--text-tertiary);
	}

	.pending-tag {
		font-style: italic;
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

	.cat-label {
		color: var(--text-tertiary);
	}

	.sheet-body {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.raw {
		color: var(--text-tertiary);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		word-break: break-all;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.field-label,
	.section-label,
	.dim {
		color: var(--text-tertiary);
	}

	.text-input {
		width: 100%;
		padding: 12px 14px;
		background: var(--bg-secondary);
		border: 1px solid transparent;
		border-radius: var(--radius-input);
		font-size: 17px;
		line-height: 22px;
		min-height: 44px;
		transition: border-color 150ms var(--ease-standard);
	}

	.text-input:focus {
		outline: none;
		border-color: var(--accent);
	}

	.meta-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	.meta-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.neg {
		color: var(--danger);
	}

	.categories {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.cat-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.cat-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		border-radius: 999px;
		background: var(--bg-secondary);
		color: var(--text-secondary);
		min-height: 36px;
		font-weight: 500;
		border: 1.5px solid transparent;
		transition:
			background-color 150ms var(--ease-standard),
			border-color 150ms var(--ease-standard);
	}

	.cat-chip.selected {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		border-color: var(--accent);
		color: var(--accent);
	}

	.rule-row {
		display: flex;
		align-items: center;
		gap: 10px;
		cursor: pointer;
	}

	.rule-row input[type='checkbox'] {
		width: 20px;
		height: 20px;
		accent-color: var(--accent);
	}

	.actions {
		display: flex;
		gap: 12px;
		margin-top: 4px;
	}
</style>
