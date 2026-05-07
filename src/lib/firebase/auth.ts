import { browser } from '$app/environment';
import { writable, type Readable } from 'svelte/store';
import {
	GoogleAuthProvider,
	browserLocalPersistence,
	getRedirectResult,
	onAuthStateChanged,
	setPersistence,
	signInWithCredential,
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
//
// CRITICAL: setPersistence MUST resolve before getRedirectResult runs, or
// the redirect callback writes the session with whatever the current
// persistence is — which evaporates the moment the tab reloads.
export const authReady: Promise<void> = browser
	? setPersistence(auth(), browserLocalPersistence).catch((err) => {
			console.warn('Failed to set auth persistence:', err);
		})
	: Promise.resolve();

if (browser) {
	onAuthStateChanged(auth(), (user) => {
		internal.set({ user, loading: false });
	});
	// Drain any pending redirect result from a prior signInWithRedirect call.
	// Success is picked up by onAuthStateChanged above; we just surface errors.
	authReady.then(() => getRedirectResult(auth())).catch((err) => {
		if (err?.code !== 'auth/no-auth-event') {
			console.error('Redirect sign-in returned an error:', err);
		}
	});
}

export const authState: Readable<AuthState> = { subscribe: internal.subscribe };

// True when running as an installed iOS PWA (Home Screen icon launch).
// Firebase's popup and redirect flows are both unreliable inside iOS
// standalone — popup opens a new Safari tab (kicks out of standalone),
// redirect's return doesn't always propagate back to the PWA window.
// In standalone we use Google Identity Services (GIS) instead, which
// returns a credential entirely in-page.
export function isIosStandalonePwa(): boolean {
	if (!browser) return false;
	const nav = window.navigator as Navigator & { standalone?: boolean };
	const iosStandalone = nav.standalone === true;
	const displayStandalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
	const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
	return isIos && (iosStandalone || displayStandalone);
}

// True for any mobile browser or narrow viewport. Used to prefer GIS over
// Firebase's redirect flow on mobile, which has racey session-persistence
// bugs (sign-in completes but lands in sessionStorage instead of
// localStorage and evaporates on reload).
export function shouldUseGisOnMobile(): boolean {
	if (!browser) return false;
	const isMobileUa = /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent || '');
	const isNarrow = window.innerWidth <= 820;
	return isMobileUa || isNarrow;
}

export async function signInWithGoogle(): Promise<User> {
	await authReady;
	const provider = new GoogleAuthProvider();
	const result = await signInWithPopup(auth(), provider);
	return result.user;
}

// Mobile fallback when GIS isn't configured/available. Same-origin redirect
// keeps iOS standalone in standalone (assuming PUBLIC_FIREBASE_AUTH_DOMAIN
// matches the deploy domain).
export async function signInWithGoogleRedirect(): Promise<void> {
	await authReady;
	const provider = new GoogleAuthProvider();
	await signInWithRedirect(auth(), provider);
}

// Exchange a Google ID token (obtained from GIS) for a Firebase session.
// This is the path that works inside iOS standalone PWAs — no popup, no
// redirect, all in-page.
export async function signInWithGoogleIdToken(idToken: string): Promise<User> {
	await authReady;
	const credential = GoogleAuthProvider.credential(idToken);
	const result = await signInWithCredential(auth(), credential);
	return result.user;
}

export async function signOut(): Promise<void> {
	await fbSignOut(auth());
}
