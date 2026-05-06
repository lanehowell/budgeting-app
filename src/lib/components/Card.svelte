<script lang="ts">
	type Props = {
		children: import('svelte').Snippet;
		padding?: boolean;
		class?: string;
	};

	let { children, padding = false, class: className = '' }: Props = $props();
</script>

<div class="card {className}" class:padded={padding}>
	{@render children()}
</div>

<style>
	.card {
		background: var(--bg-tertiary);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-card);
		overflow: hidden;
	}

	.card.padded {
		padding: 16px;
	}
</style>
