<script lang="ts">
	import { goto } from '$app/navigation';
	import { dev } from '$app/environment';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Card from '$lib/components/Card.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { categories } from '$lib/data/categories';
	import { merchantRules } from '$lib/data/merchantRules';
	import { authState, signOut } from '$lib/firebase/auth';
	import { theme, type ThemeChoice } from '$lib/stores/theme';
	import { seedMockData } from '$lib/dev/seedMock';
	import type { Category, MerchantRule } from '$lib/types';

	let cats = $state<(Category & { id: string })[]>([]);
	let rules = $state<(MerchantRule & { id: string })[]>([]);
	let user = $state<import('firebase/auth').User | null>(null);

	$effect(() => categories.subscribe((v) => (cats = v as typeof cats)));
	$effect(() => merchantRules.subscribe((v) => (rules = v as typeof rules)));
	$effect(() => authState.subscribe((s) => (user = s.user)));

	let categoryById = $derived(new Map(cats.map((c) => [c.id, c])));

	let themeChoice = $state<ThemeChoice>('system');
	$effect(() => theme.choice.subscribe((v) => (themeChoice = v)));

	function setTheme(t: ThemeChoice) {
		theme.set(t);
	}

	const themeOptions: { value: ThemeChoice; label: string; icon: string }[] = [
		{ value: 'light', label: 'Light', icon: 'sun' },
		{ value: 'dark', label: 'Dark', icon: 'moon' },
		{ value: 'system', label: 'System', icon: 'monitor' }
	];

	let seedingMock = $state(false);
	let seedMessage = $state<string | null>(null);
	async function loadMock() {
		seedingMock = true;
		seedMessage = null;
		try {
			const result = await seedMockData();
			seedMessage = `Loaded ${result.written} mock records.`;
		} catch (e) {
			console.error(e);
			seedMessage = e instanceof Error ? e.message : 'Failed to seed.';
		} finally {
			seedingMock = false;
		}
	}

	async function handleSignOut() {
		await signOut();
		goto('/login', { replaceState: true });
	}
</script>

<PageHeader title="Profile" summary={user?.email ?? undefined} />

<h2 class="title-2 section-title">Theme</h2>
<Card padding>
	<div class="theme-row">
		{#each themeOptions as opt (opt.value)}
			<button
				class="theme-opt"
				class:selected={themeChoice === opt.value}
				onclick={() => setTheme(opt.value)}
				aria-pressed={themeChoice === opt.value}
			>
				<Icon name={opt.icon} size={20} />
				<span class="footnote">{opt.label}</span>
			</button>
		{/each}
	</div>
</Card>

<h2 class="title-2 section-title">Categories</h2>
{#if cats.length === 0}
	<Card padding>
		<p class="empty subheadline">No categories yet.</p>
	</Card>
{:else}
	<Card>
		<ul class="rows">
			{#each [...cats].sort((a, b) => a.sortOrder - b.sortOrder) as cat (cat.id)}
				<li class="row">
					<button class="row-tap">
						<span class="left">
							<span class="dot" style="background:{cat.color}"></span>
							<span class="text">
								<span class="name headline">{cat.name}</span>
								{#if cat.excludeFromSpending}
									<span class="footnote dim">Excluded from spending</span>
								{/if}
							</span>
						</span>
						<Icon name="chevron-right" size={18} />
					</button>
				</li>
			{/each}
		</ul>
	</Card>
{/if}

<h2 class="title-2 section-title">Merchant rules</h2>
{#if rules.length === 0}
	<Card padding>
		<p class="empty subheadline">No rules yet.</p>
	</Card>
{:else}
	<Card>
		<ul class="rows">
			{#each rules as rule (rule.id)}
				{@const cat = categoryById.get(rule.categoryId)}
				<li class="row">
					<button class="row-tap">
						<span class="left">
							<span class="dot" style="background:{cat?.color ?? '#8E8E93'}"></span>
							<span class="text">
								<span class="name headline">{rule.displayName}</span>
								<span class="footnote dim">
									{rule.matchType} "{rule.pattern}" → {cat?.name ?? '—'}
								</span>
							</span>
						</span>
						<Icon name="chevron-right" size={18} />
					</button>
				</li>
			{/each}
		</ul>
	</Card>
{/if}

<h2 class="title-2 section-title">Pay period</h2>
<Card padding>
	<div class="pp-row">
		<span class="callout">Monthly</span>
		<span class="footnote dim">Configurable in a future update</span>
	</div>
</Card>

{#if dev}
	<h2 class="title-2 section-title">Developer</h2>
	<Card padding>
		<button class="dev-btn" onclick={loadMock} disabled={seedingMock}>
			{seedingMock ? 'Loading…' : 'Load mock data'}
		</button>
		{#if seedMessage}
			<p class="footnote dim seed-msg">{seedMessage}</p>
		{/if}
	</Card>
{/if}

<div class="signout">
	<button class="signout-btn" onclick={handleSignOut}>Sign out</button>
</div>

<style>
	.section-title {
		margin-top: 28px;
		margin-bottom: 12px;
	}

	.theme-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}

	.theme-opt {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 14px 10px;
		border-radius: var(--radius-input);
		background: var(--bg-secondary);
		color: var(--text-secondary);
		min-height: 64px;
		border: 1.5px solid transparent;
		transition:
			background-color 150ms var(--ease-standard),
			border-color 150ms var(--ease-standard),
			color 150ms var(--ease-standard);
	}

	.theme-opt.selected {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		border-color: var(--accent);
		color: var(--accent);
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
		color: var(--text-tertiary);
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
		gap: 2px;
		min-width: 0;
	}

	.name {
		color: var(--text-primary);
	}

	.dim {
		color: var(--text-tertiary);
	}

	.pp-row {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.dev-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 10px 18px;
		min-height: 40px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
		font-size: 15px;
		font-weight: 600;
	}

	.dev-btn:disabled {
		opacity: 0.5;
	}

	.seed-msg {
		margin-top: 8px;
	}

	.signout {
		margin-top: 32px;
		display: flex;
		justify-content: center;
	}

	.signout-btn {
		padding: 14px 28px;
		color: var(--danger);
		font-size: 17px;
		font-weight: 600;
		min-height: 44px;
	}
</style>
