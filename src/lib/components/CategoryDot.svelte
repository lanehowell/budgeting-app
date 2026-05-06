<script lang="ts">
	type Props = {
		color: string;
		size?: number;
	};

	let { color, size = 10 }: Props = $props();
</script>

<span class="dot" style="background:{color}; width:{size}px; height:{size}px;" aria-hidden="true"
></span>

<style>
	.dot {
		display: inline-block;
		border-radius: 999px;
		flex-shrink: 0;
	}
</style>
