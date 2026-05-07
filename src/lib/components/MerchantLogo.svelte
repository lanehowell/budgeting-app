<script lang="ts">
	type Props = {
		merchant: string;
		size?: number;
		radius?: number;
	};

	let { merchant, size = 44, radius = 12 }: Props = $props();

	let label = $derived(initials(merchant));
	let hue = $derived(hashHue(merchant));

	function initials(name: string): string {
		const parts = name.replace(/[’']/g, '').split(/\s+/).filter(Boolean);
		if (parts.length === 0) return '?';
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return ((parts[0][0] ?? '') + (parts[1][0] ?? '')).toUpperCase();
	}

	function hashHue(s: string): number {
		let h = 0;
		for (let i = 0; i < s.length; i++) h = ((h * 31 + s.charCodeAt(i)) >>> 0) & 0xffffffff;
		return h % 360;
	}
</script>

<div
	class="logo"
	style:width="{size}px"
	style:height="{size}px"
	style:border-radius="{radius}px"
	style:background="oklch(0.92 0.04 {hue})"
	style:color="oklch(0.42 0.12 {hue})"
	style:font-size="{Math.round(size * 0.36)}px"
	aria-hidden="true"
>
	{label}
</div>

<style>
	.logo {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		letter-spacing: -0.5px;
		flex-shrink: 0;
		font-family: var(--font-system);
	}
</style>
