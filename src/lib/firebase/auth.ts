import { browser } from '$app/environment';
import { writable, type Readable } from 'svelte/store';
import {
	GoogleAuthProvider,
	onAuthStateChanged,
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

if (browser) {
	onAuthStateChanged(auth(), (user) => {
		internal.set({ user, loading: false });
	});
}

export const authState: Readable<AuthState> = { subscribe: internal.subscribe };

export async function signInWithGoogle(): Promise<User> {
	const provider = new GoogleAuthProvider();
	const result = await signInWithPopup(auth(), provider);
	return result.user;
}

export async function signOut(): Promise<void> {
	await fbSignOut(auth());
}
