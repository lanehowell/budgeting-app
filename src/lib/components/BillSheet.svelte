<script lang="ts">
	import BottomSheet from './BottomSheet.svelte';
	import Button from './Button.svelte';
	import SegmentedToggle from './SegmentedToggle.svelte';
	import CategoryGlyph from './CategoryGlyph.svelte';
	import { addBill, deleteBill, updateBill } from '$lib/data/bills';
	import type { Bill, Category, Recurrence } from '$lib/types';

	type Props = {
		open: boolean;
		bill: (Bill & { id: string }) | null;
		categories: (Category & { id: string })[];
		onClose: () => void;
	};

	let { open, bill, categories, onClose }: Props = $props();

	let name = $state('');
	let amountStr = $state('');
	let dueDay = $state<number>(1);
	let categoryId = $state<string>('');
	let recurrence = $state<Recurrence>('monthly');
	let isActive = $state(true);
	let saving = $state(false);
	let confirmingDelete = $state(false);

	let mode = $derived(bill ? 'edit' : 'add');

	$effect(() => {
		if (!open) return;
		if (bill) {
			name = bill.name;
			amountStr = bill.amount.toFixed(2);
			dueDay = bill.dueDay;
			categoryId = bill.categoryId;
			recurrence = bill.recurrence;
			isActive = bill.isActive;
		} else {
			name = '';
			amountStr = '';
			dueDay = 1;
			categoryId = categories[0]?.id ?? '';
			recurrence = 'monthly';
			isActive = true;
		}
		confirmingDelete = false;
	});

	const recurrenceOptions: { value: Recurrence; label: string }[] = [
		{ value: 'monthly', label: 'Monthly' },
		{ value: 'biweekly', label: 'Biweekly' },
		{ value: 'yearly', label: 'Yearly' }
	];

	let canSave = $derived(name.trim().length > 0 && parseFloat(amountStr) > 0 && dueDay >= 1 && dueDay <= 31 && categoryId.length > 0);

	async function save() {
		if (!canSave) return;
		saving = true;
		try {
			const payload = {
				name: name.trim(),
				amount: parseFloat(amountStr),
				dueDay,
				categoryId,
				recurrence,
				isActive,
				createdAt: bill?.createdAt ?? new Date().toISOString()
			};
			if (bill) {
				await updateBill(bill.id, payload);
			} else {
				await addBill(payload);
			}
			onClose();
		} catch (e) {
			console.error('Save bill failed', e);
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!bill) return;
		if (!confirmingDelete) {
			confirmingDelete = true;
			return;
		}
		saving = true;
		try {
			await deleteBill(bill.id);
			onClose();
		} catch (e) {
			console.error('Delete bill failed', e);
		} finally {
			saving = false;
		}
	}
</script>

<BottomSheet {open} {onClose} title={mode === 'edit' ? 'Edit bill' : 'New bill'}>
	<div class="body">
		<h2 class="sheet-title">{mode === 'edit' ? 'Edit bill' : 'New bill'}</h2>

		<div class="field">
			<span class="eyebrow">Name</span>
			<input
				type="text"
				class="text-input"
				bind:value={name}
				placeholder="Rent, Electric, Spotify…"
			/>
		</div>

		<div class="grid-2">
			<div class="field">
				<span class="eyebrow">Amount</span>
				<input
					type="number"
					inputmode="decimal"
					step="0.01"
					min="0"
					class="text-input"
					bind:value={amountStr}
					placeholder="0.00"
				/>
			</div>
			<div class="field">
				<span class="eyebrow">Due day</span>
				<input
					type="number"
					min="1"
					max="31"
					step="1"
					class="text-input"
					bind:value={dueDay}
				/>
			</div>
		</div>

		<div class="field">
			<span class="eyebrow">Recurrence</span>
			<SegmentedToggle
				value={recurrence}
				options={recurrenceOptions}
				onChange={(v) => (recurrence = v)}
				ariaLabel="Recurrence"
			/>
		</div>

		<div class="field">
			<span class="eyebrow">Category</span>
			<div class="cat-grid">
				{#each categories as c (c.id)}
					<button
						class="cat-chip"
						class:selected={categoryId === c.id}
						onclick={() => (categoryId = c.id)}
					>
						<CategoryGlyph icon={c.icon} size={16} color="currentColor" />
						<span>{c.name}</span>
					</button>
				{/each}
			</div>
		</div>

		<label class="checkbox-row">
			<input type="checkbox" bind:checked={isActive} />
			<span>Active (show on Bills page)</span>
		</label>

		<div class="actions">
			<Button variant="secondary" fullWidth onclick={onClose}>Cancel</Button>
			<Button variant="primary" fullWidth onclick={save} disabled={!canSave || saving}>
				{saving ? 'Saving…' : 'Save'}
			</Button>
		</div>

		{#if mode === 'edit'}
			<button class="delete-btn" onclick={handleDelete} disabled={saving}>
				{confirmingDelete ? 'Tap again to confirm delete' : 'Delete bill'}
			</button>
		{/if}
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

	.field {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.grid-2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
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
		color: var(--text-primary);
		transition: border-color 150ms var(--ease-standard);
	}

	.text-input:focus {
		outline: none;
		border-color: var(--text-secondary);
	}

	.cat-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.cat-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 12px;
		border-radius: 999px;
		background: var(--fill-1);
		color: var(--text-secondary);
		min-height: 32px;
		font-weight: 500;
		font-size: 13px;
		border: 0.5px solid transparent;
		transition:
			background-color 150ms var(--ease-standard),
			border-color 150ms var(--ease-standard),
			color 150ms var(--ease-standard);
	}

	.cat-chip.selected {
		background: var(--text-primary);
		border-color: var(--text-primary);
		color: var(--bg-primary);
	}

	.checkbox-row {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 13px;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.checkbox-row input[type='checkbox'] {
		width: 18px;
		height: 18px;
		accent-color: var(--text-primary);
	}

	.actions {
		display: flex;
		gap: 8px;
	}

	.delete-btn {
		width: 100%;
		padding: 12px 0;
		color: var(--danger);
		font-size: 13px;
		font-weight: 500;
		text-align: center;
		min-height: 44px;
	}
</style>
