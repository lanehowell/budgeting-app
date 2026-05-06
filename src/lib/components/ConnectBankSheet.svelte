<script lang="ts">
	import BottomSheet from './BottomSheet.svelte';
	import Button from './Button.svelte';
	import { simpleFinConnect } from '$lib/data/accounts';

	type Props = {
		open: boolean;
		onClose: () => void;
	};

	let { open, onClose }: Props = $props();

	let token = $state('');
	let working = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);

	$effect(() => {
		if (!open) {
			token = '';
			error = null;
			success = null;
			working = false;
		}
	});

	async function connect() {
		if (!token.trim()) return;
		working = true;
		error = null;
		success = null;
		try {
			const result = await simpleFinConnect(token.trim());
			success = `Connected · ${result.accounts} account${result.accounts === 1 ? '' : 's'} linked`;
			token = '';
			setTimeout(() => onClose(), 1200);
		} catch (e) {
			console.error(e);
			error = e instanceof Error ? e.message : 'Connection failed';
		} finally {
			working = false;
		}
	}
</script>

<BottomSheet {open} {onClose} title="Connect bank">
	<div class="body">
		<h2 class="sheet-title">Connect bank</h2>
		<p class="lede">
			Paste your SimpleFIN setup token below. We'll claim it once and store the resulting access
			URL server-side — it never touches the browser again.
		</p>

		<div class="field">
			<span class="eyebrow">Setup token</span>
			<textarea
				class="text-input"
				rows="4"
				bind:value={token}
				placeholder="Long base64-encoded string from beta-bridge.simplefin.org"
				autocomplete="off"
				spellcheck="false"
			></textarea>
			<a class="hint-link" href="https://beta-bridge.simplefin.org/" target="_blank" rel="noopener">
				Get a setup token →
			</a>
		</div>

		{#if error}
			<p class="error">{error}</p>
		{/if}
		{#if success}
			<p class="success">{success}</p>
		{/if}

		<div class="actions">
			<Button variant="secondary" fullWidth onclick={onClose}>Cancel</Button>
			<Button variant="primary" fullWidth onclick={connect} disabled={working || !token.trim()}>
				{working ? 'Connecting…' : 'Connect'}
			</Button>
		</div>
	</div>
</BottomSheet>

<style>
	.body {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.sheet-title {
		font-size: 22px;
		font-weight: 600;
		letter-spacing: -0.022em;
		margin-bottom: 4px;
	}

	.lede {
		font-size: 13px;
		color: var(--text-secondary);
		line-height: 1.45;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.eyebrow {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.067em;
		text-transform: uppercase;
		color: var(--text-tertiary);
	}

	.text-input {
		width: 100%;
		padding: 11px 14px;
		background: var(--fill-1);
		border: 0.5px solid transparent;
		border-radius: var(--radius-input);
		font-size: 13px;
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		color: var(--text-primary);
		resize: vertical;
		min-height: 88px;
		transition: border-color 150ms var(--ease-standard);
	}

	.text-input:focus {
		outline: none;
		border-color: var(--text-secondary);
	}

	.hint-link {
		font-size: 12px;
		color: var(--text-secondary);
	}

	.error {
		font-size: 13px;
		color: var(--danger);
	}

	.success {
		font-size: 13px;
		color: var(--success);
	}

	.actions {
		display: flex;
		gap: 8px;
	}
</style>
