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
		width: 50px;
		height: 30px;
		border-radius: 999px;
		background: rgba(120, 120, 128, 0.32);
		position: relative;
		transition: background 200ms var(--ease-standard);
		flex-shrink: 0;
		padding: 0;
	}

	.switch.on {
		background: var(--success);
	}

	.thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: #ffffff;
		box-shadow:
			0 2px 6px rgba(0, 0, 0, 0.2),
			0 0 0 0.5px rgba(0, 0, 0, 0.04);
		transition: left 200ms cubic-bezier(0.3, 0.7, 0.4, 1);
	}

	.switch.on .thumb {
		left: 22px;
	}
</style>
