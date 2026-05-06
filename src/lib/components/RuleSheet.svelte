<script lang="ts">
	import BottomSheet from './BottomSheet.svelte';
	import Button from './Button.svelte';
	import SegmentedToggle from './SegmentedToggle.svelte';
	import CategoryGlyph from './CategoryGlyph.svelte';
	import { addMerchantRule, deleteMerchantRule, updateMerchantRule } from '$lib/data/merchantRules';
	import type { Category, MerchantRule } from '$lib/types';

	type Props = {
		open: boolean;
		rule: (MerchantRule & { id: string }) | null;
		categories: (Category & { id: string })[];
		onClose: () => void;
	};

	let { open, rule, categories, onClose }: Props = $props();

	let pattern = $state('');
	let matchType = $state<'contains' | 'startsWith' | 'regex'>('contains');
	let categoryId = $state<string>('');
	let displayName = $state('');
	let priority = $state(10);
	let saving = $state(false);
	let confirmingDelete = $state(false);

	let mode = $derived(rule ? 'edit' : 'add');

	$effect(() => {
		if (!open) return;
		if (rule) {
			pattern = rule.pattern;
			matchType = rule.matchType;
			categoryId = rule.categoryId;
			displayName = rule.displayName;
			priority = rule.priority;
		} else {
			pattern = '';
			matchType = 'contains';
			categoryId = categories.find((c) => !c.isTransferCategory)?.id ?? categories[0]?.id ?? '';
			displayName = '';
			priority = 10;
		}
		confirmingDelete = false;
	});

	const matchTypeOptions = [
		{ value: 'contains' as const, label: 'Contains' },
		{ value: 'startsWith' as const, label: 'Starts with' },
		{ value: 'regex' as const, label: 'Regex' }
	];

	let canSave = $derived(
		pattern.trim().length > 0 && displayName.trim().length > 0 && categoryId.length > 0
	);

	async function save() {
		if (!canSave) return;
		saving = true;
		try {
			const payload = {
				pattern: pattern.trim(),
				matchType,
				categoryId,
				displayName: displayName.trim(),
				priority,
				createdAt: rule?.createdAt ?? new Date().toISOString()
			};
			if (rule) {
				await updateMerchantRule(rule.id, payload);
			} else {
				await addMerchantRule(payload);
			}
			onClose();
		} catch (e) {
			console.error('Save rule failed', e);
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!rule) return;
		if (!confirmingDelete) {
			confirmingDelete = true;
			return;
		}
		saving = true;
		try {
			await deleteMerchantRule(rule.id);
			onClose();
		} catch (e) {
			console.error('Delete rule failed', e);
		} finally {
			saving = false;
		}
	}
</script>

<BottomSheet {open} {onClose} title={mode === 'edit' ? 'Edit rule' : 'New rule'}>
	<div class="body">
		<h2 class="sheet-title">{mode === 'edit' ? 'Edit rule' : 'New rule'}</h2>

		<div class="field">
			<span class="eyebrow">When transaction matches</span>
			<SegmentedToggle
				value={matchType}
				options={matchTypeOptions}
				onChange={(v) => (matchType = v)}
				ariaLabel="Match type"
			/>
			<input
				type="text"
				class="text-input"
				bind:value={pattern}
				placeholder={matchType === 'regex' ? 'e.g. ^SQ\\*' : 'e.g. SHELL OIL'}
			/>
			<span class="hint">
				Match is case-insensitive. Tested against the raw bank description.
			</span>
		</div>

		<div class="field">
			<span class="eyebrow">Set display name</span>
			<input
				type="text"
				class="text-input"
				bind:value={displayName}
				placeholder="Cleaned merchant name"
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

		<div class="field">
			<span class="eyebrow">Priority (higher wins)</span>
			<input
				type="number"
				min="0"
				max="100"
				step="1"
				class="text-input"
				bind:value={priority}
			/>
		</div>

		<div class="actions">
			<Button variant="secondary" fullWidth onclick={onClose}>Cancel</Button>
			<Button variant="primary" fullWidth onclick={save} disabled={!canSave || saving}>
				{saving ? 'Saving…' : 'Save'}
			</Button>
		</div>

		{#if mode === 'edit'}
			<button class="delete-btn" onclick={handleDelete} disabled={saving}>
				{confirmingDelete ? 'Tap again to confirm delete' : 'Delete rule'}
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

	.hint {
		font-size: 12px;
		color: var(--text-tertiary);
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
	}

	.cat-chip.selected {
		background: var(--text-primary);
		border-color: var(--text-primary);
		color: var(--bg-primary);
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
