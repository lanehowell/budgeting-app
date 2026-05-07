<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Props = HTMLButtonAttributes & {
		padding?: number | string;
		radius?: number | string;
		interactive?: boolean;
		children: Snippet;
	};

	let {
		padding = 16,
		radius,
		interactive = false,
		children,
		class: className = '',
		onclick,
		...rest
	}: Props = $props();

	let padCss = $derived(typeof padding === 'number' ? `${padding}px` : padding);
	let radiusCss = $derived(
		radius === undefined
			? 'var(--radius-card)'
			: typeof radius === 'number'
				? `${radius}px`
				: radius
	);
</script>

{#if interactive || onclick}
	<button
		type="button"
		class="card interactive {className}"
		style:padding={padCss}
		style:border-radius={radiusCss}
		{onclick}
		{...rest}
	>
		{@render children()}
	</button>
{:else}
	<div
		class="card {className}"
		style:padding={padCss}
		style:border-radius={radiusCss}
	>
		{@render children()}
	</div>
{/if}

<style>
	.card {
		background: var(--card);
		text-align: left;
		color: inherit;
		font: inherit;
	}

	.card.interactive {
		display: block;
		width: 100%;
		border: 0;
		cursor: pointer;
		transition:
			transform 100ms var(--ease-standard),
			background-color 150ms var(--ease-standard);
	}

	.card.interactive:active {
		transform: scale(0.99);
	}
</style>
