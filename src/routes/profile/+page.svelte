<script lang="ts">
	import { goto } from '$app/navigation';
	import { dev } from '$app/environment';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Switch from '$lib/components/Switch.svelte';
	import PayPeriodSheet from '$lib/components/PayPeriodSheet.svelte';
	import CategorySheet from '$lib/components/CategorySheet.svelte';
	import RuleSheet from '$lib/components/RuleSheet.svelte';
	import ConnectBankSheet from '$lib/components/ConnectBankSheet.svelte';
	import { categories } from '$lib/data/categories';
	import { merchantRules } from '$lib/data/merchantRules';
	import { settings as settingsStore } from '$lib/data/settings';
	import { accounts as accountsStore, simpleFinDisconnect, simpleFinSync } from '$lib/data/accounts';
	import type { AccountDoc } from '$lib/data/accounts';
	import { authState, signOut } from '$lib/firebase/auth';
	import { theme, type ThemeChoice } from '$lib/stores/theme';
	import { seedMockData } from '$lib/dev/seedMock';
	import { getCurrentPeriod } from '$lib/utils/payPeriod';
	import type { Category, MerchantRule, Settings } from '$lib/types';

	let cats = $state<(Category & { id: string })[]>([]);
	let rules = $state<(MerchantRule & { id: string })[]>([]);
	let user = $state<import('firebase/auth').User | null>(null);
	let liveSettings = $state<(Settings & { id: string }) | null>(null);
	let accountsList = $state<(AccountDoc & { id: string })[]>([]);

	$effect(() => categories.subscribe((v) => (cats = v as typeof cats)));
	$effect(() => merchantRules.subscribe((v) => (rules = v as typeof rules)));
	$effect(() => authState.subscribe((s) => (user = s.user)));
	$effect(() => settingsStore.subscribe((v) => (liveSettings = v)));
	$effect(() => accountsStore.subscribe((v) => (accountsList = v as typeof accountsList)));

	let connectSheetOpen = $state(false);
	let syncing = $state(false);
	let disconnectingId = $state<string | null>(null);
	let connectMessage = $state<string | null>(null);

	async function syncNow() {
		syncing = true;
		connectMessage = null;
		try {
			const result = await simpleFinSync();
			connectMessage = `Synced · ${result.imported} new, ${result.updated} updated`;
		} catch (e) {
			console.error(e);
			connectMessage = e instanceof Error ? e.message : 'Sync failed';
		} finally {
			syncing = false;
		}
	}

	async function disconnectAll() {
		if (!confirm('Disconnect SimpleFIN? This removes connected accounts but keeps your transactions.')) {
			return;
		}
		disconnectingId = '*';
		connectMessage = null;
		try {
			await simpleFinDisconnect();
			connectMessage = 'Disconnected.';
		} catch (e) {
			console.error(e);
			connectMessage = e instanceof Error ? e.message : 'Disconnect failed';
		} finally {
			disconnectingId = null;
		}
	}

	function fmtRelative(iso: string | null | undefined): string {
		if (!iso) return 'never';
		const d = new Date(iso);
		const diff = (Date.now() - d.getTime()) / 1000;
		if (diff < 60) return 'just now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	let payPeriod = $derived(getCurrentPeriod(liveSettings));
	let payPeriodSheetOpen = $state(false);

	const ppLabels: Record<string, string> = {
		monthly: 'Monthly',
		biweekly: 'Biweekly',
		weekly: 'Weekly',
		custom: 'Custom'
	};

	let categorySheetOpen = $state(false);
	let editingCategory = $state<(Category & { id: string }) | null>(null);
	function openAddCategory() {
		editingCategory = null;
		categorySheetOpen = true;
	}
	function openEditCategory(c: Category & { id: string }) {
		editingCategory = c;
		categorySheetOpen = true;
	}
	function closeCategorySheet() {
		categorySheetOpen = false;
		editingCategory = null;
	}

	let ruleSheetOpen = $state(false);
	let editingRule = $state<(MerchantRule & { id: string }) | null>(null);
	function openAddRule() {
		editingRule = null;
		ruleSheetOpen = true;
	}
	function openEditRule(r: MerchantRule & { id: string }) {
		editingRule = r;
		ruleSheetOpen = true;
	}
	function closeRuleSheet() {
		ruleSheetOpen = false;
		editingRule = null;
	}

	let categoryById = $derived(new Map(cats.map((c) => [c.id, c])));

	let themeChoice = $state<ThemeChoice>('system');
	let resolvedTheme = $state<'light' | 'dark'>('light');
	$effect(() => theme.choice.subscribe((v) => (themeChoice = v)));
	$effect(() => theme.resolved.subscribe((v) => (resolvedTheme = v)));

	let darkOn = $derived(resolvedTheme === 'dark');

	function toggleDark(v: boolean) {
		theme.set(v ? 'dark' : 'light');
	}

	function setSystemTheme() {
		theme.set('system');
	}

	let initials = $derived.by(() => {
		const name = user?.displayName ?? user?.email ?? '';
		const parts = name.split(/[\s@.]+/).filter(Boolean);
		if (parts.length === 0) return '?';
		if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
		return ((parts[0][0] ?? '') + (parts[1][0] ?? '')).toUpperCase();
	});

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

<div class="page">
	<div class="pad">
		<PageHeader title="Profile" />
	</div>

	<div class="pad account">
		<div class="account-row">
			<div class="avatar">{initials}</div>
			<div class="acc-text">
				<div class="acc-name">{user?.displayName ?? 'You'}</div>
				<div class="acc-email">{user?.email ?? ''}</div>
			</div>
		</div>
	</div>

	<section class="group">
		<div class="pad section-head">
			<span class="eyebrow">Preferences</span>
		</div>
		<div class="pad">
			<div class="setting-row">
				<span class="setting-label">Dark mode</span>
				<Switch value={darkOn} onChange={toggleDark} ariaLabel="Dark mode" />
			</div>
			<div class="setting-row last">
				<span class="setting-label">Match system theme</span>
				<button
					class="text-link"
					onclick={setSystemTheme}
					aria-pressed={themeChoice === 'system'}
				>
					{themeChoice === 'system' ? 'On' : 'Use system'}
				</button>
			</div>
		</div>
	</section>

	<section class="group">
		<div class="pad section-head">
			<div class="head-left">
				<span class="eyebrow">Categories</span>
				<span class="meta tabular">{cats.length}</span>
			</div>
			<button class="add-btn" onclick={openAddCategory} aria-label="Add category">
				<Icon name="plus" size={14} />
				<span>Add</span>
			</button>
		</div>
		{#if cats.length === 0}
			<div class="pad"><p class="empty">No categories yet.</p></div>
		{:else}
			<div class="pad">
				{#each [...cats].sort((a, b) => a.sortOrder - b.sortOrder) as cat, i (cat.id)}
					<button
						class="setting-row interactive"
						class:last={i === cats.length - 1}
						onclick={() => openEditCategory(cat)}
					>
						<span class="setting-label">{cat.name}</span>
						<span class="setting-detail">
							{cat.excludeFromSpending ? 'excluded' : ''}
						</span>
						<Icon name="chevron-right" size={14} />
					</button>
				{/each}
			</div>
		{/if}
	</section>

	<section class="group">
		<div class="pad section-head">
			<div class="head-left">
				<span class="eyebrow">Merchant rules</span>
				<span class="meta tabular">{rules.length}</span>
			</div>
			<button class="add-btn" onclick={openAddRule} aria-label="Add merchant rule">
				<Icon name="plus" size={14} />
				<span>Add</span>
			</button>
		</div>
		{#if rules.length === 0}
			<div class="pad"><p class="empty">No rules yet.</p></div>
		{:else}
			<div class="pad">
				{#each rules as rule, i (rule.id)}
					{@const cat = categoryById.get(rule.categoryId)}
					<button
						class="setting-row interactive"
						class:last={i === rules.length - 1}
						onclick={() => openEditRule(rule)}
					>
						<span class="setting-label">{rule.displayName}</span>
						<span class="setting-detail">
							{rule.matchType} "{rule.pattern}" → {cat?.name ?? '—'}
						</span>
						<Icon name="chevron-right" size={14} />
					</button>
				{/each}
			</div>
		{/if}
	</section>

	<section class="group">
		<div class="pad section-head">
			<span class="eyebrow">Pay period</span>
		</div>
		<div class="pad">
			<button
				class="setting-row interactive"
				onclick={() => (payPeriodSheetOpen = true)}
			>
				<span class="setting-label">Schedule</span>
				<span class="setting-detail">
					{ppLabels[payPeriod.type] ?? 'Monthly'} · {payPeriod.label.long}
				</span>
				<Icon name="chevron-right" size={14} />
			</button>
			<div class="setting-row last">
				<span class="setting-label">Period total length</span>
				<span class="setting-detail tabular">{payPeriod.totalDays} days</span>
			</div>
		</div>
	</section>

	<section class="group">
		<div class="pad section-head">
			<div class="head-left">
				<span class="eyebrow">Connected accounts</span>
				<span class="meta tabular">{accountsList.length}</span>
			</div>
			{#if accountsList.length === 0}
				<button class="add-btn" onclick={() => (connectSheetOpen = true)}>
					<Icon name="plus" size={14} />
					<span>Connect</span>
				</button>
			{:else}
				<button class="add-btn" onclick={syncNow} disabled={syncing}>
					<Icon name="refresh-cw" size={14} />
					<span>{syncing ? 'Syncing…' : 'Sync now'}</span>
				</button>
			{/if}
		</div>

		{#if accountsList.length === 0}
			<div class="pad">
				<p class="empty">
					No bank linked yet. Connect SimpleFIN to pull live transactions.
				</p>
			</div>
		{:else}
			<div class="pad">
				{#each accountsList as acc, i (acc.id)}
					<div class="setting-row" class:last={i === accountsList.length - 1}>
						<span class="setting-label-block">
							<span class="setting-label">{acc.name}</span>
							<span class="setting-sub">
								{acc.institution ?? ''}{acc.institution ? ' · ' : ''}••••{acc.mask}
							</span>
						</span>
						<span class="setting-detail tabular">
							{acc.currency === 'USD' ? '$' : `${acc.currency} `}{acc.balance.toFixed(2)}
						</span>
					</div>
				{/each}
				<div class="account-meta">
					<span>Last sync · {fmtRelative(liveSettings?.lastSimpleFinSync ?? null)}</span>
					<button class="link-danger" onclick={disconnectAll} disabled={disconnectingId === '*'}>
						{disconnectingId === '*' ? 'Disconnecting…' : 'Disconnect'}
					</button>
				</div>
			</div>
		{/if}

		{#if connectMessage}
			<div class="pad"><p class="msg">{connectMessage}</p></div>
		{/if}
	</section>

	{#if dev}
		<section class="group">
			<div class="pad section-head">
				<span class="eyebrow">Developer</span>
			</div>
			<div class="pad">
				<button class="dev-btn" onclick={loadMock} disabled={seedingMock}>
					{seedingMock ? 'Loading…' : 'Load mock data'}
				</button>
				{#if seedMessage}
					<p class="seed-msg">{seedMessage}</p>
				{/if}
			</div>
		</section>
	{/if}

	<PayPeriodSheet
		open={payPeriodSheetOpen}
		settings={liveSettings}
		onClose={() => (payPeriodSheetOpen = false)}
	/>

	<CategorySheet
		open={categorySheetOpen}
		category={editingCategory}
		existingCount={cats.length}
		onClose={closeCategorySheet}
	/>

	<RuleSheet
		open={ruleSheetOpen}
		rule={editingRule}
		categories={cats.filter((c) => !c.isTransferCategory || true)}
		onClose={closeRuleSheet}
	/>

	<ConnectBankSheet
		open={connectSheetOpen}
		onClose={() => (connectSheetOpen = false)}
	/>

	<div class="pad signout-wrap">
		<button class="signout-btn" onclick={handleSignOut}>Sign out</button>
		<div class="version">Budget · v0.1.0</div>
	</div>
</div>

<style>
	.page {
		padding-bottom: 32px;
	}

	.pad {
		padding: 0 var(--side-pad);
	}

	.account {
		padding-bottom: 28px;
	}

	.account-row {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.avatar {
		width: 52px;
		height: 52px;
		border-radius: 50%;
		border: 0.5px solid var(--separator);
		background: var(--fill-1);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
		font-weight: 500;
		color: var(--text-primary);
		letter-spacing: -0.022em;
		flex-shrink: 0;
	}

	.acc-text {
		flex: 1;
		min-width: 0;
	}

	.acc-name {
		font-size: 18px;
		font-weight: 500;
		color: var(--text-primary);
		letter-spacing: -0.022em;
	}

	.acc-email {
		font-size: 13px;
		color: var(--text-secondary);
		margin-top: 2px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.group {
		margin-bottom: 28px;
	}

	.section-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 8px;
	}

	.head-left {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}

	.add-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 5px 10px;
		min-height: 28px;
		border-radius: 999px;
		background: var(--fill-1);
		color: var(--text-secondary);
		font-size: 12px;
		font-weight: 500;
		transition:
			transform 100ms var(--ease-standard),
			background-color 150ms var(--ease-standard);
	}

	.add-btn:active {
		transform: scale(0.96);
	}

	.add-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.setting-label-block {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
		min-width: 0;
	}

	.setting-sub {
		font-size: 12px;
		color: var(--text-tertiary);
	}

	.account-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 12px;
		font-size: 12px;
		color: var(--text-tertiary);
	}

	.link-danger {
		font-size: 12px;
		color: var(--danger);
		font-weight: 500;
	}

	.link-danger:disabled {
		opacity: 0.5;
	}

	.msg {
		font-size: 12px;
		color: var(--text-secondary);
		padding: 8px 0 0;
	}

	.eyebrow {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.067em;
		text-transform: uppercase;
		color: var(--text-tertiary);
	}

	.meta {
		font-size: 11px;
		color: var(--text-tertiary);
	}

	.empty {
		color: var(--text-tertiary);
		font-size: 14px;
		padding: 8px 0;
	}

	.setting-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 0;
		border-bottom: 0.5px solid var(--separator);
		min-height: 44px;
		width: 100%;
		text-align: left;
	}

	.setting-row.last {
		border-bottom: none;
	}

	.setting-row.interactive {
		transition: opacity 100ms var(--ease-standard);
	}

	.setting-row.interactive:active {
		opacity: 0.6;
	}

	.setting-label {
		flex: 1;
		font-size: 14px;
		color: var(--text-primary);
		letter-spacing: -0.007em;
	}

	.setting-detail {
		font-size: 13px;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.text-link {
		font-size: 13px;
		color: var(--text-primary);
		font-weight: 500;
	}

	.dev-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 9px 16px;
		min-height: 36px;
		border-radius: 999px;
		background: var(--fill-1);
		color: var(--text-primary);
		font-size: 13px;
		font-weight: 500;
		border: 0.5px solid var(--separator);
	}

	.dev-btn:disabled {
		opacity: 0.5;
	}

	.seed-msg {
		margin-top: 8px;
		font-size: 12px;
		color: var(--text-tertiary);
	}

	.signout-wrap {
		padding-top: 12px;
	}

	.signout-btn {
		width: 100%;
		padding: 13px 0;
		border: 0.5px solid var(--separator);
		border-radius: var(--radius-card);
		background: transparent;
		color: var(--danger);
		font-size: 14px;
		font-weight: 500;
		letter-spacing: -0.007em;
	}

	.version {
		text-align: center;
		margin-top: 18px;
		font-size: 11px;
		color: var(--text-tertiary);
		font-weight: 500;
	}
</style>
