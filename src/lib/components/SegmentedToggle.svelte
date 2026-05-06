<script lang="ts" generics="T extends string">
	type Option = { value: T; label: string };

	type Props = {
		value: T;
		options: Option[];
		onChange: (v: T) => void;
		ariaLabel?: string;
	};

	let { value, options, onChange, ariaLabel }: Props = $props();

	let idx = $derived(options.findIndex((o) => o.value === value));
</script>

<div class="seg" role="tablist" aria-label={ariaLabel}>
	<div
		class="thumb"
		style="left: calc({(idx * 100) / options.length}% + 2px); width: calc({100 / options.length}% - 4px);"
	></div>
	{#each options as opt (opt.value)}
		{@const active = opt.value === value}
		<button
			role="tab"
			aria-selected={active}
			class="opt"
			class:active
			onclick={() => onChange(opt.value)}
		>
			{opt.label}
		</button>
	{/each}
</div>

<style>
	.seg {
		position: relative;
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		padding: 2px;
		background: var(--fill-1);
		border-radius: 9px;
		height: 32px;
	}

	.thumb {
		position: absolute;
		top: 2px;
		bottom: 2px;
		background: var(--bg-tertiary);
		border-radius: 7px;
		box-shadow:
			0 1px 2px rgba(0, 0, 0, 0.08),
			0 0 0 0.5px rgba(0, 0, 0, 0.04);
		transition: left 220ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	:global([data-theme='dark']) .thumb {
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
	}

	.opt {
		position: relative;
		z-index: 1;
		font-size: 13px;
		font-weight: 500;
		color: var(--text-secondary);
		transition:
			color 180ms var(--ease-standard),
			font-weight 180ms var(--ease-standard);
		min-height: 28px;
	}

	.opt.active {
		color: var(--text-primary);
		font-weight: 600;
	}
</style>
