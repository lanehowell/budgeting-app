import { doc, setDoc } from 'firebase/firestore';
import { auth } from '$lib/firebase/client';
import { getDb, userDocStore } from '$lib/firebase/stores';
import type { Settings } from '$lib/types';

export const settings = userDocStore<Settings>('meta/settings');

function uid(): string {
	const user = auth().currentUser;
	if (!user) throw new Error('Not signed in');
	return user.uid;
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
	await setDoc(doc(getDb(), `users/${uid()}/meta/settings`), patch, { merge: true });
}
