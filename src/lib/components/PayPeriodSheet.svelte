<script lang="ts">
	import BottomSheet from './BottomSheet.svelte';
	import Button from './Button.svelte';
	import SegmentedToggle from './SegmentedToggle.svelte';
	import { updateSettings } from '$lib/data/settings';
	import type { PayPeriodType, Settings } from '$lib/types';

	type Props = {
		open: boolean;
		settings: Settings | null;
		onClose: () => void;
	};

	let { open, settings, onClose }: Props = $props();

	let type = $state<PayPeriodType>('monthly');
	let startDate = $state('');
	let length = $state(14);
	let saving = $state(false);

	$effect(() => {
		if (!open) return;
		type = settings?.payPeriodType ?? 'monthly';
		const iso = settings?.payPeriodStartDate ?? new Date().toISOString();
		startDate = iso.slice(0, 10);
		length = settings?.payPeriodLength ?? 14;
	});

	const typeOptions: { value: PayPeriodType; label: string }[] = [
		{ value: 'monthly', label: 'Monthly' },
		{ value: 'biweekly', label: 'Biweekly' },
		{ value: 'weekly', label: 'Weekly' },
		{ value: 'custom', label: 'Custom' }
	];

	async function save() {
		saving = true;
		try {
			const iso = new Date(`${startDate}T00:00:00`).toISOString();
			await updateSettings({
				payPeriodType: type,
				payPeriodStartDate: iso,
				payPeriodLength: length
			});
			onClose();
		} catch (e) {
			console.error('Failed to save pay period', e);
		} finally {
			saving = false;
		}
	}
</script>

<BottomSheet {open} {onClose} title="Pay period">
	<div class="body">
		<div class="title-row">
			<h2 class="sheet-title">Pay period</h2>
		</div>

		<div class="field">
			<span class="eyebrow">Type</span>
			<SegmentedToggle
				value={type}
				options={typeOptions}
				onChange={(v) => (type = v)}
				ariaLabel="Pay period type"
			/>
		</div>

		<div class="field">
			<span class="eyebrow">{type === 'monthly' ? 'Reference date' : 'Start date'}</span>
			<input type="date" class="text-input" bind:value={startDate} />
			<span class="hint">
				{#if type === 'monthly'}
					Monthly periods follow the calendar month — this date is informational.
				{:else if type === 'weekly'}
					The first day of a 7-day pay cycle that repeats from this date.
				{:else if type === 'biweekly'}
					The first day of a 14-day pay cycle that repeats from this date.
				{:else}
					The first day of a {length}-day cycle that repeats from this date.
				{/if}
			</span>
		</div>

		{#if type === 'custom'}
			<div class="field">
				<span class="eyebrow">Length (days)</span>
				<input type="number" min="1" max="62" class="text-input" bind:value={length} />
			</div>
		{/if}

		<div class="actions">
			<Button variant="secondary" fullWidth onclick={onClose}>Cancel</Button>
			<Button variant="primary" fullWidth onclick={save} disabled={saving}>
				{saving ? 'Saving…' : 'Save'}
			</Button>
		</div>
	</div>
</BottomSheet>

<style>
	.body {
		display: flex;
		flex-direction: column;
		gap: 22px;
	}

	.title-row {
		margin-bottom: -8px;
	}

	.sheet-title {
		font-size: 22px;
		font-weight: 600;
		letter-spacing: -0.022em;
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
		font-size: 15px;
		min-height: 42px;
		transition: border-color 150ms var(--ease-standard);
		color: var(--text-primary);
	}

	.text-input:focus {
		outline: none;
		border-color: var(--text-secondary);
	}

	.hint {
		font-size: 12px;
		color: var(--text-tertiary);
	}

	.actions {
		display: flex;
		gap: 8px;
	}
</style>
