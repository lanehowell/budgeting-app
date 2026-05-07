<script lang="ts">
	import { goto } from '$app/navigation';
	import { dev } from '$app/environment';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Card from '$lib/components/Card.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Switch from '$lib/components/Switch.svelte';
	import PayPeriodSheet from '$lib/components/PayPeriodSheet.svelte';
	import CategorySheet from '$lib/components/CategorySheet.svelte';
	import RuleSheet from '$lib/components/RuleSheet.svelte';
	import ConnectBankSheet from '$lib/components/ConnectBankSheet.svelte';
	import { categories } from '$lib/data/categories';
	import { merchantRules } from '$lib/data/merchantRules';
	import { settings as settingsStore } from '$lib/data/settings';
	import { bills } from '$lib/data/bills';
	import { billPayments } from '$lib/data/billPayments';
	import { transactions } from '$lib/data/transactions';
	import { accounts as accountsStore, simpleFinDisconnect, simpleFinSync } from '$lib/data/accounts';
	import type { AccountDoc } from '$lib/data/accounts';
	import { authState, signOut } from '$lib/firebase/auth';
	import { theme, type ThemeChoice } from '$lib/stores/theme';
	import { accent, ACCENT_OPTIONS, type AccentChoice } from '$lib/stores/accent';
	import { seedMockData, clearMockData } from '$lib/dev/seedMock';
	import { getCurrentPeriod } from '$lib/utils/payPeriod';
	import type {
		Bill,
		BillPayment,
		Category,
		MerchantRule,
		Settings,
		Transaction
	} from '$lib/types';

	let cats = $state<(Category & { id: string })[]>([]);
	let rules = $state<(MerchantRule & { id: string })[]>([]);
	let user = $state<import('firebase/auth').User | null>(null);
	let liveSettings = $state<(Settings & { id: string }) | null>(null);
	let accountsList = $state<(AccountDoc & { id: string })[]>([]);
	let billsList = $state<(Bill & { id: string })[]>([]);
	let payments = $state<(BillPayment & { id: string })[]>([]);
	let txList = $state<(Transaction & { id: string })[]>([]);

	$effect(() => categories.subscribe((v) => (cats = v as typeof cats)));
	$effect(() => merchantRules.subscribe((v) => (rules = v as typeof rules)));
	$effect(() => authState.subscribe((s) => (user = s.user)));
	$effect(() => settingsStore.subscribe((v) => (liveSettings = v)));
	$effect(() => accountsStore.subscribe((v) => (accountsList = v as typeof accountsList)));
	$effect(() => bills.subscribe((v) => (billsList = v as typeof billsList)));
	$effect(() => billPayments.subscribe((v) => (payments = v as typeof payments)));
	$effect(() => transactions.subscribe((v) => (txList = v as typeof txList)));

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
		if (
			!confirm(
				'Disconnect SimpleFIN? This removes connected accounts but keeps your transactions.'
			)
		) {
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

	let accentChoice = $state<AccentChoice>('blue');
	$effect(() => accent.choice.subscribe((v) => (accentChoice = v)));

	const ACCENT_SWATCHES: Record<AccentChoice, string> = {
		mono: 'var(--text-primary)',
		blue: '#3b5fff',
		green: '#30d158',
		plum: '#bf5af2',
		amber: '#ff9500',
		teal: '#32ade6',
		rose: '#ff3b30'
	};

	let initials = $derived.by(() => {
		const name = user?.displayName ?? user?.email ?? '';
		const parts = name.split(/[\s@.]+/).filter(Boolean);
		if (parts.length === 0) return '?';
		if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
		return ((parts[0][0] ?? '') + (parts[1][0] ?? '')).toUpperCase();
	});

	// ─── Stat tiles ─────────────────────────────────────────────────────
	function inCurrentPeriod(iso: string): boolean {
		const t = new Date(iso).getTime();
		return (
			t >= payPeriod.start.getTime() && t <= payPeriod.end.getTime() + 86399999
		);
	}

	let spentThisPeriod = $derived.by(() => {
		let sum = 0;
		for (const tx of txList) {
			if (tx.amount >= 0) continue;
			if (!tx.categoryId) continue;
			const cat = categoryById.get(tx.categoryId);
			if (!cat || cat.excludeFromSpending || cat.isTransferCategory) continue;
			if (!inCurrentPeriod(tx.postedDate)) continue;
			sum += Math.abs(tx.amount);
		}
		return sum;
	});

	let billsPaidStats = $derived.by(() => {
		const activeBills = billsList.filter((b) => b.isActive);
		const paidIds = new Set(
			payments.filter((p) => p.periodKey === payPeriod.key).map((p) => p.billId)
		);
		const paidCount = activeBills.filter((b) => paidIds.has(b.id)).length;
		return { paid: paidCount, total: activeBills.length };
	});

	let categorizedStats = $derived.by(() => {
		const total = txList.length;
		const cat = txList.filter((t) => t.categoryId !== null).length;
		return { cat, total };
	});

	function fmtWhole(n: number): string {
		return `$${Math.round(n).toLocaleString('en-US')}`;
	}

	let seedingMock = $state(false);
	let clearingMock = $state(false);
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

	async function clearMock() {
		if (
			!confirm(
				'Remove all mock-seeded transactions, bills, categories, and rules? Real data is unaffected.'
			)
		) {
			return;
		}
		clearingMock = true;
		seedMessage = null;
		try {
			const result = await clearMockData();
			seedMessage = `Cleared ${result.deleted} mock records.`;
		} catch (e) {
			console.error(e);
			seedMessage = e instanceof Error ? e.message : 'Failed to clear.';
		} finally {
			clearingMock = false;
		}
	}

	async function handleSignOut() {
		await signOut();
		goto('/login', { replaceState: true });
	}
</script>

<div class="page">
	<div class="pad">
		<PageHeader title="Settings" />
	</div>

	<!-- Hero card: avatar + name + email -->
	<div class="pad section">
		<Card padding={16}>
			<div class="hero-row">
				{#if user?.photoURL}
					<img class="avatar avatar-img" src={user.photoURL} alt="" referrerpolicy="no-referrer" />
				{:else}
					<div class="avatar avatar-gradient">{initials}</div>
				{/if}
				<div class="hero-text">
					<div class="hero-name">{user?.displayName ?? 'You'}</div>
					<div class="hero-email">{user?.email ?? ''}</div>
				</div>
			</div>
		</Card>
	</div>

	<!-- Stat tiles -->
	<div class="pad section">
		<div class="stat-grid">
			<Card padding={12}>
				<div class="stat-label">Spent</div>
				<div class="stat-value tabular">{fmtWhole(spentThisPeriod)}</div>
			</Card>
			<Card padding={12}>
				<div class="stat-label">Bills paid</div>
				<div class="stat-value success tabular">
					{billsPaidStats.paid}<span class="stat-frac">/{billsPaidStats.total}</span>
				</div>
			</Card>
			<Card padding={12}>
				<div class="stat-label">Categorized</div>
				<div class="stat-value tabular">
					{categorizedStats.cat}<span class="stat-frac">/{categorizedStats.total}</span>
				</div>
			</Card>
		</div>
	</div>

	<!-- Preferences -->
	<section class="section">
		<div class="pad section-head"><span class="lab">Preferences</span></div>
		<div class="pad">
			<Card padding={0}>
				<div class="grow-rows">
					<div class="g-row">
						<div class="g-icon" style:background="#1c1c1e"><Icon name="moon" size={16} strokeWidth={2} /></div>
						<span class="g-label">Dark mode</span>
						<Switch value={darkOn} onChange={toggleDark} ariaLabel="Dark mode" />
					</div>
					<div class="g-row">
						<div class="g-icon" style:background="#5856d6"><Icon name="monitor" size={16} strokeWidth={2} /></div>
						<span class="g-label">Match system theme</span>
						<button
							class="g-link"
							onclick={setSystemTheme}
							aria-pressed={themeChoice === 'system'}
						>
							{themeChoice === 'system' ? 'On' : 'Use system'}
						</button>
					</div>
					<div class="g-row last">
						<div class="g-icon" style:background="var(--accent)">
							<Icon name="bolt" size={16} strokeWidth={2} />
						</div>
						<span class="g-label">Accent</span>
						<div class="accent-swatches">
							{#each ACCENT_OPTIONS as opt (opt)}
								<button
									class="accent-opt"
									class:selected={accentChoice === opt}
									class:mono={opt === 'mono'}
									aria-label="Accent {opt}"
									aria-pressed={accentChoice === opt}
									style="--swatch: {ACCENT_SWATCHES[opt]}"
									onclick={() => accent.set(opt)}
								></button>
							{/each}
						</div>
					</div>
				</div>
			</Card>
		</div>
	</section>

	<!-- Pay period -->
	<section class="section">
		<div class="pad section-head"><span class="lab">Pay schedule</span></div>
		<div class="pad">
			<Card padding={0}>
				<div class="grow-rows">
					<button class="g-row interactive" onclick={() => (payPeriodSheetOpen = true)}>
						<div class="g-icon" style:background="#34c759"><Icon name="wallet" size={16} strokeWidth={2} /></div>
						<span class="g-label">Schedule</span>
						<span class="g-detail">{ppLabels[payPeriod.type] ?? 'Monthly'}</span>
						<Icon name="chevron-right" size={16} strokeWidth={2} />
					</button>
					<div class="g-row last">
						<div class="g-icon" style:background="#5ac8fa"><Icon name="bar-chart" size={16} strokeWidth={2} /></div>
						<span class="g-label">Period range</span>
						<span class="g-detail tabular">{payPeriod.label.long}</span>
					</div>
				</div>
			</Card>
		</div>
	</section>

	<!-- Categories -->
	<section class="section">
		<div class="pad section-head">
			<span class="lab">Categories · {cats.length}</span>
			<button class="add-btn" onclick={openAddCategory} aria-label="Add category">
				<Icon name="plus" size={14} strokeWidth={2} />
				<span>Add</span>
			</button>
		</div>
		<div class="pad">
			{#if cats.length === 0}
				<Card padding={20}><p class="empty">No categories yet.</p></Card>
			{:else}
				<Card padding={0}>
					<div class="grow-rows">
						{#each [...cats].sort((a, b) => a.sortOrder - b.sortOrder) as cat, i (cat.id)}
							<button
								class="g-row interactive"
								class:last={i === cats.length - 1}
								onclick={() => openEditCategory(cat)}
							>
								<span
									class="g-icon"
									style:background="{cat.color}22"
									style:color={cat.color}
								>
									<Icon name={cat.icon} size={16} strokeWidth={2} />
								</span>
								<span class="g-label">{cat.name}</span>
								{#if cat.excludeFromSpending}
									<span class="g-detail">excluded</span>
								{/if}
								<Icon name="chevron-right" size={16} strokeWidth={2} />
							</button>
						{/each}
					</div>
				</Card>
			{/if}
		</div>
	</section>

	<!-- Merchant rules -->
	<section class="section">
		<div class="pad section-head">
			<span class="lab">Merchant rules · {rules.length}</span>
			<button class="add-btn" onclick={openAddRule} aria-label="Add merchant rule">
				<Icon name="plus" size={14} strokeWidth={2} />
				<span>Add</span>
			</button>
		</div>
		<div class="pad">
			{#if rules.length === 0}
				<Card padding={20}><p class="empty">No rules yet.</p></Card>
			{:else}
				<Card padding={0}>
					<div class="grow-rows">
						{#each rules as rule, i (rule.id)}
							{@const cat = categoryById.get(rule.categoryId)}
							<button
								class="g-row interactive"
								class:last={i === rules.length - 1}
								onclick={() => openEditRule(rule)}
							>
								<div class="g-icon" style:background="#ff9500"><Icon name="tag" size={16} strokeWidth={2} /></div>
								<span class="g-label-block">
									<span class="g-label">{rule.displayName}</span>
									<span class="g-sub">
										{rule.matchType} "{rule.pattern}" → {cat?.name ?? '—'}
									</span>
								</span>
								<Icon name="chevron-right" size={16} strokeWidth={2} />
							</button>
						{/each}
					</div>
				</Card>
			{/if}
		</div>
	</section>

	<!-- Connected accounts -->
	<section class="section">
		<div class="pad section-head">
			<span class="lab">Connected accounts · {accountsList.length}</span>
			{#if accountsList.length === 0}
				<button class="add-btn" onclick={() => (connectSheetOpen = true)}>
					<Icon name="plus" size={14} strokeWidth={2} />
					<span>Connect</span>
				</button>
			{:else}
				<button class="add-btn" onclick={syncNow} disabled={syncing}>
					<Icon name="refresh-cw" size={14} strokeWidth={2} />
					<span>{syncing ? 'Syncing…' : 'Sync'}</span>
				</button>
			{/if}
		</div>

		<div class="pad">
			{#if accountsList.length === 0}
				<Card padding={20}>
					<p class="empty">No bank linked yet. Connect SimpleFIN to pull live transactions.</p>
				</Card>
			{:else}
				<Card padding={0}>
					<div class="grow-rows">
						{#each accountsList as acc, i (acc.id)}
							<div class="g-row" class:last={i === accountsList.length - 1 && !connectMessage}>
								<div class="g-icon" style:background="#3b5fff"><Icon name="wallet" size={16} strokeWidth={2} /></div>
								<span class="g-label-block">
									<span class="g-label">{acc.name}</span>
									<span class="g-sub">
										{acc.institution ?? ''}{acc.institution ? ' · ' : ''}••••{acc.mask}
									</span>
								</span>
								<span class="g-detail tabular">
									{acc.currency === 'USD' ? '$' : `${acc.currency} `}{acc.balance.toFixed(2)}
								</span>
							</div>
						{/each}
					</div>
				</Card>
				<div class="account-meta">
					<span>
						Last sync · {fmtRelative(liveSettings?.lastSimpleFinSync ?? null)}
						<span class="auto-tag">· auto-sync daily 6am PT</span>
					</span>
					<button class="link-danger" onclick={disconnectAll} disabled={disconnectingId === '*'}>
						{disconnectingId === '*' ? 'Disconnecting…' : 'Disconnect'}
					</button>
				</div>
			{/if}

			{#if connectMessage}
				<p class="msg">{connectMessage}</p>
			{/if}
		</div>
	</section>

	<!-- Maintenance -->
	<section class="section">
		<div class="pad section-head"><span class="lab">Maintenance</span></div>
		<div class="pad">
			<Card padding={14}>
				<div class="dev-row">
					{#if dev}
						<button class="dev-btn" onclick={loadMock} disabled={seedingMock || clearingMock}>
							{seedingMock ? 'Loading…' : 'Load mock data'}
						</button>
					{/if}
					<button class="dev-btn danger" onclick={clearMock} disabled={seedingMock || clearingMock}>
						{clearingMock ? 'Clearing…' : 'Clear mock data'}
					</button>
				</div>
				{#if seedMessage}
					<p class="seed-msg">{seedMessage}</p>
				{/if}
			</Card>
		</div>
	</section>

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

	<ConnectBankSheet open={connectSheetOpen} onClose={() => (connectSheetOpen = false)} />

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

	.section {
		margin-bottom: 18px;
	}

	.section-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 14px;
		padding-bottom: 10px;
	}

	.lab {
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	/* ── Hero ──────────────────────────────────────────────────────── */
	.hero-row {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.avatar {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		font-size: 22px;
		font-weight: 700;
		color: #ffffff;
		letter-spacing: -0.5px;
	}

	.avatar-img {
		object-fit: cover;
		display: block;
	}

	.avatar-gradient {
		background: linear-gradient(135deg, var(--accent), oklch(0.65 0.18 250));
	}

	.hero-text {
		flex: 1;
		min-width: 0;
	}

	.hero-name {
		font-size: 17px;
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: -0.013em;
	}

	.hero-email {
		font-size: 13px;
		color: var(--text-secondary);
		margin-top: 2px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ── Stat tiles ────────────────────────────────────────────────── */
	.stat-grid {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 8px;
	}

	.stat-label {
		font-size: 11px;
		color: var(--text-tertiary);
		font-weight: 600;
		letter-spacing: 0.4px;
		text-transform: uppercase;
	}

	.stat-value {
		font-size: 17px;
		font-weight: 700;
		color: var(--text-primary);
		letter-spacing: -0.013em;
		margin-top: 2px;
	}

	.stat-value.success {
		color: var(--success);
	}

	.stat-frac {
		font-size: 13px;
		font-weight: 500;
		color: var(--text-tertiary);
	}

	/* ── Grouped rows inside Cards ─────────────────────────────────── */
	.grow-rows {
		display: flex;
		flex-direction: column;
	}

	.g-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 11px 14px;
		border-bottom: 0.5px solid var(--separator);
		min-height: 44px;
		width: 100%;
		text-align: left;
		background: transparent;
		color: inherit;
		font: inherit;
	}

	.g-row.last {
		border-bottom: none;
	}

	.g-row.interactive {
		cursor: pointer;
		transition: background-color 100ms var(--ease-standard);
	}

	.g-row.interactive:active {
		background: var(--fill-1);
	}

	.g-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border-radius: 8px;
		color: #ffffff;
		flex-shrink: 0;
	}

	.g-label {
		flex: 1;
		font-size: 15px;
		font-weight: 500;
		color: var(--text-primary);
		letter-spacing: -0.01em;
	}

	.g-label-block {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
		min-width: 0;
	}

	.g-label-block .g-label {
		flex: none;
	}

	.g-sub {
		font-size: 12px;
		color: var(--text-tertiary);
	}

	.g-detail {
		font-size: 14px;
		color: var(--text-secondary);
	}

	.g-link {
		font-size: 13px;
		color: var(--accent);
		font-weight: 500;
	}

	/* ── Add button + danger / link ────────────────────────────────── */
	.add-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 5px 10px;
		min-height: 28px;
		border-radius: 999px;
		background: var(--card);
		color: var(--accent);
		font-size: 12px;
		font-weight: 600;
		transition: transform 100ms var(--ease-standard);
	}

	.add-btn:active {
		transform: scale(0.96);
	}

	.add-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.empty {
		color: var(--text-secondary);
		font-size: 14px;
		text-align: center;
	}

	.account-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 10px;
		font-size: 12px;
		color: var(--text-tertiary);
	}

	.auto-tag {
		color: var(--text-quaternary);
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

	/* ── Accent picker ─────────────────────────────────────────────── */
	.accent-swatches {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.accent-opt {
		width: 24px;
		height: 24px;
		border-radius: 999px;
		border: 2px solid transparent;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		transition:
			border-color 150ms var(--ease-standard),
			transform 100ms var(--ease-standard);
	}

	.accent-opt::after {
		content: '';
		width: 16px;
		height: 16px;
		border-radius: 999px;
		background: var(--swatch);
		box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.12);
	}

	.accent-opt.mono::after {
		background: linear-gradient(135deg, var(--text-primary) 50%, var(--text-tertiary) 50%);
	}

	.accent-opt.selected {
		border-color: var(--text-primary);
	}

	.accent-opt:active:not(.selected) {
		transform: scale(0.92);
	}

	/* ── Maintenance ───────────────────────────────────────────────── */
	.dev-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
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

	.dev-btn.danger {
		color: var(--danger);
	}

	.dev-btn:disabled {
		opacity: 0.5;
	}

	.seed-msg {
		margin-top: 8px;
		font-size: 12px;
		color: var(--text-tertiary);
	}

	/* ── Sign out / version ────────────────────────────────────────── */
	.signout-wrap {
		padding-top: 4px;
	}

	.signout-btn {
		width: 100%;
		padding: 13px 0;
		border-radius: var(--radius-card);
		background: var(--card);
		color: var(--danger);
		font-size: 15px;
		font-weight: 500;
		letter-spacing: -0.01em;
		transition: opacity 100ms var(--ease-standard);
	}

	.signout-btn:active {
		opacity: 0.7;
	}

	.version {
		text-align: center;
		margin-top: 18px;
		font-size: 11px;
		color: var(--text-tertiary);
		font-weight: 500;
	}
</style>
