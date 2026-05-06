import { browser } from '$app/environment';
import { writable, type Readable } from 'svelte/store';
import {
	GoogleAuthProvider,
	browserLocalPersistence,
	onAuthStateChanged,
	setPersistence,
	signInWithCredential,
	signInWithPopup,
	signOut as fbSignOut,
	type User
} from 'firebase/auth';
import { auth } from './client';

export type AuthState = {
	user: User | null;
	loading: boolean;
};

const initial: AuthState = { user: null, loading: true };
const internal = writable<AuthState>(initial);

// Lock persistence to localStorage before any sign-in completes. Mobile
// Safari occasionally defaults to session storage which evaporates on
// reload, making sign-ins appear to "not stick" after returning from auth.
export const authReady: Promise<void> = browser
	? setPersistence(auth(), browserLocalPersistence).catch((err) => {
			console.warn('Failed to set auth persistence:', err);
		})
	: Promise.resolve();

if (browser) {
	onAuthStateChanged(auth(), (user) => {
		internal.set({ user, loading: false });
	});
}

export const authState: Readable<AuthState> = { subscribe: internal.subscribe };

// True when running as an installed iOS PWA (Home Screen icon launch).
// Firebase's popup/redirect flows are broken in this mode — use Google
// Identity Services instead, which signs in via in-page modal.
export function isIosStandalonePwa(): boolean {
	if (!browser) return false;
	const nav = window.navigator as Navigator & { standalone?: boolean };
	const iosStandalone = nav.standalone === true;
	const displayStandalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
	const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
	return isIos && (iosStandalone || displayStandalone);
}

export async function signInWithGoogle(): Promise<User> {
	await authReady;
	const provider = new GoogleAuthProvider();
	const result = await signInWithPopup(auth(), provider);
	return result.user;
}

// Exchange a Google ID token (obtained via GIS) for a Firebase session.
// Used in iOS standalone PWA where popup/redirect break.
export async function signInWithGoogleIdToken(idToken: string): Promise<User> {
	await authReady;
	const credential = GoogleAuthProvider.credential(idToken);
	const result = await signInWithCredential(auth(), credential);
	return result.user;
}

export async function signOut(): Promise<void> {
	await fbSignOut(auth());
}
