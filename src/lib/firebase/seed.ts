import { collection, doc, getDocs, limit, query, setDoc } from 'firebase/firestore';
import { db } from './client';
import type { Category } from '$lib/types';

const seededUsers = new Set<string>();

/**
 * On first sign-in, seed the built-in Transfer category.
 * Idempotent — safe to call on every page load.
 */
export async function ensureSeed(uid: string): Promise<void> {
	if (seededUsers.has(uid)) return;
	seededUsers.add(uid);

	try {
		const catsRef = collection(db(), `users/${uid}/categories`);
		const existing = await getDocs(query(catsRef, limit(1)));
		if (!existing.empty) return;

		const transferId = 'transfer';
		const transfer: Omit<Category, 'id'> = {
			name: 'Transfer',
			color: '#8E8E93',
			icon: 'arrow-left-right',
			isTransferCategory: true,
			excludeFromSpending: true,
			sortOrder: 0
		};
		await setDoc(doc(catsRef, transferId), transfer);
	} catch (err) {
		console.error('Seed failed', err);
		seededUsers.delete(uid);
	}
}
