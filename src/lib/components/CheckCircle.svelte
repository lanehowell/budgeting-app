<script lang="ts">
	import Icon from './Icon.svelte';

	type Props = {
		checked: boolean;
		onClick?: () => void;
		ariaLabel?: string;
	};

	let { checked, onClick, ariaLabel = 'Toggle paid' }: Props = $props();
</script>

{#if checked}
	<button
		type="button"
		class="circle filled"
		onclick={(e) => {
			e.stopPropagation();
			onClick?.();
		}}
		aria-label={ariaLabel}
		aria-pressed="true"
	>
		<span class="check"><Icon name="check" size={12} strokeWidth={2.25} /></span>
	</button>
{:else}
	<button
		type="button"
		class="circle empty"
		onclick={(e) => {
			e.stopPropagation();
			onClick?.();
		}}
		aria-label={ariaLabel}
		aria-pressed="false"
	></button>
{/if}

<style>
	.circle {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		flex-shrink: 0;
		padding: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition:
			background-color 150ms var(--ease-standard),
			border-color 150ms var(--ease-standard),
			transform 100ms var(--ease-standard);
	}

	.circle:active {
		transform: scale(0.92);
	}

	.empty {
		background: transparent;
		border: 1.8px solid var(--separator-strong);
	}

	.empty:hover {
		border-color: var(--text-secondary);
	}

	.filled {
		background: var(--success);
		color: #ffffff;
		border: none;
	}

	.check {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: #ffffff;
	}
</style>
