import { addDoc, collection, deleteDoc, doc, orderBy, updateDoc } from 'firebase/firestore';
import { auth } from '$lib/firebase/client';
import { getDb, userCollectionStore } from '$lib/firebase/stores';
import type { Category } from '$lib/types';

export const categories = userCollectionStore<Omit<Category, 'id'>>('categories', () => [
	orderBy('sortOrder', 'asc')
]);

function uid(): string {
	const user = auth().currentUser;
	if (!user) throw new Error('Not signed in');
	return user.uid;
}

export async function addCategory(data: Omit<Category, 'id'>): Promise<string> {
	const ref = await addDoc(collection(getDb(), `users/${uid()}/categories`), data);
	return ref.id;
}

export async function updateCategory(id: string, patch: Partial<Omit<Category, 'id'>>) {
	await updateDoc(doc(getDb(), `users/${uid()}/categories/${id}`), patch);
}

export async function deleteCategory(id: string) {
	await deleteDoc(doc(getDb(), `users/${uid()}/categories/${id}`));
}
