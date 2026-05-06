<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'destructive';
	type Size = 'md' | 'lg';

	type Props = HTMLButtonAttributes & {
		variant?: Variant;
		size?: Size;
		fullWidth?: boolean;
		children: import('svelte').Snippet;
	};

	let {
		variant = 'primary',
		size = 'md',
		fullWidth = false,
		children,
		type = 'button',
		class: className = '',
		...rest
	}: Props = $props();
</script>

<button
	{type}
	class="btn {className}"
	data-variant={variant}
	data-size={size}
	class:full={fullWidth}
	{...rest}
>
	{@render children()}
</button>

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		font-size: 17px;
		line-height: 22px;
		font-weight: 600;
		border-radius: 999px;
		min-height: 44px;
		transition:
			transform 100ms var(--ease-standard),
			background-color 150ms var(--ease-standard),
			color 150ms var(--ease-standard),
			opacity 150ms var(--ease-standard);
	}

	.btn[data-size='md'] {
		padding: 10px 20px;
	}

	.btn[data-size='lg'] {
		padding: 14px 28px;
		font-size: 17px;
	}

	.btn.full {
		width: 100%;
	}

	.btn[data-variant='primary'] {
		background: var(--accent);
		color: #ffffff;
	}

	.btn[data-variant='secondary'] {
		background: transparent;
		color: var(--accent);
	}

	.btn[data-variant='destructive'] {
		background: transparent;
		color: var(--danger);
	}

	.btn:active:not(:disabled) {
		transform: scale(0.96);
	}

	.btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
