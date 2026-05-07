import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type AccentChoice = 'mono' | 'blue' | 'green' | 'plum' | 'amber' | 'teal' | 'rose';

export const ACCENT_OPTIONS: AccentChoice[] = [
	'mono',
	'blue',
	'green',
	'plum',
	'amber',
	'teal',
	'rose'
];

const STORAGE_KEY = 'accent';

function readStored(): AccentChoice {
	if (!browser) return 'mono';
	const stored = localStorage.getItem(STORAGE_KEY);
	if (
		stored === 'mono' ||
		stored === 'blue' ||
		stored === 'green' ||
		stored === 'plum' ||
		stored === 'amber' ||
		stored === 'teal' ||
		stored === 'rose'
	) {
		return stored;
	}
	return 'mono';
}

function apply(choice: AccentChoice) {
	if (!browser) return;
	document.documentElement.setAttribute('data-accent', choice);
}

function createAccent() {
	const choice = writable<AccentChoice>(readStored());

	if (browser) {
		const initial = readStored();
		apply(initial);
	}

	return {
		choice: { subscribe: choice.subscribe },
		set(next: AccentChoice) {
			choice.set(next);
			if (browser) localStorage.setItem(STORAGE_KEY, next);
			apply(next);
		}
	};
}

export const accent = createAccent();
