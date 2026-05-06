<script lang="ts">
	import '../app.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import TabBar from '$lib/components/TabBar.svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { authState } from '$lib/firebase/auth';
	import { ensureSeed } from '$lib/firebase/seed';

	let { children } = $props();

	let user = $state<import('firebase/auth').User | null>(null);
	let authLoading = $state(true);

	$effect(() => {
		const unsub = authState.subscribe((s) => {
			user = s.user;
			authLoading = s.loading;
		});
		return unsub;
	});

	$effect(() => {
		const path = $page.url.pathname;
		if (authLoading) return;
		if (!user && path !== '/login') {
			goto('/login', { replaceState: true });
		} else if (user && path === '/login') {
			goto('/bills', { replaceState: true });
		}
	});

	$effect(() => {
		if (user) {
			void ensureSeed(user.uid);
		}
	});

	let isLoginRoute = $derived($page.url.pathname === '/login');
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if authLoading}
	<div class="boot">
		<div class="spinner" aria-label="Loading"></div>
	</div>
{:else if isLoginRoute}
	{@render children()}
{:else if user}
	<div class="app">
		<main class="content">
			{@render children()}
		</main>
		<TabBar />
	</div>
{:else}
	<div class="boot"></div>
{/if}

<style>
	.app {
		min-height: 100dvh;
		min-height: 100vh;
		background: var(--bg-primary);
	}

	.content {
		max-width: 720px;
		margin: 0 auto;
		padding-top: 24px;
		padding-bottom: calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0px) + 32px);
	}

	@media (min-width: 1024px) {
		.content {
			margin-left: 220px;
			max-width: none;
			padding-bottom: 48px;
			width: calc(100% - 220px);
			padding-left: 0;
			padding-right: 0;
		}
	}

	.boot {
		min-height: 100dvh;
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-primary);
	}

	.spinner {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: 3px solid var(--separator);
		border-top-color: var(--accent);
		animation: spin 700ms linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
