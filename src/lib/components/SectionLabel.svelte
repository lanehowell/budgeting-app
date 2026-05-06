<script lang="ts">
	type Props = {
		label: string;
		tone?: 'default' | 'danger';
		count?: number | string;
		accessory?: string;
	};

	let { label, tone = 'default', count, accessory }: Props = $props();
</script>

<div class="section-label">
	<div class="left">
		<span class="lab" data-tone={tone}>{label}</span>
		{#if count !== undefined}
			<span class="count tabular">{count}</span>
		{/if}
	</div>
	{#if accessory}
		<div class="acc tabular">{accessory}</div>
	{/if}
</div>

<style>
	.section-label {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding: 0 0 10px;
	}

	.left {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}

	.lab {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.067em;
		text-transform: uppercase;
		color: var(--text-tertiary);
	}

	.lab[data-tone='danger'] {
		color: var(--danger);
	}

	.count {
		font-size: 11px;
		font-weight: 500;
		color: var(--text-tertiary);
	}

	.acc {
		font-size: 12px;
		color: var(--text-tertiary);
		font-weight: 500;
	}
</style>
