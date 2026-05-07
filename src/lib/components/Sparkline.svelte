<script lang="ts">
	type Props = {
		data: number[];
		height?: number;
		width?: number;
		color?: string;
		stroke?: number;
	};

	let {
		data,
		height = 56,
		width = 320,
		color = 'var(--accent)',
		stroke = 2
	}: Props = $props();

	let gradId = `spark-${Math.random().toString(36).slice(2, 9)}`;

	let pts = $derived.by(() => {
		if (data.length < 2) return [] as [number, number][];
		const max = Math.max(...data, 1);
		const min = Math.min(...data, 0);
		const range = max - min || 1;
		const stepX = width / (data.length - 1);
		return data.map(
			(v, i) => [i * stepX, height - ((v - min) / range) * (height - 8) - 4] as [number, number]
		);
	});

	let smoothPath = $derived.by(() => {
		if (pts.length < 2) return '';
		return pts.reduce((acc, p, i) => {
			if (i === 0) return `M${p[0]},${p[1]}`;
			const prev = pts[i - 1];
			const cx = (prev[0] + p[0]) / 2;
			return acc + ` Q${prev[0]},${prev[1]} ${cx},${(prev[1] + p[1]) / 2} T${p[0]},${p[1]}`;
		}, '');
	});

	let areaPath = $derived(smoothPath ? smoothPath + ` L${width},${height} L0,${height} Z` : '');
</script>

{#if pts.length >= 2}
	<svg
		width="100%"
		height={height}
		viewBox="0 0 {width} {height}"
		preserveAspectRatio="none"
		style="display: block;"
		aria-hidden="true"
	>
		<defs>
			<linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color={color} stop-opacity="0.22" />
				<stop offset="100%" stop-color={color} stop-opacity="0" />
			</linearGradient>
		</defs>
		<path d={areaPath} fill="url(#{gradId})" />
		<path
			d={smoothPath}
			fill="none"
			stroke={color}
			stroke-width={stroke}
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
{/if}
