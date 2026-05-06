import { browser } from '$app/environment';
import { writable, type Readable } from 'svelte/store';
import {
	GoogleAuthProvider,
	getRedirectResult,
	onAuthStateChanged,
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

if (browser) {
	getRedirectResult(auth()).catch((err) => {
		console.error('Redirect sign-in error', err);
	});
	onAuthStateChanged(auth(), (user) => {
		internal.set({ user, loading: false });
	});
}

export const authState: Readable<AuthState> = { subscribe: internal.subscribe };

export async function signInWithGoogle(): Promise<void> {
	const provider = new GoogleAuthProvider();
	await signInWithRedirect(auth(), provider);
}

export async function signOut(): Promise<void> {
	await fbSignOut(auth());
}
