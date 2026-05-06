import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type ThemeChoice = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

function readStored(): ThemeChoice {
	if (!browser) return 'system';
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
	return 'system';
}

function systemPrefersDark(): boolean {
	if (!browser) return false;
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolve(choice: ThemeChoice): ResolvedTheme {
	if (choice === 'system') return systemPrefersDark() ? 'dark' : 'light';
	return choice;
}

function apply(theme: ResolvedTheme) {
	if (!browser) return;
	document.documentElement.setAttribute('data-theme', theme);
}

function createTheme() {
	const choice = writable<ThemeChoice>(readStored());
	const resolved = writable<ResolvedTheme>('light');

	if (browser) {
		const initial = readStored();
		const initialResolved = resolve(initial);
		resolved.set(initialResolved);
		apply(initialResolved);

		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		mq.addEventListener('change', () => {
			let current: ThemeChoice = 'system';
			choice.subscribe((v) => (current = v))();
			if (current === 'system') {
				const next = resolve('system');
				resolved.set(next);
				apply(next);
			}
		});
	}

	return {
		choice: { subscribe: choice.subscribe },
		resolved: { subscribe: resolved.subscribe },
		set(next: ThemeChoice) {
			choice.set(next);
			if (browser) localStorage.setItem(STORAGE_KEY, next);
			const r = resolve(next);
			resolved.set(r);
			apply(r);
		}
	};
}

export const theme = createTheme();
