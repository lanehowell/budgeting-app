<script lang="ts">
	type Props = {
		value: number;
		size?: number;
		stroke?: number;
		color?: string;
		track?: string;
	};

	let {
		value,
		size = 120,
		stroke = 10,
		color = 'var(--accent)',
		track = 'var(--track)'
	}: Props = $props();

	let r = $derived((size - stroke) / 2);
	let circumference = $derived(2 * Math.PI * r);
	let clamped = $derived(Math.max(0, Math.min(1, value)));
	let offset = $derived(circumference * (1 - clamped));
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 {size} {size}"
	style="transform: rotate(-90deg);"
	aria-hidden="true"
>
	<circle
		cx={size / 2}
		cy={size / 2}
		r={r}
		fill="none"
		stroke={track}
		stroke-width={stroke}
	/>
	<circle
		class="ring"
		cx={size / 2}
		cy={size / 2}
		r={r}
		fill="none"
		stroke={color}
		stroke-width={stroke}
		stroke-linecap="round"
		stroke-dasharray={circumference}
		stroke-dashoffset={offset}
	/>
</svg>

<style>
	.ring {
		transition: stroke-dashoffset 600ms cubic-bezier(0.3, 0.7, 0.4, 1);
	}
</style>
