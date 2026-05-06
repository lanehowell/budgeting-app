<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import Button from '$lib/components/Button.svelte';
	import CategoryGlyph from '$lib/components/CategoryGlyph.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import SegmentedToggle from '$lib/components/SegmentedToggle.svelte';
	import { categories } from '$lib/data/categories';
	import { transactions, updateTransaction } from '$lib/data/transactions';
	import { addMerchantRule } from '$lib/data/merchantRules';
	import { simpleFinSync, accounts as accountsStore } from '$lib/data/accounts';
	import TransferSuggestionsSheet from '$lib/components/TransferSuggestionsSheet.svelte';
	import { formatCurrency, formatDateLong } from '$lib/utils/format';
	import type { Category, Transaction } from '$lib/types';

	let txList = $state<(Transaction & { id: string })[]>([]);
	let cats = $state<(Category & { id: string })[]>([]);
	let accountCount = $state(0);
	let syncing = $state(false);
	let syncMessage = $state<string | null>(null);

	$effect(() => transactions.subscribe((v) => (txList = v as typeof txList)));
	$effect(() => categories.subscribe((v) => (cats = v as typeof cats)));
	$effect(() => accountsStore.subscribe((v) => (accountCount = v.length)));

	async function refresh() {
		if (accountCount === 0) {
			syncMessage = 'Connect a bank in Profile first.';
			setTimeout(() => (syncMessage = null), 2500);
			return;
		}
		syncing = true;
		syncMessage = null;
		try {
			const result = await simpleFinSync();
			syncMessage = `Synced · ${result.imported} new, ${result.updated} updated`;
		} catch (e) {
			console.error(e);
			syncMessage = e instanceof Error ? e.message : 'Sync failed';
		} finally {
			syncing = false;
			setTimeout(() => (syncMessage = null), 3500);
		}
	}

	let categoryById = $derived(new Map(cats.map((c) => [c.id, c])));

	let view = $state<'uncategorized' | 'all'>('uncategorized');
	let search = $state('');
	let activeId = $state<string | null>(null);
	let editDisplayName = $state('');
	let editCategoryId = $state<string | null>(null);
	let saveAsRule = $state(false);
	let saving = $state(false);

	let activeTransaction = $derived(txList.find((t) => t.id === activeId) ?? null);

	let filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		const list = view === 'all' ? txList : txList.filter((t) => t.categoryId === null);
		const searched = q
			? list.filter((t) => t.displayName.toLowerCase().includes(q) || t.rawDescription.toLowerCase().includes(q))
			: list;
		return [...searched].sort(
			(a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()
		);
	});

	let groups = $derived.by(() => {
		const today = new Date();
		const todayKey = formatDayKey(today);
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayKey = formatDayKey(yesterday);

		const map = new Map<string, { label: string; items: typeof filtered }>();
		for (const t of filtered) {
			const d = new Date(t.postedDate);
			const key = formatDayKey(d);
			let label: string;
			if (key === todayKey) label = 'Today';
			else if (key === yesterdayKey) label = 'Yesterday';
			else label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
			if (!map.has(key)) map.set(key, { label, items: [] });
			map.get(key)!.items.push(t);
		}
		return [...map.entries()].map(([key, g]) => ({ key, ...g }));
	});

	function formatDayKey(d: Date): string {
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	let uncategorizedCount = $derived(txList.filter((t) => t.categoryId === null).length);

	let transferSuggestionsCount = $derived(
		txList.filter((t) => t.transferSuggested && t.categoryId === null).length
	);

	let transferCategoryId = $derived(cats.find((c) => c.isTransferCategory)?.id ?? null);
	let transferSheetOpen = $state(false);

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

<div class="page">
	<div class="pad">
		<PageHeader
			title="Activity"
			eyebrow={uncategorizedCount > 0 ? `${uncategorizedCount} uncategorized` : 'all caught up'}
		>
			{#snippet actions()}
				<button
					class="head-btn"
					class:spin={syncing}
					aria-label="Refresh"
					title="Refresh"
					onclick={refresh}
					disabled={syncing}
				>
					<Icon name="refresh-cw" size={18} />
				</button>
			{/snippet}
		</PageHeader>
		{#if syncMessage}
			<p class="sync-msg">{syncMessage}</p>
		{/if}
	</div>

	<div class="pad toggle-row">
		<SegmentedToggle
			value={view}
			onChange={(v) => (view = v)}
			options={[
				{ value: 'uncategorized', label: 'Uncategorized' },
				{ value: 'all', label: 'All' }
			]}
			ariaLabel="View"
		/>
	</div>

	{#if transferSuggestionsCount > 0}
		<div class="pad transfer-banner-wrap">
			<button class="transfer-banner" onclick={() => (transferSheetOpen = true)}>
				<span class="banner-text">
					{transferSuggestionsCount} possible
					transfer{transferSuggestionsCount === 1 ? '' : 's'} detected
				</span>
				<span class="banner-cta">Review →</span>
			</button>
		</div>
	{/if}

	<div class="pad search-row">
		<div class="search">
			<Icon name="search" size={14} />
			<input bind:value={search} type="text" placeholder="Search" aria-label="Search" />
		</div>
	</div>

	{#if filtered.length === 0}
		<div class="pad empty-wrap">
			<p class="empty">
				{view === 'uncategorized'
					? 'No uncategorized transactions. Switch to All to see history.'
					: 'No transactions yet.'}
			</p>
		</div>
	{:else}
		{#each groups as group (group.key)}
			{@const dayTotal = group.items.reduce((s, t) => s + t.amount, 0)}
			<section class="day-group">
				<div class="pad day-header">
					<span class="eyebrow">{group.label}</span>
					<span class="day-total tabular" data-positive={dayTotal > 0}>
						{dayTotal > 0 ? '+' : dayTotal < 0 ? '−' : ''}{formatCurrency(Math.abs(dayTotal))}
					</span>
				</div>
				<div class="pad">
					<ul class="rows">
						{#each group.items as tx, i (tx.id)}
							{@const cat = tx.categoryId ? categoryById.get(tx.categoryId) : null}
							<li class="row" class:last={i === group.items.length - 1}>
								<button class="row-tap" onclick={() => openSheet(tx)}>
									<CategoryGlyph
										icon={cat?.icon ?? 'help-circle'}
										size={28}
										color={cat ? 'var(--text-secondary)' : 'var(--text-tertiary)'}
									/>
									<span class="title-block">
										<span class="title-line">
											<span class="title-text" class:pending={tx.pending}>{tx.displayName}</span>
											{#if tx.pending}
												<span class="pending-badge">Pending</span>
											{/if}
										</span>
										<span class="title-meta">
											{cat ? cat.name : 'Uncategorized'}
										</span>
									</span>
									<span class="amount tabular" data-positive={tx.amount > 0}>
										{tx.amount > 0 ? '+' : '−'}{formatCurrency(Math.abs(tx.amount))}
									</span>
								</button>
							</li>
						{/each}
					</ul>
				</div>
			</section>
		{/each}
	{/if}
</div>

<TransferSuggestionsSheet
	open={transferSheetOpen}
	transactions={txList}
	{transferCategoryId}
	onClose={() => (transferSheetOpen = false)}
/>

<BottomSheet open={activeTransaction !== null} onClose={closeSheet} title="Categorize transaction">
	{#if activeTransaction}
		<div class="sheet-body">
			<p class="raw">{activeTransaction.rawDescription}</p>

			<label class="field">
				<span class="field-label">Display name</span>
				<input
					type="text"
					class="text-input"
					bind:value={editDisplayName}
					placeholder="Merchant name"
				/>
			</label>

			<div class="meta-grid">
				<div class="meta-item">
					<span class="eyebrow">Amount</span>
					<span class="meta-value tabular" data-positive={activeTransaction.amount > 0}>
						{activeTransaction.amount > 0 ? '+' : '−'}{formatCurrency(Math.abs(activeTransaction.amount))}
					</span>
				</div>
				<div class="meta-item">
					<span class="eyebrow">Date</span>
					<span class="meta-value-text">{formatDateLong(activeTransaction.postedDate)}</span>
				</div>
			</div>

			<div class="categories">
				<span class="eyebrow">Category</span>
				<div class="cat-grid">
					{#each cats as c (c.id)}
						<button
							class="cat-chip"
							class:selected={editCategoryId === c.id}
							onclick={() => (editCategoryId = c.id)}
						>
							<CategoryGlyph icon={c.icon} size={16} color="currentColor" />
							<span>{c.name}</span>
						</button>
					{/each}
				</div>
			</div>

			<label class="rule-row">
				<input type="checkbox" bind:checked={saveAsRule} />
				<span>Save as rule for future matching transactions</span>
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
	.page {
		padding-bottom: 32px;
	}

	.pad {
		padding: 0 var(--side-pad);
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
	.head-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.head-btn.spin :global(svg) {
		animation: spin 900ms linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.sync-msg {
		margin-top: -8px;
		margin-bottom: 12px;
		font-size: 12px;
		color: var(--text-secondary);
	}

	.toggle-row {
		padding-bottom: 12px;
	}

	.transfer-banner-wrap {
		padding-bottom: 12px;
	}

	.transfer-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 11px 14px;
		border-radius: var(--radius-card);
		border: 0.5px solid var(--separator);
		background: var(--fill-1);
		color: var(--text-primary);
		font-size: 13px;
		text-align: left;
		transition:
			transform 100ms var(--ease-standard),
			background-color 150ms var(--ease-standard);
	}

	.transfer-banner:active {
		transform: scale(0.99);
	}

	.banner-text {
		font-weight: 500;
	}

	.banner-cta {
		font-size: 12px;
		color: var(--text-secondary);
		font-weight: 500;
	}

	.search-row {
		padding-bottom: 18px;
	}

	.search {
		display: flex;
		align-items: center;
		gap: 8px;
		height: 36px;
		padding: 0 12px;
		background: var(--fill-1);
		border-radius: 8px;
		color: var(--text-tertiary);
	}

	.search input {
		border: none;
		background: transparent;
		outline: none;
		flex: 1;
		font-size: 14px;
		color: var(--text-primary);
		min-width: 0;
	}

	.search input::placeholder {
		color: var(--text-tertiary);
	}

	.empty {
		color: var(--text-tertiary);
		font-size: 14px;
		padding: 16px 0;
	}

	.empty-wrap {
		padding-top: 8px;
	}

	.day-group {
		margin-bottom: 24px;
	}

	.day-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding-bottom: 8px;
	}

	.eyebrow {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.067em;
		text-transform: uppercase;
		color: var(--text-tertiary);
	}

	.day-total {
		font-size: 12px;
		font-weight: 500;
		color: var(--text-tertiary);
	}

	.day-total[data-positive='true'] {
		color: var(--success);
	}

	.rows {
		display: flex;
		flex-direction: column;
	}

	.row {
		border-bottom: 0.5px solid var(--separator);
	}

	.row.last {
		border-bottom: none;
	}

	.row-tap {
		display: flex;
		align-items: center;
		gap: 14px;
		width: 100%;
		padding: 14px 0;
		text-align: left;
		transition: opacity 100ms var(--ease-standard);
	}

	.row-tap:active {
		opacity: 0.7;
	}

	.title-block {
		flex: 1 1 auto;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.title-line {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
	}

	.title-text {
		font-size: 15px;
		font-weight: 500;
		color: var(--text-primary);
		letter-spacing: -0.013em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.title-text.pending {
		font-style: italic;
		color: var(--text-secondary);
	}

	.pending-badge {
		font-size: 9px;
		font-weight: 600;
		padding: 1px 5px;
		border-radius: 3px;
		border: 0.5px solid var(--warning);
		color: var(--warning);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		flex-shrink: 0;
	}

	.title-meta {
		font-size: 12px;
		color: var(--text-tertiary);
	}

	.amount {
		font-size: 15px;
		font-weight: 500;
		color: var(--text-primary);
		white-space: nowrap;
	}

	.amount[data-positive='true'] {
		color: var(--success);
	}

	/* Bottom sheet */
	.sheet-body {
		display: flex;
		flex-direction: column;
		gap: 22px;
	}

	.raw {
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 11px;
		color: var(--text-tertiary);
		word-break: break-all;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.field-label {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.067em;
		text-transform: uppercase;
		color: var(--text-tertiary);
	}

	.text-input {
		width: 100%;
		padding: 11px 14px;
		background: var(--fill-1);
		border: 0.5px solid transparent;
		border-radius: var(--radius-input);
		font-size: 15px;
		min-height: 42px;
		transition: border-color 150ms var(--ease-standard);
	}

	.text-input:focus {
		outline: none;
		border-color: var(--text-secondary);
	}

	.meta-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	.meta-item {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.meta-value {
		font-size: 22px;
		font-weight: 500;
		letter-spacing: -0.022em;
		color: var(--text-primary);
	}

	.meta-value[data-positive='true'] {
		color: var(--success);
	}

	.meta-value-text {
		font-size: 14px;
		color: var(--text-primary);
	}

	.categories {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.cat-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.cat-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 12px;
		border-radius: 999px;
		background: var(--fill-1);
		color: var(--text-secondary);
		min-height: 32px;
		font-weight: 500;
		font-size: 13px;
		border: 0.5px solid transparent;
		transition:
			background-color 150ms var(--ease-standard),
			border-color 150ms var(--ease-standard),
			color 150ms var(--ease-standard);
	}

	.cat-chip.selected {
		background: var(--text-primary);
		border-color: var(--text-primary);
		color: var(--bg-primary);
	}

	.rule-row {
		display: flex;
		align-items: center;
		gap: 10px;
		cursor: pointer;
		font-size: 13px;
		color: var(--text-secondary);
	}

	.rule-row input[type='checkbox'] {
		width: 18px;
		height: 18px;
		accent-color: var(--text-primary);
	}

	.actions {
		display: flex;
		gap: 8px;
		margin-top: 4px;
	}
</style>
