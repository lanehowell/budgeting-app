<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Card from '$lib/components/Card.svelte';
	import AnimatedNumber from '$lib/components/AnimatedNumber.svelte';
	import Sparkline from '$lib/components/Sparkline.svelte';
	import CategoryGlyph from '$lib/components/CategoryGlyph.svelte';
	import MerchantLogo from '$lib/components/MerchantLogo.svelte';
	import SegmentedToggle from '$lib/components/SegmentedToggle.svelte';
	import Icon from '$lib/components/Icon.svelte';
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

	let scope = $state<'period' | 'month'>('period');
	let groupBy = $state<'category' | 'merchant'>('category');

	type Range = { start: Date; end: Date; label: string };

	function dayStart(d: Date): Date {
		return new Date(d.getFullYear(), d.getMonth(), d.getDate());
	}

	let currentRange = $derived.by((): Range => {
		if (scope === 'period') {
			return {
				start: dayStart(payPeriod.start),
				end: dayStart(payPeriod.end),
				label: payPeriod.label.long
			};
		}
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth(), 1);
		const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
		return { start, end, label: monthLabel };
	});

	let previousRange = $derived.by((): Range => {
		if (scope === 'period') {
			const len = payPeriod.totalDays;
			const end = new Date(payPeriod.start);
			end.setDate(end.getDate() - 1);
			const start = new Date(end);
			start.setDate(start.getDate() - (len - 1));
			return { start: dayStart(start), end: dayStart(end), label: 'previous period' };
		}
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const end = new Date(now.getFullYear(), now.getMonth(), 0);
		return { start, end, label: 'previous month' };
	});

	function isSpendingTx(t: Transaction): boolean {
		if (t.amount >= 0) return false;
		if (!t.categoryId) return false;
		const cat = categoryById.get(t.categoryId);
		if (!cat) return false;
		return !cat.excludeFromSpending && !cat.isTransferCategory;
	}

	function inRange(t: Transaction, r: Range): boolean {
		const time = new Date(t.postedDate).getTime();
		return time >= r.start.getTime() && time <= r.end.getTime() + 86399999;
	}

	let currentTxs = $derived(txList.filter((t) => isSpendingTx(t) && inRange(t, currentRange)));
	let previousTxs = $derived(txList.filter((t) => isSpendingTx(t) && inRange(t, previousRange)));

	let total = $derived(currentTxs.reduce((s, t) => s + Math.abs(t.amount), 0));
	let prevTotal = $derived(previousTxs.reduce((s, t) => s + Math.abs(t.amount), 0));

	let deltaPct = $derived(prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null);

	// Daily cumulative sparkline data over current range
	let sparkData = $derived.by((): number[] => {
		const start = currentRange.start.getTime();
		const end = currentRange.end.getTime();
		const today = dayStart(new Date()).getTime();
		const upTo = Math.min(end, today);
		if (upTo < start) return [0];
		const days = Math.floor((upTo - start) / 86400000) + 1;
		const buckets = new Array(days).fill(0);
		for (const t of currentTxs) {
			const d = dayStart(new Date(t.postedDate)).getTime();
			const idx = Math.floor((d - start) / 86400000);
			if (idx >= 0 && idx < days) buckets[idx] += Math.abs(t.amount);
		}
		const cum: number[] = [];
		let running = 0;
		for (let i = 0; i < days; i++) {
			running += buckets[i];
			cum.push(running);
		}
		return cum.length >= 2 ? cum : [0, running];
	});

	type CategorySum = {
		categoryId: string;
		name: string;
		icon: string;
		color: string;
		total: number;
		count: number;
	};

	let byCategory = $derived.by((): CategorySum[] => {
		const map = new Map<string, CategorySum>();
		for (const t of currentTxs) {
			const cat = categoryById.get(t.categoryId!)!;
			const existing = map.get(cat.id);
			if (existing) {
				existing.total += Math.abs(t.amount);
				existing.count += 1;
			} else {
				map.set(cat.id, {
					categoryId: cat.id,
					name: cat.name,
					icon: cat.icon,
					color: cat.color,
					total: Math.abs(t.amount),
					count: 1
				});
			}
		}
		return [...map.values()].sort((a, b) => b.total - a.total);
	});

	type MerchantSum = {
		merchant: string;
		categoryId: string;
		total: number;
		count: number;
	};

	let byMerchant = $derived.by((): MerchantSum[] => {
		const map = new Map<string, MerchantSum>();
		for (const t of currentTxs) {
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

	let maxCat = $derived(byCategory[0]?.total ?? 1);
	let maxMerchant = $derived(byMerchant[0]?.total ?? 1);

	let drillCategoryId = $state<string | null>(null);
	let drillCategory = $derived(drillCategoryId ? (categoryById.get(drillCategoryId) ?? null) : null);
	let drillTransactions = $derived(
		drillCategoryId
			? currentTxs
					.filter((t) => t.categoryId === drillCategoryId)
					.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime())
			: []
	);

	function fmtWhole(n: number): string {
		return `$${Math.round(n).toLocaleString('en-US')}`;
	}
</script>

<div class="page">
	<div class="pad">
		<PageHeader title="Spending" subtitle={currentRange.label} />
	</div>

	<div class="pad scope-row">
		<SegmentedToggle
			value={scope}
			onChange={(v) => (scope = v)}
			options={[
				{ value: 'period', label: 'Pay period' },
				{ value: 'month', label: 'Month' }
			]}
			ariaLabel="Spending scope"
		/>
	</div>

	<div class="pad hero-wrap">
		<Card padding={20}>
			<div class="hero-eyebrow">Total spent</div>
			<div class="hero-line">
				<div class="hero-num">
					<AnimatedNumber value={total} />
				</div>
				{#if deltaPct !== null}
					{@const isDown = deltaPct < 0}
					<span class="delta-pill" data-tone={isDown ? 'good' : 'bad'}>
						<Icon name={isDown ? 'arrow-down' : 'arrow-up'} size={11} strokeWidth={2.5} />
						<span class="tabular">{Math.abs(deltaPct).toFixed(0)}%</span>
					</span>
				{/if}
			</div>
			<div class="hero-sub">
				vs {fmtWhole(prevTotal)} {previousRange.label}
			</div>
			<div class="spark">
				<Sparkline data={sparkData} height={64} />
			</div>
		</Card>
	</div>

	<div class="pad group-row">
		<SegmentedToggle
			value={groupBy}
			onChange={(v) => (groupBy = v)}
			options={[
				{ value: 'category', label: 'By category' },
				{ value: 'merchant', label: 'By merchant' }
			]}
			ariaLabel="Spending breakdown"
		/>
	</div>

	{#if total === 0}
		<div class="pad">
			<Card padding={28}>
				<p class="empty-text">No spending in this {scope === 'period' ? 'period' : 'month'}.</p>
			</Card>
		</div>
	{:else if groupBy === 'category'}
		<div class="pad rows">
			{#each byCategory as row (row.categoryId)}
				{@const pct = row.total / maxCat}
				<Card padding={12} interactive onclick={() => (drillCategoryId = row.categoryId)}>
					<div class="row">
						<div
							class="leading category"
							style:background="{row.color}22"
							style:color={row.color}
						>
							<CategoryGlyph icon={row.icon} size={20} color="currentColor" />
						</div>
						<div class="title-block">
							<div class="title-line">
								<span class="title-text">{row.name}</span>
								<span class="amount tabular">{formatCurrency(row.total)}</span>
							</div>
							<div class="title-meta">{row.count} transaction{row.count === 1 ? '' : 's'}</div>
							<div class="row-bar">
								<div class="row-bar-fill" style:width="{pct * 100}%" style:background={row.color}></div>
							</div>
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{:else}
		<div class="pad rows">
			{#each byMerchant as m (m.merchant)}
				{@const pct = m.total / maxMerchant}
				{@const cat = categoryById.get(m.categoryId)}
				<Card padding={12}>
					<div class="row">
						<MerchantLogo merchant={m.merchant} size={36} radius={10} />
						<div class="title-block">
							<div class="title-line">
								<span class="title-text">{m.merchant}</span>
								<span class="amount tabular">{formatCurrency(m.total)}</span>
							</div>
							<div class="title-meta">{m.count} transaction{m.count === 1 ? '' : 's'}</div>
							<div class="row-bar">
								<div
									class="row-bar-fill"
									style:width="{pct * 100}%"
									style:background={cat?.color ?? 'var(--accent)'}
								></div>
							</div>
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{/if}
</div>

<CategoryDrillSheet
	open={drillCategory !== null}
	category={drillCategory}
	transactions={drillTransactions}
	periodLabel={currentRange.label}
	onClose={() => (drillCategoryId = null)}
/>

<style>
	.page {
		padding-bottom: 32px;
	}

	.pad {
		padding: 0 var(--side-pad);
	}

	.scope-row {
		padding-bottom: 14px;
	}

	.hero-wrap {
		padding-bottom: 14px;
	}

	.hero-eyebrow {
		font-size: 13px;
		color: var(--text-secondary);
		font-weight: 500;
		letter-spacing: -0.005em;
	}

	.hero-line {
		display: flex;
		align-items: baseline;
		gap: 10px;
		margin-top: 4px;
	}

	.hero-num {
		font-size: 42px;
		font-weight: 700;
		letter-spacing: -0.035em;
		color: var(--text-primary);
		line-height: 1.05;
	}

	.delta-pill {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		padding: 3px 8px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 600;
	}

	.delta-pill[data-tone='good'] {
		background: var(--success-soft);
		color: var(--success);
	}

	.delta-pill[data-tone='bad'] {
		background: var(--danger-soft);
		color: var(--danger);
	}

	.hero-sub {
		font-size: 12px;
		color: var(--text-tertiary);
		margin-top: 2px;
	}

	.spark {
		margin-top: 14px;
	}

	.group-row {
		padding-bottom: 12px;
	}

	.empty-text {
		text-align: center;
		color: var(--text-secondary);
		font-size: 14px;
	}

	.rows {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.leading {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.leading.category {
		width: 36px;
		height: 36px;
		border-radius: 10px;
	}

	.title-block {
		flex: 1 1 auto;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.title-line {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
	}

	.title-text {
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: -0.013em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.title-meta {
		font-size: 12px;
		color: var(--text-tertiary);
	}

	.amount {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: -0.013em;
		flex-shrink: 0;
	}

	.row-bar {
		height: 4px;
		border-radius: 2px;
		background: var(--track);
		overflow: hidden;
		margin-top: 2px;
	}

	.row-bar-fill {
		height: 100%;
		border-radius: 2px;
		transition: width 500ms cubic-bezier(0.3, 0.7, 0.4, 1);
	}
</style>
