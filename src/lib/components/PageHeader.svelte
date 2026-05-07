<script lang="ts">
	type Props = {
		title: string;
		subtitle?: string;
		/** @deprecated use `subtitle` for descriptive text below the title. */
		eyebrow?: string;
		actions?: import('svelte').Snippet;
	};

	let { title, subtitle, eyebrow, actions }: Props = $props();

	// Back-compat: existing pages still pass `eyebrow={...}`. Treat it as a
	// subtitle (rendered below title) per the new design.
	let sub = $derived(subtitle ?? eyebrow);
</script>

<header class="page-header">
	<div class="row">
		<div class="text-block">
			<h1 class="title">{title}</h1>
			{#if sub}
				<div class="subtitle">{sub}</div>
			{/if}
		</div>
		{#if actions}
			<div class="actions">{@render actions()}</div>
		{/if}
	</div>
</header>

<style>
	.page-header {
		padding: 18px 0 14px;
	}

	.row {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 12px;
	}

	.text-block {
		min-width: 0;
		flex: 1 1 auto;
	}

	.title {
		font-size: 32px;
		line-height: 1.1;
		font-weight: 700;
		letter-spacing: -0.025em;
		color: var(--text-primary);
	}

	.subtitle {
		margin-top: 4px;
		font-size: 14px;
		font-weight: 500;
		color: var(--text-secondary);
		letter-spacing: -0.005em;
	}

	.actions {
		display: flex;
		gap: 6px;
		align-items: center;
		padding-bottom: 4px;
	}
</style>
