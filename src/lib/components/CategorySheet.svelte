<script lang="ts">
	import BottomSheet from './BottomSheet.svelte';
	import Button from './Button.svelte';
	import CategoryGlyph from './CategoryGlyph.svelte';
	import Switch from './Switch.svelte';
	import { addCategory, deleteCategory, updateCategory } from '$lib/data/categories';
	import type { Category } from '$lib/types';

	type Props = {
		open: boolean;
		category: (Category & { id: string }) | null;
		existingCount: number;
		onClose: () => void;
	};

	let { open, category, existingCount, onClose }: Props = $props();

	const ICON_OPTIONS = [
		'shopping-cart',
		'utensils',
		'coffee',
		'fuel',
		'car',
		'home',
		'zap',
		'receipt',
		'tv',
		'film',
		'heart',
		'plane',
		'package',
		'tag',
		'wallet',
		'arrow-left-right',
		'undo-2',
		'repeat'
	];

	const COLOR_OPTIONS = [
		'#64748b',
		'#3b82f6',
		'#6366f1',
		'#a855f7',
		'#ec4899',
		'#f43f5e',
		'#f97316',
		'#f59e0b',
		'#84cc16',
		'#22c55e',
		'#14b8a6',
		'#78716c'
	];

	let name = $state('');
	let icon = $state(ICON_OPTIONS[0]);
	let color = $state(COLOR_OPTIONS[0]);
	let excludeFromSpending = $state(false);
	let saving = $state(false);
	let confirmingDelete = $state(false);

	let mode = $derived(category ? 'edit' : 'add');
	let isLocked = $derived(category?.isTransferCategory ?? false);

	$effect(() => {
		if (!open) return;
		if (category) {
			name = category.name;
			icon = category.icon;
			color = category.color || COLOR_OPTIONS[0];
			excludeFromSpending = category.excludeFromSpending;
		} else {
			name = '';
			icon = ICON_OPTIONS[0];
			color = COLOR_OPTIONS[0];
			excludeFromSpending = false;
		}
		confirmingDelete = false;
	});

	let canSave = $derived(name.trim().length > 0);

	async function save() {
		if (!canSave) return;
		saving = true;
		try {
			if (category) {
				await updateCategory(category.id, {
					name: name.trim(),
					icon,
					color,
					excludeFromSpending: isLocked ? true : excludeFromSpending
				});
			} else {
				await addCategory({
					name: name.trim(),
					icon,
					color,
					isTransferCategory: false,
					excludeFromSpending,
					sortOrder: existingCount + 1
				});
			}
			onClose();
		} catch (e) {
			console.error('Save category failed', e);
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!category || isLocked) return;
		if (!confirmingDelete) {
			confirmingDelete = true;
			return;
		}
		saving = true;
		try {
			await deleteCategory(category.id);
			onClose();
		} catch (e) {
			console.error('Delete category failed', e);
		} finally {
			saving = false;
		}
	}
</script>

<BottomSheet {open} {onClose} title={mode === 'edit' ? 'Edit category' : 'New category'}>
	<div class="body">
		<h2 class="sheet-title">{mode === 'edit' ? 'Edit category' : 'New category'}</h2>

		{#if isLocked}
			<p class="lock-note">
				This is a built-in category. You can edit the name and icon but it can't be deleted or
				removed from the spending exclusion list.
			</p>
		{/if}

		<div class="field">
			<span class="eyebrow">Name</span>
			<input type="text" class="text-input" bind:value={name} placeholder="Groceries" />
		</div>

		<div class="field">
			<span class="eyebrow">Icon</span>
			<div class="icon-grid">
				{#each ICON_OPTIONS as opt (opt)}
					<button
						class="icon-opt"
						class:selected={icon === opt}
						aria-label={opt}
						aria-pressed={icon === opt}
						onclick={() => (icon = opt)}
					>
						<CategoryGlyph icon={opt} size={24} color="currentColor" />
					</button>
				{/each}
			</div>
		</div>

		<div class="field">
			<span class="eyebrow">Color</span>
			<div class="color-grid">
				{#each COLOR_OPTIONS as swatch (swatch)}
					<button
						class="color-opt"
						class:selected={color === swatch}
						aria-label="Color {swatch}"
						aria-pressed={color === swatch}
						style="--swatch: {swatch}"
						onclick={() => (color = swatch)}
					></button>
				{/each}
			</div>
		</div>

		<div class="setting-row">
			<span class="setting-label">Exclude from spending</span>
			<Switch
				value={isLocked ? true : excludeFromSpending}
				onChange={(v) => {
					if (!isLocked) excludeFromSpending = v;
				}}
				ariaLabel="Exclude from spending"
			/>
		</div>

		<div class="actions">
			<Button variant="secondary" fullWidth onclick={onClose}>Cancel</Button>
			<Button variant="primary" fullWidth onclick={save} disabled={!canSave || saving}>
				{saving ? 'Saving…' : 'Save'}
			</Button>
		</div>

		{#if mode === 'edit' && !isLocked}
			<button class="delete-btn" onclick={handleDelete} disabled={saving}>
				{confirmingDelete ? 'Tap again to confirm delete' : 'Delete category'}
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

	.lock-note {
		font-size: 12px;
		color: var(--text-tertiary);
		padding: 10px 12px;
		background: var(--fill-1);
		border-radius: 8px;
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

	.icon-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 6px;
	}

	.icon-opt {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		min-width: 44px;
		border-radius: var(--radius-input);
		background: var(--fill-1);
		color: var(--text-secondary);
		border: 1.5px solid transparent;
		transition:
			background-color 150ms var(--ease-standard),
			border-color 150ms var(--ease-standard),
			color 150ms var(--ease-standard);
	}

	.icon-opt.selected {
		background: var(--text-primary);
		border-color: var(--text-primary);
		color: var(--bg-primary);
	}

	.color-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 6px;
	}

	.color-opt {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		min-width: 44px;
		border-radius: 999px;
		background: transparent;
		border: 2px solid transparent;
		transition:
			border-color 150ms var(--ease-standard),
			transform 100ms var(--ease-standard);
		position: relative;
	}

	.color-opt::after {
		content: '';
		width: 24px;
		height: 24px;
		border-radius: 999px;
		background: var(--swatch);
		box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.12);
	}

	.color-opt.selected {
		border-color: var(--text-primary);
	}

	.color-opt:active:not(.selected) {
		transform: scale(0.92);
	}

	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 4px 0;
	}

	.setting-label {
		font-size: 14px;
		color: var(--text-primary);
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
