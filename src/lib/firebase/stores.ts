import { readable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import {
	collection,
	doc,
	onSnapshot,
	query,
	type DocumentData,
	type Query,
	type QueryConstraint,
	type Firestore
} from 'firebase/firestore';
import { authState } from './auth';
import { db } from './client';

type WithId<T> = T & { id: string };

/**
 * Subscribe to a Firestore collection scoped under /users/{userId}/...
 * The store re-subscribes whenever the signed-in user changes.
 */
export function userCollectionStore<T extends DocumentData>(
	subPath: string,
	constraints: () => QueryConstraint[] = () => []
): Readable<WithId<T>[]> {
	if (!browser) return readable<WithId<T>[]>([]);

	return readable<WithId<T>[]>([], (set) => {
		let snapshotUnsub: (() => void) | null = null;

		const authUnsub = authState.subscribe((s) => {
			if (snapshotUnsub) {
				snapshotUnsub();
				snapshotUnsub = null;
			}
			set([]);
			if (!s.user) return;
			const path = `users/${s.user.uid}/${subPath}`;
			const q: Query = query(collection(db(), path), ...constraints());
			snapshotUnsub = onSnapshot(
				q,
				(snap) => {
					const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
					set(rows as WithId<T>[]);
				},
				(err) => {
					console.error(`Snapshot error on ${path}:`, err);
					set([]);
				}
			);
		});

		return () => {
			snapshotUnsub?.();
			authUnsub();
		};
	});
}

/**
 * Subscribe to a Firestore document scoped under /users/{userId}/...
 * Returns null when the user is signed out or the document doesn't exist.
 */
export function userDocStore<T extends DocumentData>(
	subPath: string
): Readable<WithId<T> | null> {
	if (!browser) return readable<WithId<T> | null>(null);

	return readable<WithId<T> | null>(null, (set) => {
		let snapshotUnsub: (() => void) | null = null;

		const authUnsub = authState.subscribe((s) => {
			if (snapshotUnsub) {
				snapshotUnsub();
				snapshotUnsub = null;
			}
			set(null);
			if (!s.user) return;
			const path = `users/${s.user.uid}/${subPath}`;
			snapshotUnsub = onSnapshot(
				doc(db(), path),
				(snap) => {
					if (!snap.exists()) {
						set(null);
					} else {
						set({ id: snap.id, ...(snap.data() as T) } as WithId<T>);
					}
				},
				(err) => {
					console.error(`Snapshot error on ${path}:`, err);
					set(null);
				}
			);
		});

		return () => {
			snapshotUnsub?.();
			authUnsub();
		};
	});
}

export function userPath(uid: string, subPath: string): string {
	return `users/${uid}/${subPath}`;
}

export function getDb(): Firestore {
	return db();
}
