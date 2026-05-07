<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import CategoryGlyph from '$lib/components/CategoryGlyph.svelte';
	import MerchantLogo from '$lib/components/MerchantLogo.svelte';
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
			syncMessage = 'Connect a bank in Settings first.';
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

	// Mode: 'card' = focused tap-card; 'list' = browse list. Defaults are
	// chosen at first render based on whether work exists.
	let mode = $state<'card' | 'list' | null>(null);
	let uncategorizedCount = $derived(txList.filter((t) => t.categoryId === null).length);
	let categorizedCount = $derived(txList.length - uncategorizedCount);

	$effect(() => {
		// Lazily set initial mode once we have data.
		if (mode === null && txList.length > 0) {
			mode = uncategorizedCount > 0 ? 'card' : 'list';
		}
	});

	let resolvedMode = $derived(mode ?? 'card');

	// ── Card mode state ──────────────────────────────────────────────────
	let skipIdx = $state(0); // offset into the uncategorized array (for Skip)
	let assignStack = $state<string[]>([]); // recently-assigned tx ids, for Back
	let animKey = $state(0); // re-keys the foreground card to retrigger animation
	let direction = $state<'fwd' | 'back'>('fwd');

	let uncategorized = $derived(
		[...txList.filter((t) => t.categoryId === null)].sort(
			(a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()
		)
	);
	let currentTx = $derived(uncategorized[Math.min(skipIdx, Math.max(0, uncategorized.length - 1))] ?? null);
	let nextTx = $derived(uncategorized[skipIdx + 1] ?? null);

	let chipCategories = $derived(cats.filter((c) => !c.isTransferCategory));

	async function assign(catId: string) {
		if (!currentTx) return;
		const cat = categoryById.get(catId);
		await updateTransaction(currentTx.id, {
			categoryId: catId,
			isTransfer: cat?.isTransferCategory ?? false
		});
		assignStack = [...assignStack, currentTx.id];
		direction = 'fwd';
		animKey += 1;
		// skipIdx unchanged: the next uncategorized tx now occupies the same slot
	}

	function skip() {
		if (skipIdx >= uncategorized.length - 1) return;
		direction = 'fwd';
		skipIdx += 1;
		animKey += 1;
	}

	async function undo() {
		const id = assignStack[assignStack.length - 1];
		if (!id) return;
		assignStack = assignStack.slice(0, -1);
		await updateTransaction(id, { categoryId: null, isTransfer: false });
		direction = 'back';
		// Reset skipIdx so the recovered tx (now uncategorized again, sorted by
		// postedDate) is the visible one. Cleanest: jump to its position once it
		// reappears in `uncategorized`.
		skipIdx = 0;
		animKey += 1;
	}

	// ── List mode state ──────────────────────────────────────────────────
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
			? list.filter(
					(t) =>
						t.displayName.toLowerCase().includes(q) || t.rawDescription.toLowerCase().includes(q)
				)
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
			else
				label = d.toLocaleDateString('en-US', {
					weekday: 'short',
					month: 'short',
					day: 'numeric'
				});
			if (!map.has(key)) map.set(key, { label, items: [] });
			map.get(key)!.items.push(t);
		}
		return [...map.entries()].map(([key, g]) => ({ key, ...g }));
	});

	function formatDayKey(d: Date): string {
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

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
					pattern: activeTransaction.rawDescription
						.split(/\s+/)
						.slice(0, 2)
						.join(' '),
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

	function shortDate(iso: string): string {
		const d = new Date(iso);
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	let progressPct = $derived(
		txList.length > 0 ? (categorizedCount / txList.length) * 100 : 0
	);
</script>

<div class="page">
	<div class="pad">
		<PageHeader
			title="Categorize"
			subtitle={uncategorizedCount > 0
				? `${categorizedCount} of ${txList.length} categorized`
				: 'all caught up'}
		>
			{#snippet actions()}
				<button
					class="head-btn"
					aria-label={resolvedMode === 'card' ? 'Switch to list view' : 'Switch to card view'}
					title={resolvedMode === 'card' ? 'List view' : 'Card view'}
					onclick={() => (mode = resolvedMode === 'card' ? 'list' : 'card')}
				>
					<Icon name={resolvedMode === 'card' ? 'list' : 'layers'} size={18} />
				</button>
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

	{#if resolvedMode === 'card'}
		<!-- ─── CARD MODE ─────────────────────────────────────────────────── -->
		<div class="pad progress-row">
			<div class="thin-bar" aria-hidden="true">
				<div class="thin-bar-fill" style:width="{progressPct}%"></div>
			</div>
		</div>

		{#if transferSuggestionsCount > 0}
			<div class="pad transfer-banner-wrap">
				<button class="transfer-banner" onclick={() => (transferSheetOpen = true)}>
					<span class="banner-text">
						{transferSuggestionsCount} possible transfer{transferSuggestionsCount === 1 ? '' : 's'} detected
					</span>
					<span class="banner-cta">Review →</span>
				</button>
			</div>
		{/if}

		{#if !currentTx}
			<div class="pad empty-card-wrap">
				<div class="empty-card">
					<div class="empty-icon">
						<Icon name="check" size={36} strokeWidth={2.6} />
					</div>
					<div class="empty-title">All caught up</div>
					<div class="empty-sub">
						Every transaction has been categorized. New ones will appear here as they sync.
					</div>
				</div>
			</div>
		{:else}
			<div class="pad card-stack-wrap">
				<div class="card-stack">
					{#if nextTx}
						<button class="tx-card peek" tabindex="-1" aria-hidden="true">
							<MerchantLogo merchant={nextTx.displayName} size={64} radius={18} />
							<div class="tx-meta">
								<div class="tx-date">{shortDate(nextTx.postedDate)}</div>
								<div class="tx-name">{nextTx.displayName}</div>
								<div class="tx-amount tabular">
									{nextTx.amount > 0 ? '+' : '−'}{formatCurrency(Math.abs(nextTx.amount))}
								</div>
							</div>
						</button>
					{/if}
					{#key animKey}
						<button class="tx-card front anim-{direction}" onclick={() => openSheet(currentTx!)}>
							<MerchantLogo merchant={currentTx.displayName} size={64} radius={18} />
							<div class="tx-meta">
								<div class="tx-date">{shortDate(currentTx.postedDate)}</div>
								<div class="tx-name">{currentTx.displayName}</div>
								<div class="tx-amount tabular">
									{currentTx.amount > 0 ? '+' : '−'}{formatCurrency(Math.abs(currentTx.amount))}
								</div>
							</div>
							{#if currentTx.pending}
								<span class="pending-badge">Pending</span>
							{/if}
						</button>
					{/key}
				</div>
			</div>

			<div class="pad chips-wrap">
				<div class="chips-eyebrow">Tap to categorize</div>
				<div class="chips">
					{#each chipCategories as c (c.id)}
						<button
							class="chip"
							style:--chip-color={c.color}
							onclick={() => assign(c.id)}
						>
							<span class="chip-glyph">
								<CategoryGlyph icon={c.icon} size={14} color="currentColor" />
							</span>
							<span>{c.name}</span>
						</button>
					{/each}
				</div>
			</div>

			<div class="pad action-row">
				<button
					class="action-btn"
					onclick={undo}
					disabled={assignStack.length === 0}
					aria-label="Undo last category"
				>
					<Icon name="chevron-left" size={18} />
					<span>Back</span>
				</button>
				<button
					class="action-btn"
					onclick={skip}
					disabled={skipIdx >= uncategorized.length - 1}
					aria-label="Skip this transaction"
				>
					<span>Skip</span>
					<Icon name="chevron-right" size={18} />
				</button>
			</div>
		{/if}
	{:else}
		<!-- ─── LIST MODE ─────────────────────────────────────────────────── -->
		<div class="pad list-toggle-row">
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
						{transferSuggestionsCount} possible transfer{transferSuggestionsCount === 1 ? '' : 's'} detected
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
						<span class="day-label">{group.label}</span>
						<span class="day-total tabular" data-positive={dayTotal > 0}>
							{dayTotal > 0 ? '+' : dayTotal < 0 ? '−' : ''}{formatCurrency(Math.abs(dayTotal))}
						</span>
					</div>
					<div class="pad">
						<div class="list-card">
							{#each group.items as tx, i (tx.id)}
								{@const cat = tx.categoryId ? categoryById.get(tx.categoryId) : null}
								<button
									class="list-row"
									class:last={i === group.items.length - 1}
									onclick={() => openSheet(tx)}
								>
									<CategoryGlyph
										icon={cat?.icon ?? 'help-circle'}
										size={28}
										color={cat?.color ?? 'var(--text-tertiary)'}
									/>
									<span class="title-block">
										<span class="title-line">
											<span class="title-text" class:pending={tx.pending}
												>{tx.displayName}</span
											>
											{#if tx.pending}
												<span class="pending-badge inline">Pending</span>
											{/if}
										</span>
										<span class="title-meta">{cat ? cat.name : 'Uncategorized'}</span>
									</span>
									<span class="amount tabular" data-positive={tx.amount > 0}>
										{tx.amount > 0 ? '+' : '−'}{formatCurrency(Math.abs(tx.amount))}
									</span>
								</button>
							{/each}
						</div>
					</div>
				</section>
			{/each}
		{/if}
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
					<span class="field-label">Amount</span>
					<span class="meta-value tabular" data-positive={activeTransaction.amount > 0}>
						{activeTransaction.amount > 0 ? '+' : '−'}{formatCurrency(Math.abs(activeTransaction.amount))}
					</span>
				</div>
				<div class="meta-item">
					<span class="field-label">Date</span>
					<span class="meta-value-text">{formatDateLong(activeTransaction.postedDate)}</span>
				</div>
			</div>

			<div class="sheet-cats">
				<span class="field-label">Category</span>
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
		background: var(--card);
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

	/* ─── Card mode ───────────────────────────────────────────────────── */
	.progress-row {
		padding-bottom: 16px;
	}

	.thin-bar {
		height: 4px;
		border-radius: 2px;
		background: var(--track);
		overflow: hidden;
	}

	.thin-bar-fill {
		height: 100%;
		border-radius: 2px;
		background: var(--accent);
		transition: width 500ms cubic-bezier(0.3, 0.7, 0.4, 1);
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
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 13px;
		font-weight: 500;
		text-align: left;
		transition: transform 100ms var(--ease-standard);
	}

	.transfer-banner:active {
		transform: scale(0.99);
	}

	.banner-cta {
		font-size: 12px;
		font-weight: 600;
	}

	.empty-card-wrap {
		padding-top: 12px;
	}

	.empty-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 8px;
		padding: 40px 24px;
	}

	.empty-icon {
		width: 80px;
		height: 80px;
		border-radius: 999px;
		background: var(--accent-soft);
		color: var(--accent);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 6px;
	}

	.empty-title {
		font-size: 22px;
		font-weight: 700;
		letter-spacing: -0.025em;
		color: var(--text-primary);
	}

	.empty-sub {
		font-size: 14px;
		color: var(--text-secondary);
		max-width: 280px;
	}

	.card-stack-wrap {
		padding-top: 4px;
		padding-bottom: 18px;
	}

	.card-stack {
		position: relative;
		height: 280px;
	}

	.tx-card {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
		padding: 24px;
		border-radius: 22px;
		background: var(--card);
		border: 0;
		text-align: center;
		font: inherit;
		color: inherit;
		cursor: pointer;
		transition: transform 100ms var(--ease-standard);
	}

	.tx-card.front {
		z-index: 2;
	}

	.tx-card.peek {
		z-index: 1;
		transform: scale(0.94) translateY(14px);
		opacity: 0.5;
		pointer-events: none;
	}

	.tx-card.front:active {
		transform: scale(0.99);
	}

	.tx-card.front.anim-fwd {
		animation: tx-in-fwd 350ms cubic-bezier(0.3, 0.7, 0.4, 1);
	}

	.tx-card.front.anim-back {
		animation: tx-in-back 350ms cubic-bezier(0.3, 0.7, 0.4, 1);
	}

	@keyframes tx-in-fwd {
		from {
			transform: translateX(40px) scale(0.96);
			opacity: 0;
		}
		to {
			transform: translateX(0) scale(1);
			opacity: 1;
		}
	}

	@keyframes tx-in-back {
		from {
			transform: translateX(-40px) scale(0.96);
			opacity: 0;
		}
		to {
			transform: translateX(0) scale(1);
			opacity: 1;
		}
	}

	.tx-meta {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.tx-date {
		font-size: 13px;
		color: var(--text-secondary);
		font-weight: 500;
		letter-spacing: 0.2px;
		text-transform: uppercase;
	}

	.tx-name {
		font-size: 19px;
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: -0.013em;
	}

	.tx-amount {
		font-size: 36px;
		font-weight: 700;
		letter-spacing: -0.035em;
		color: var(--text-primary);
		margin-top: 2px;
	}

	.pending-badge {
		position: absolute;
		top: 14px;
		right: 14px;
		font-size: 9px;
		font-weight: 600;
		padding: 2px 7px;
		border-radius: 999px;
		background: var(--warning-soft);
		color: var(--warning);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.pending-badge.inline {
		position: static;
	}

	.chips-wrap {
		padding-top: 8px;
	}

	.chips-eyebrow {
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: var(--text-secondary);
		margin-bottom: 12px;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		border-radius: 999px;
		background: var(--card);
		color: var(--text-primary);
		font-size: 14px;
		font-weight: 500;
		letter-spacing: -0.1px;
		transition: transform 120ms var(--ease-standard);
	}

	.chip:active {
		transform: scale(0.96);
	}

	.chip-glyph {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border-radius: 6px;
		background: color-mix(in srgb, var(--chip-color) 18%, transparent);
		color: var(--chip-color);
		font-weight: 700;
	}

	.action-row {
		display: flex;
		gap: 10px;
		padding-top: 16px;
	}

	.action-btn {
		display: inline-flex;
		flex: 1;
		align-items: center;
		justify-content: center;
		gap: 6px;
		height: 48px;
		padding: 0 16px;
		border-radius: 12px;
		background: var(--card);
		color: var(--text-primary);
		font-size: 15px;
		font-weight: 600;
		letter-spacing: -0.013em;
		transition: transform 100ms var(--ease-standard);
	}

	.action-btn:active:not(:disabled) {
		transform: scale(0.98);
	}

	.action-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* ─── List mode ───────────────────────────────────────────────────── */
	.list-toggle-row {
		padding-bottom: 12px;
	}

	.search-row {
		padding-bottom: 14px;
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
		color: var(--text-secondary);
		font-size: 14px;
		padding: 16px 0;
		text-align: center;
	}

	.day-group {
		margin-bottom: 22px;
	}

	.day-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding-top: 8px;
		padding-bottom: 8px;
	}

	.day-label {
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.day-total {
		font-size: 12px;
		font-weight: 500;
		color: var(--text-tertiary);
	}

	.day-total[data-positive='true'] {
		color: var(--success);
	}

	.list-card {
		background: var(--card);
		border-radius: var(--radius-card);
		overflow: hidden;
	}

	.list-row {
		display: flex;
		align-items: center;
		gap: 14px;
		width: 100%;
		padding: 12px 14px;
		text-align: left;
		border-bottom: 0.5px solid var(--separator);
		transition: background-color 100ms var(--ease-standard);
	}

	.list-row.last {
		border-bottom: none;
	}

	.list-row:active {
		background: var(--fill-1);
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

	.title-meta {
		font-size: 12px;
		color: var(--text-tertiary);
	}

	.amount {
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary);
		white-space: nowrap;
	}

	.amount[data-positive='true'] {
		color: var(--success);
	}

	/* ─── Bottom sheet (shared) ───────────────────────────────────────── */
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

	.sheet-cats {
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
		background: var(--accent);
		border-color: var(--accent);
		color: #ffffff;
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
		accent-color: var(--accent);
	}

	.actions {
		display: flex;
		gap: 8px;
		margin-top: 4px;
	}
</style>
