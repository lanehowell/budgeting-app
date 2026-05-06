<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import CategoryGlyph from '$lib/components/CategoryGlyph.svelte';
	import SegmentedToggle from '$lib/components/SegmentedToggle.svelte';
	import CategoryDrillSheet from '$lib/components/CategoryDrillSheet.svelte';
	import { categories } from '$lib/data/categories';
	import { transactions } from '$lib/data/transactions';
	import { settings as settingsStore } from '$lib/data/settings';
	import { formatCurrency } from '$lib/utils/format';
	import { getCurrentPeriod } from '$lib/utils/payPeriod';
	import type { Category, Settings, Transaction } from '$lib/types';

	let txList = $state<(Transaction & { id: string })[]>([]);
	let cats = $state<(Category & { id: string })[]>([]);
	let liveSettings = $state<(Settings & { id: string }) | null>(null);

	$effect(() => transactions.subscribe((v) => (txList = v as typeof txList)));
	$effect(() => categories.subscribe((v) => (cats = v as typeof cats)));
	$effect(() => settingsStore.subscribe((v) => (liveSettings = v)));

	let categoryById = $derived(new Map(cats.map((c) => [c.id, c])));
	let payPeriod = $derived(getCurrentPeriod(liveSettings));

	let view = $state<'category' | 'merchant'>('category');

	let inPeriod = $derived(
		txList.filter((t) => {
			const d = new Date(t.postedDate).getTime();
			return d >= payPeriod.start.getTime() && d <= payPeriod.end.getTime() + 86399999;
		})
	);

	let spendingTxs = $derived(
		inPeriod.filter((t) => {
			if (t.amount >= 0) return false;
			if (!t.categoryId) return false;
			const cat = categoryById.get(t.categoryId);
			if (!cat) return false;
			return !cat.excludeFromSpending && !cat.isTransferCategory;
		})
	);

	let total = $derived(spendingTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0));

	type CategorySum = { categoryId: string; name: string; icon: string; total: number };

	let byCategory = $derived.by((): CategorySum[] => {
		const map = new Map<string, CategorySum>();
		for (const t of spendingTxs) {
			const cat = categoryById.get(t.categoryId!)!;
			const existing = map.get(cat.id);
			if (existing) {
				existing.total += Math.abs(t.amount);
			} else {
				map.set(cat.id, {
					categoryId: cat.id,
					name: cat.name,
					icon: cat.icon,
					total: Math.abs(t.amount)
				});
			}
		}
		return [...map.values()].sort((a, b) => b.total - a.total);
	});

	type MerchantSum = { merchant: string; categoryId: string; total: number; count: number };

	let byMerchant = $derived.by((): MerchantSum[] => {
		const map = new Map<string, MerchantSum>();
		for (const t of spendingTxs) {
			const key = t.displayName;
			const existing = map.get(key);
			if (existing) {
				existing.total += Math.abs(t.amount);
				existing.count += 1;
			} else {
				map.set(key, {
					merchant: key,
					categoryId: t.categoryId!,
					total: Math.abs(t.amount),
					count: 1
				});
			}
		}
		return [...map.values()].sort((a, b) => b.total - a.total);
	});

	let drillCategoryId = $state<string | null>(null);
	let drillCategory = $derived(drillCategoryId ? (categoryById.get(drillCategoryId) ?? null) : null);
	let drillTransactions = $derived(
		drillCategoryId
			? spendingTxs
					.filter((t) => t.categoryId === drillCategoryId)
					.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime())
			: []
	);

	let elapsedPct = $derived((payPeriod.daysElapsed / payPeriod.totalDays) * 100);
	let burnPct = $derived(
		payPeriod.daysElapsed > 0
			? Math.min(100, (payPeriod.daysElapsed / payPeriod.totalDays) * 100)
			: 0
	);
	let maxCat = $derived(byCategory[0]?.total ?? 1);
	let maxMerchant = $derived(byMerchant[0]?.total ?? 1);
</script>

