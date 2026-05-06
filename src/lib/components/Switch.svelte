<script lang="ts">
	type Props = {
		value: boolean;
		onChange: (v: boolean) => void;
		ariaLabel?: string;
	};

	let { value, onChange, ariaLabel }: Props = $props();
</script>

<button
	type="button"
	class="switch"
	class:on={value}
	role="switch"
	aria-checked={value}
	aria-label={ariaLabel}
	onclick={() => onChange(!value)}
>
	<span class="thumb"></span>
</button>

<style>
	.switch {
		width: 36px;
		height: 20px;
		border-radius: 10px;
		background: var(--fill-1);
		position: relative;
		transition: background 200ms var(--ease-standard);
		flex-shrink: 0;
	}

	.switch.on {
		background: var(--text-primary);
	}

	.thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--text-secondary);
		transition:
			left 200ms cubic-bezier(0.3, 0.7, 0.4, 1),
			background 200ms var(--ease-standard);
	}

	.switch.on .thumb {
		left: 18px;
		background: var(--bg-primary);
	}
</style>
