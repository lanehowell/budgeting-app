import { browser } from '$app/environment';
import { writable, type Readable } from 'svelte/store';
import {
	GoogleAuthProvider,
	browserLocalPersistence,
	getRedirectResult,
	onAuthStateChanged,
	setPersistence,
	signInWithPopup,
	signInWithRedirect,
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
	// If we just returned from a signInWithRedirect flow, surface any error
	// (success is picked up automatically by onAuthStateChanged above).
	getRedirectResult(auth()).catch((err) => {
		console.warn('getRedirectResult failed:', err);
	});
}

export const authState: Readable<AuthState> = { subscribe: internal.subscribe };

export async function signInWithGoogle(): Promise<User> {
	await authReady;
	const provider = new GoogleAuthProvider();
	const result = await signInWithPopup(auth(), provider);
	return result.user;
}

// Same-origin redirect flow — used by the login page. The current window
// navigates to the Firebase auth handler at /__/auth/handler (same origin as
// long as PUBLIC_FIREBASE_AUTH_DOMAIN matches the deploy domain), Google
// does its sign-in, and the user is redirected back. Same-origin throughout,
// so iOS Safari keeps a standalone PWA in standalone — unlike popup or GIS,
// which open a separate window/tab.
export async function signInWithGoogleRedirect(): Promise<void> {
	await authReady;
	const provider = new GoogleAuthProvider();
	await signInWithRedirect(auth(), provider);
}

export async function signOut(): Promise<void> {
	await fbSignOut(auth());
}
