<script lang="ts">
	import { page } from '$app/stores';
	import Icon from './Icon.svelte';

	const tabs = [
		{ href: '/bills', label: 'Bills', icon: 'receipt' },
		{ href: '/transactions', label: 'Transactions', icon: 'list' },
		{ href: '/spending', label: 'Spending', icon: 'pie-chart' },
		{ href: '/profile', label: 'Profile', icon: 'user' }
	];

	function isActive(href: string, pathname: string): boolean {
		if (href === '/bills' && pathname === '/') return true;
		return pathname === href || pathname.startsWith(href + '/');
	}
</script>

<nav class="tab-bar" aria-label="Primary">
	{#each tabs as tab (tab.href)}
		{@const active = isActive(tab.href, $page.url.pathname)}
		<a
			href={tab.href}
			class="tab"
			class:active
			aria-current={active ? 'page' : undefined}
			data-sveltekit-noscroll
		>
			<Icon name={tab.icon} size={24} strokeWidth={active ? 2.25 : 1.75} />
			<span class="label">{tab.label}</span>
		</a>
	{/each}
</nav>

<style>
	.tab-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		justify-content: space-around;
		align-items: stretch;
		height: calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0px));
		padding-bottom: env(safe-area-inset-bottom, 0px);
		background: var(--bg-elevated);
		border-top: 1px solid var(--separator);
		z-index: 100;
	}

	.tab {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		padding: 8px 4px;
		color: var(--text-tertiary);
		font-size: 11px;
		line-height: 14px;
		font-weight: 500;
		min-height: 44px;
		transition: color 150ms var(--ease-standard);
	}

	.tab.active {
		color: var(--accent);
		font-weight: 600;
	}

	.label {
		letter-spacing: 0.01em;
	}

	@media (min-width: 1024px) {
		.tab-bar {
			position: fixed;
			top: 0;
			right: auto;
			bottom: 0;
			left: 0;
			width: 240px;
			height: 100vh;
			padding-bottom: 0;
			padding-top: 32px;
			flex-direction: column;
			justify-content: flex-start;
			align-items: stretch;
			gap: 4px;
			border-top: none;
			border-right: 1px solid var(--separator);
		}

		.tab {
			flex: 0 0 auto;
			flex-direction: row;
			justify-content: flex-start;
			gap: 12px;
			padding: 12px 16px;
			margin: 0 12px;
			border-radius: var(--radius-card);
			font-size: 15px;
			line-height: 20px;
		}

		.tab.active {
			background: color-mix(in srgb, var(--accent) 12%, transparent);
		}
	}
</style>
