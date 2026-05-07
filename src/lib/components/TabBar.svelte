<script lang="ts">
	import { page } from '$app/stores';
	import Icon from './Icon.svelte';

	const tabs = [
		{ href: '/bills', label: 'Bills', icon: 'receipt' },
		{ href: '/transactions', label: 'Activity', icon: 'list' },
		{ href: '/spending', label: 'Spending', icon: 'bar-chart' },
		{ href: '/profile', label: 'Profile', icon: 'user' }
	];

	function isActive(href: string, pathname: string): boolean {
		if (href === '/bills' && pathname === '/') return true;
		return pathname === href || pathname.startsWith(href + '/');
	}
</script>

<nav class="tab-bar" aria-label="Primary">
	<div class="grid">
		{#each tabs as tab (tab.href)}
			{@const active = isActive(tab.href, $page.url.pathname)}
			<a
				href={tab.href}
				class="tab"
				class:active
				aria-current={active ? 'page' : undefined}
				data-sveltekit-noscroll
			>
				<Icon name={tab.icon} size={22} strokeWidth={active ? 2 : 1.5} />
				<span class="label">{tab.label}</span>
			</a>
		{/each}
	</div>
</nav>

<style>
	.tab-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		padding-top: 2px;
		padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 2px);
		background: var(--bg-primary);
		border-top: 0.5px solid var(--separator);
		z-index: 100;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		max-width: 720px;
		margin: 0 auto;
		padding: 4px 0;
	}

	.tab {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		padding: 4px 0;
		min-height: 40px;
		color: var(--text-tertiary);
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.01em;
		transition: color 150ms var(--ease-standard);
	}

	.tab.active {
		color: var(--text-primary);
		font-weight: 600;
	}

	.label {
		line-height: 1;
	}

	@media (min-width: 1024px) {
		.tab-bar {
			top: 0;
			right: auto;
			width: 220px;
			height: 100vh;
			padding-top: 32px;
			padding-bottom: 32px;
			background: var(--bg-primary);
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
			border-top: none;
			border-right: 0.5px solid var(--separator);
		}

		.grid {
			grid-template-columns: 1fr;
			gap: 4px;
			padding: 0 12px;
		}

		.tab {
			flex-direction: row;
			justify-content: flex-start;
			gap: 12px;
			padding: 10px 14px;
			border-radius: var(--radius-card);
			font-size: 14px;
		}

		.tab.active {
			background: var(--fill-1);
			font-weight: 500;
		}
	}
</style>
