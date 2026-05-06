<script lang="ts">
	import Icon from './Icon.svelte';

	type Props = {
		icon: string;
		size?: number;
		color?: string;
	};

	let { icon, size = 28, color = 'var(--text-secondary)' }: Props = $props();
</script>

<span class="glyph" style="width:{size}px; height:{size}px; color:{color};">
	<Icon name={icon} size={Math.round(size * 0.62)} strokeWidth={1.5} />
</span>

<style>
	.glyph {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
</style>