<div class="page">
	<div class="pad">
		<PageHeader title="Spending" eyebrow={`Pay period · ${payPeriod.label.long}`} />
	</div>

	<div class="pad summary">
		<div class="big tabular">{formatCurrency(total)}</div>
		<div class="big-sub">this pay period</div>

		<div class="period-bar-wrap">
			<div class="period-bar">
				<div class="period-fill" style="width: {burnPct}%"></div>
				<div class="period-marker" style="left: {elapsedPct}%"></div>
			</div>
			<div class="period-meta tabular">
				<span>{payPeriod.label.start}</span>
				<span>Day {payPeriod.daysElapsed} of {payPeriod.totalDays}</span>
				<span>{payPeriod.label.end}</span>
			</div>
		</div>
	</div>

	<div class="pad toggle-row">
		<SegmentedToggle
			value={view}
			onChange={(v) => (view = v)}
			options={[
				{ value: 'category', label: 'Category' },
				{ value: 'merchant', label: 'Merchant' }
			]}
			ariaLabel="Breakdown"
		/>
	</div>

	{#if total === 0}
		<div class="pad">
			<p class="empty">No categorized spending yet.</p>
		</div>
	{:else if view === 'category'}
		<div class="pad">
			<ul class="rows">
				{#each byCategory as row, i (row.categoryId)}
					{@const pct = row.total / maxCat}
					<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
					<li
						class="row interactive"
						class:last={i === byCategory.length - 1}
						role="button"
						tabindex="0"
						onclick={() => (drillCategoryId = row.categoryId)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								drillCategoryId = row.categoryId;
							}
						}}
					>
						<CategoryGlyph icon={row.icon} size={28} />
						<span class="title-block">
							<span class="title-line">
								<span class="title-text">{row.name}</span>
								<span class="amount tabular">{formatCurrency(row.total)}</span>
							</span>
							<div class="bar-wrap">
								<div class="bar" style="width: {pct * 100}%"></div>
							</div>
						</span>
					</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div class="pad">
			<ul class="rows">
				{#each byMerchant as m, i (m.merchant)}
					{@const pct = m.total / maxMerchant}
					{@const cat = categoryById.get(m.categoryId)}
					<li class="row" class:last={i === byMerchant.length - 1}>
						<CategoryGlyph icon={cat?.icon ?? 'help-circle'} size={28} />
						<span class="title-block">
							<span class="title-line">
								<span class="title-text">{m.merchant}</span>
								<span class="amount tabular">{formatCurrency(m.total)}</span>
							</span>
							<div class="bar-row">
								<div class="bar-wrap thin">
									<div class="bar" style="width: {pct * 100}%"></div>
								</div>
								<span class="count tabular">{m.count}×</span>
							</div>
						</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>

<CategoryDrillSheet
	open={drillCategory !== null}
	category={drillCategory}
	transactions={drillTransactions}
	periodLabel={`Pay period · ${payPeriod.label.long}`}
	onClose={() => (drillCategoryId = null)}
/>

<style>
	.page {
		padding-bottom: 32px;
	}

	.pad {
		padding: 0 var(--side-pad);
	}

	.summary {
		padding-bottom: 22px;
	}

	.big {
		font-family: var(--font-num);
		font-variant-numeric: tabular-nums;
		font-size: 48px;
		font-weight: 500;
		letter-spacing: -0.038em;
		color: var(--text-primary);
		line-height: 1;
	}

	.big-sub {
		margin-top: 6px;
		font-size: 13px;
		color: var(--text-tertiary);
	}

	.period-bar-wrap {
		margin-top: 22px;
	}

	.period-bar {
		position: relative;
		height: 6px;
		background: var(--fill-1);
		border-radius: 3px;
		overflow: visible;
	}

	.period-fill {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		background: var(--text-primary);
		border-radius: 3px;
		transition: width 350ms cubic-bezier(0.3, 0.7, 0.4, 1);
	}

	.period-marker {
		position: absolute;
		top: -3px;
		bottom: -3px;
		width: 1.5px;
		background: var(--text-secondary);
		transform: translateX(-50%);
	}

	.period-meta {
		display: flex;
		justify-content: space-between;
		margin-top: 8px;
		font-size: 11px;
		color: var(--text-tertiary);
	}

	.toggle-row {
		padding-bottom: 18px;
	}

	.empty {
		color: var(--text-tertiary);
		font-size: 14px;
		padding: 16px 0;
	}

	.rows {
		display: flex;
		flex-direction: column;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 14px 0;
		border-bottom: 0.5px solid var(--separator);
	}

	.row.last {
		border-bottom: none;
	}

	.row.interactive {
		cursor: pointer;
		transition: opacity 100ms var(--ease-standard);
	}

	.row.interactive:active {
		opacity: 0.6;
	}

	.title-block {
		flex: 1 1 auto;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.title-line {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
	}

	.title-text {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary);
		letter-spacing: -0.007em;
	}

	.amount {
		font-size: 13px;
		font-weight: 500;
		color: var(--text-primary);
	}

	.bar-wrap {
		height: 2px;
		background: var(--fill-1);
		border-radius: 1px;
		overflow: hidden;
	}

	.bar-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.bar-wrap.thin {
		flex: 1 1 auto;
	}

	.bar {
		height: 100%;
		background: var(--text-secondary);
		transition: width 350ms cubic-bezier(0.3, 0.7, 0.4, 1);
	}

	.count {
		font-size: 11px;
		color: var(--text-tertiary);
		flex-shrink: 0;
	}
</style>
