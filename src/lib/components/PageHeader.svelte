<script lang="ts">
	type Props = {
		title: string;
		summary?: string;
		actions?: import('svelte').Snippet;
	};

	let { title, summary, actions }: Props = $props();
</script>

<header class="page-header">
	<div class="row">
		<h1 class="title-large">{title}</h1>
		{#if actions}
			<div class="actions">{@render actions()}</div>
		{/if}
	</div>
	{#if summary}
		<p class="summary subheadline">{summary}</p>
	{/if}
</header>

<style>
	.page-header {
		padding-top: 16px;
		padding-bottom: 16px;
	}

	.row {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 12px;
	}

	.title-large {
		flex: 1 1 auto;
	}

	.summary {
		margin-top: 6px;
		color: var(--text-secondary);
	}

	.actions {
		display: flex;
		gap: 8px;
		align-items: center;
	}
</style>
