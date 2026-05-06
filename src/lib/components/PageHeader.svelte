<script lang="ts">
	type Props = {
		title: string;
		eyebrow?: string;
		actions?: import('svelte').Snippet;
	};

	let { title, eyebrow, actions }: Props = $props();
</script>

<header class="page-header">
	{#if eyebrow}
		<div class="eyebrow">{eyebrow}</div>
	{/if}
	<div class="row">
		<h1 class="title">{title}</h1>
		{#if actions}
			<div class="actions">{@render actions()}</div>
		{/if}
	</div>
</header>

<style>
	.page-header {
		padding: 12px 0 18px;
	}

	.row {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 12px;
	}

	.title {
		font-size: 30px;
		line-height: 1.05;
		font-weight: 600;
		letter-spacing: -0.027em;
		color: var(--text-primary);
		flex: 1 1 auto;
	}

	.actions {
		display: flex;
		gap: 6px;
		align-items: center;
		padding-bottom: 4px;
	}
</style>
