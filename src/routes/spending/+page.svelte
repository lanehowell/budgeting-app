<script lang="ts">
	import { onMount } from 'svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Card from '$lib/components/Card.svelte';
	import { categories } from '$lib/data/categories';
	import { transactions } from '$lib/data/transactions';
	import { formatCurrency } from '$lib/utils/format';
	import type { Category, Transaction } from '$lib/types';
	import { Chart, registerables } from 'chart.js';

	Chart.register(...registerables);

	let txList = $state<(Transaction & { id: string })[]>([]);
	let cats = $state<(Category & { id: string })[]>([]);

	$effect(() => transactions.subscribe((v) => (txList = v as typeof txList)));
	$effect(() => categories.subscribe((v) => (cats = v as typeof cats)));

	let categoryById = $derived(new Map(cats.map((c) => [c.id, c])));

	let spendingTxs = $derived(
		txList.filter((t) => {
			if (t.amount >= 0) return false;
			if (!t.categoryId) return false;
			const cat = categoryById.get(t.categoryId);
			if (!cat) return false;
			return !cat.excludeFromSpending && !cat.isTransferCategory;
		})
	);

	let total = $derived(spendingTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0));

	type CategorySum = { categoryId: string; name: string; color: string; total: number };

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
					color: cat.color,
					total: Math.abs(t.amount)
				});
			}
		}
		return [...map.values()].sort((a, b) => b.total - a.total);
	});

	let canvas = $state<HTMLCanvasElement | null>(null);
	let chart: Chart | null = null;

	$effect(() => {
		if (!canvas) return;
		const data = byCategory;
		if (data.length === 0) {
			chart?.destroy();
			chart = null;
			return;
		}
		if (chart) {
			chart.data.labels = data.map((d) => d.name);
			chart.data.datasets[0].data = data.map((d) => d.total);
			chart.data.datasets[0].backgroundColor = data.map((d) => d.color);
			chart.update();
		} else {
			chart = new Chart(canvas, {
				type: 'doughnut',
				data: {
					labels: data.map((d) => d.name),
					datasets: [
						{
							data: data.map((d) => d.total),
							backgroundColor: data.map((d) => d.color),
							borderWidth: 0,
							hoverOffset: 6
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					cutout: '68%',
					plugins: {
						legend: { display: false },
						tooltip: {
							callbacks: {
								label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed)}`
							}
						}
					}
				}
			});
		}
	});

	onMount(() => {
		return () => {
			chart?.destroy();
			chart = null;
		};
	});
</script>

<PageHeader title="Spending" summary="Current pay period" />

<Card padding>
	<div class="total-block">
		<span class="footnote dim">Total spent</span>
		<span class="total tabular">{formatCurrency(total)}</span>
	</div>
	{#if byCategory.length > 0}
		<div class="chart-wrap">
			<canvas bind:this={canvas} aria-label="Spending by category"></canvas>
		</div>
	{/if}
</Card>

<h2 class="title-2 section-title">By category</h2>

{#if byCategory.length === 0}
	<Card padding>
		<p class="empty subheadline">No categorized spending yet.</p>
	</Card>
{:else}
	<Card>
		<ul class="rows">
			{#each byCategory as row (row.categoryId)}
				{@const pct = total > 0 ? (row.total / total) * 100 : 0}
				<li class="row">
					<button class="row-tap">
						<span class="left">
							<span class="dot" style="background:{row.color}"></span>
							<span class="text">
								<span class="name headline">{row.name}</span>
								<span class="bar-wrap">
									<span class="bar" style="width:{pct}%; background:{row.color};"></span>
								</span>
							</span>
						</span>
						<span class="right">
							<span class="amount tabular headline">{formatCurrency(row.total)}</span>
							<span class="pct footnote">{pct.toFixed(0)}%</span>
						</span>
					</button>
				</li>
			{/each}
		</ul>
	</Card>
{/if}

<style>
	.total-block {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 16px;
	}

	.dim {
		color: var(--text-tertiary);
	}

	.total {
		font-size: 40px;
		line-height: 44px;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--text-primary);
	}

	.chart-wrap {
		position: relative;
		height: 240px;
	}

	.section-title {
		margin-top: 32px;
		margin-bottom: 12px;
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

	.row-tap {
		display: flex;
		width: 100%;
		padding: 14px 16px;
		gap: 12px;
		align-items: center;
		justify-content: space-between;
		text-align: left;
		transition: background-color 150ms var(--ease-standard);
	}

	.row-tap:active {
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
		gap: 6px;
		min-width: 0;
		flex: 1 1 auto;
	}

	.name {
		color: var(--text-primary);
	}

	.bar-wrap {
		height: 4px;
		background: var(--bg-secondary);
		border-radius: 999px;
		overflow: hidden;
	}

	.bar {
		display: block;
		height: 100%;
		border-radius: 999px;
		transition: width 250ms var(--ease-standard);
	}

	.right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 2px;
		flex-shrink: 0;
	}

	.amount {
		color: var(--text-primary);
	}

	.pct {
		color: var(--text-tertiary);
	}
</style>
