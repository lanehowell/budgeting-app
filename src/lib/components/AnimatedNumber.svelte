<script lang="ts">
	import { onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	type Props = {
		value: number;
		duration?: number;
		prefix?: string;
		suffix?: string;
		decimals?: number;
		class?: string;
	};

	let {
		value,
		duration = 600,
		prefix = '$',
		suffix = '',
		decimals = 2,
		class: className = ''
	}: Props = $props();

	let display = $state<number | null>(null);
	let from: number | null = null;
	let raf = 0;

	const reduceMotion =
		browser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	$effect(() => {
		const target = value;
		if (!browser || reduceMotion) {
			display = target;
			from = target;
			return;
		}
		if (from === null) {
			// First mount — render the target immediately, no animation.
			display = target;
			from = target;
			return;
		}
		const start = from;
		if (start === target) return;
		const t0 = performance.now();
		cancelAnimationFrame(raf);
		const tick = (now: number) => {
			const k = Math.min(1, (now - t0) / duration);
			const eased = 1 - Math.pow(1 - k, 3);
			display = start + (target - start) * eased;
			if (k < 1) {
				raf = requestAnimationFrame(tick);
			} else {
				from = target;
			}
		};
		raf = requestAnimationFrame(tick);
	});

	onDestroy(() => cancelAnimationFrame(raf));

	let formatted = $derived(
		(display ?? value).toLocaleString('en-US', {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals
		})
	);
</script>

<span class="num {className}">{prefix}{formatted}{suffix}</span>

<style>
	.num {
		font-variant-numeric: tabular-nums;
		font-family: var(--font-num);
	}
</style>
