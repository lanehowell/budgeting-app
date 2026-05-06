<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	type Props = {
		open: boolean;
		onClose: () => void;
		title?: string;
		children: import('svelte').Snippet;
	};

	let { open, onClose, title, children }: Props = $props();

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) onClose();
	}
</script>

<svelte:window onkeydown={onKeyDown} />

{#if open}
	<div
		class="overlay"
		role="presentation"
		onclick={onClose}
		onkeydown={() => {}}
		transition:fade={{ duration: 200 }}
	></div>
	<div
		class="sheet"
		role="dialog"
		aria-modal="true"
		aria-label={title ?? 'Sheet'}
		transition:fly={{ y: '100%', duration: 320, easing: cubicOut }}
	>
		<div class="handle" aria-hidden="true"></div>
		{@render children()}
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.36);
		z-index: 200;
	}

	.sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		background: var(--bg-elevated);
		border-radius: var(--radius-modal) var(--radius-modal) 0 0;
		padding: 22px var(--side-pad) calc(24px + env(safe-area-inset-bottom, 0px));
		box-shadow: var(--shadow-modal);
		max-height: 92dvh;
		overflow-y: auto;
		z-index: 201;
		max-width: 720px;
		margin: 0 auto;
		border-top: 0.5px solid var(--separator);
	}

	.handle {
		width: 36px;
		height: 4px;
		border-radius: 999px;
		background: var(--text-quaternary);
		margin: -8px auto 16px;
	}

	@media (min-width: 1024px) {
		.sheet {
			left: 220px;
			max-width: calc(720px + 220px);
		}
	}
</style>
