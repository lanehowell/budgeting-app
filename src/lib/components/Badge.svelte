<script lang="ts">
	type Variant = 'paid' | 'due-soon' | 'overdue' | 'pending' | 'uncategorized' | 'neutral';

	type Props = {
		variant: Variant;
		children: import('svelte').Snippet;
	};

	let { variant, children }: Props = $props();
</script>

<span class="badge caption" data-variant={variant}>
	{@render children()}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 10px;
		border-radius: 999px;
		font-weight: 600;
		letter-spacing: 0.01em;
		white-space: nowrap;
	}

	.badge[data-variant='paid'] {
		background: color-mix(in srgb, var(--success) 14%, transparent);
		color: var(--success);
	}
	.badge[data-variant='due-soon'] {
		background: color-mix(in srgb, var(--warning) 14%, transparent);
		color: var(--warning);
	}
	.badge[data-variant='overdue'] {
		background: color-mix(in srgb, var(--danger) 14%, transparent);
		color: var(--danger);
	}
	.badge[data-variant='pending'] {
		background: color-mix(in srgb, var(--text-tertiary) 18%, transparent);
		color: var(--text-secondary);
	}
	.badge[data-variant='uncategorized'] {
		background: color-mix(in srgb, var(--accent) 14%, transparent);
		color: var(--accent);
	}
	.badge[data-variant='neutral'] {
		background: var(--bg-secondary);
		color: var(--text-secondary);
	}
</style>
