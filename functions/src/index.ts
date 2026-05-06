import { setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

setGlobalOptions({ maxInstances: 5, region: 'us-central1', timeoutSeconds: 120 });

// ── Types reflecting our Firestore data model ─────────────────────────

type MerchantRule = {
	id: string;
	pattern: string;
	matchType: 'contains' | 'startsWith' | 'regex';
	categoryId: string;
	displayName: string;
	priority: number;
};

type Bill = {
	id: string;
	name: string;
	amount: number;
	dueDay: number;
	categoryId: string;
	recurrence: 'monthly' | 'biweekly' | 'yearly';
	isActive: boolean;
};

type StoredTransaction = {
	id: string;
	accountId: string;
	postedDate: string;
	amount: number;
	categoryId: string | null;
	displayName: string;
	pending: boolean;
};

type SimpleFinTransaction = {
	id: string;
	posted: number;
	transacted_at?: number;
	amount: string;
	description: string;
	pending?: boolean;
	memo?: string;
};

type SimpleFinAccount = {
	id: string;
	name: string;
	currency: string;
	balance: string;
	'available-balance'?: string;
	'balance-date': number;
	transactions: SimpleFinTransaction[];
	org: { name?: string; domain?: string; 'sfin-url'?: string };
};

type SimpleFinResponse = {
	errors?: string[];
	accounts: SimpleFinAccount[];
};

// ── Helpers ────────────────────────────────────────────────────────────

function privateDoc(uid: string) {
	return db.doc(`users/${uid}/__private/simplefin`);
}

function requireUid(request: { auth?: { uid?: string } }): string {
	if (!request.auth?.uid) {
		throw new HttpsError('unauthenticated', 'You must be signed in.');
	}
	return request.auth.uid;
}

/** Strip the basic-auth credentials out of an access URL for safe display. */
function safeAccessHost(accessUrl: string): string {
	try {
		const u = new URL(accessUrl);
		return u.host + u.pathname;
	} catch {
		return 'unknown';
	}
}

function maskFromAccountId(id: string): string {
	const digits = id.replace(/\D/g, '');
	return digits.length >= 4 ? digits.slice(-4) : digits.padStart(4, '•');
}

/**
 * SimpleFIN access URLs embed credentials as `https://user:pass@host/...`.
 * Node 24's undici-backed fetch refuses URLs with embedded credentials, so
 * we extract them and send as a Basic auth header instead.
 */
function splitAccessUrl(accessUrl: string): { base: string; authHeader: string | null } {
	const u = new URL(accessUrl);
	let authHeader: string | null = null;
	if (u.username || u.password) {
		const user = decodeURIComponent(u.username);
		const pass = decodeURIComponent(u.password);
		authHeader = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
		u.username = '';
		u.password = '';
	}
	let base = u.toString();
	if (base.endsWith('/')) base = base.slice(0, -1);
	return { base, authHeader };
}

async function fetchSimpleFin(
	accessUrl: string,
	startEpoch?: number
): Promise<SimpleFinResponse> {
	const { base, authHeader } = splitAccessUrl(accessUrl);
	const target = new URL(base + '/accounts');
	target.searchParams.set('pending', '1');
	if (startEpoch !== undefined) {
		target.searchParams.set('start-date', String(startEpoch));
	}
	const headers: Record<string, string> = { Accept: 'application/json' };
	if (authHeader) headers.Authorization = authHeader;

	let resp: Response;
	try {
		resp = await fetch(target.toString(), { headers });
	} catch (err) {
		throw new HttpsError(
			'internal',
			`SimpleFIN fetch failed: ${err instanceof Error ? err.message : String(err)}`
		);
	}

	if (!resp.ok) {
		const text = await resp.text().catch(() => '');
		throw new HttpsError('internal', `SimpleFIN HTTP ${resp.status}: ${text.slice(0, 200)}`);
	}

	const text = await resp.text();
	try {
		return JSON.parse(text) as SimpleFinResponse;
	} catch {
		throw new HttpsError(
			'internal',
			`SimpleFIN returned non-JSON: ${text.slice(0, 200)}`
		);
	}
}

function applyMerchantRules(
	rawDescription: string,
	rules: MerchantRule[]
): { categoryId: string | null; displayName: string | null } {
	const sorted = [...rules].sort((a, b) => b.priority - a.priority);
	for (const r of sorted) {
		const target = rawDescription.toLowerCase();
		const pattern = r.pattern.toLowerCase();
		let matched = false;
		try {
			if (r.matchType === 'contains') matched = target.includes(pattern);
			else if (r.matchType === 'startsWith') matched = target.startsWith(pattern);
			else if (r.matchType === 'regex') matched = new RegExp(r.pattern, 'i').test(rawDescription);
		} catch (err) {
			logger.warn('Bad merchant rule pattern', { ruleId: r.id, err: String(err) });
			continue;
		}
		if (matched) {
			return { categoryId: r.categoryId, displayName: r.displayName };
		}
	}
	return { categoryId: null, displayName: null };
}

function isoWeekNumber(d: Date): number {
	const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
	const dayNum = date.getUTCDay() || 7;
	date.setUTCDate(date.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
	return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function billPeriodKey(bill: Bill, txDate: Date): string {
	if (bill.recurrence === 'monthly') {
		return `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
	}
	if (bill.recurrence === 'yearly') {
		return `${txDate.getFullYear()}`;
	}
	return `${txDate.getFullYear()}-W${String(isoWeekNumber(txDate)).padStart(2, '0')}`;
}

const AUTO_LINK_AMOUNT_TOLERANCE = 1.0;
const AUTO_LINK_DAY_WINDOW = 5;

/** Best-effort cleanup of common SimpleFIN raw-description noise. */
function cleanDisplayName(raw: string): string {
	let s = raw;
	s = s.replace(/^(SQ \*|TST\*|POS DEBIT \d*|ACH\s+|ONLINE\s+)/i, '');
	s = s.replace(/\s{2,}/g, ' ').trim();
	s = s.replace(/\s+\d{4,}\s*$/, '');
	return s.trim() || raw;
}

// ── simpleFinConnect ───────────────────────────────────────────────────

export const simpleFinConnect = onCall(async (request) => {
	const uid = requireUid(request);
	try {
		return await runConnect(uid, request.data as { setupToken?: string });
	} catch (err) {
		if (err instanceof HttpsError) throw err;
		const message = err instanceof Error ? err.message : String(err);
		logger.error('simpleFinConnect unhandled', { uid, message });
		throw new HttpsError('internal', `Unexpected error: ${message}`);
	}
});

async function runConnect(
	uid: string,
	data: { setupToken?: string }
): Promise<{ connected: true; accounts: number; warnings?: string[] }> {
	const setupToken = data?.setupToken?.trim();
	if (!setupToken) {
		throw new HttpsError('invalid-argument', 'setupToken is required.');
	}

	let claimUrl: string;
	try {
		claimUrl = Buffer.from(setupToken, 'base64').toString('utf8').trim();
	} catch {
		throw new HttpsError('invalid-argument', 'setupToken is not valid base64.');
	}
	if (!/^https?:\/\//.test(claimUrl)) {
		throw new HttpsError('invalid-argument', 'setupToken does not decode to a URL.');
	}

	logger.info('SimpleFIN connect: claiming token', { uid, claimHost: new URL(claimUrl).host });

	const claimResp = await fetch(claimUrl, { method: 'POST' });
	if (!claimResp.ok) {
		const text = await claimResp.text();
		throw new HttpsError(
			'internal',
			`Claim request failed (${claimResp.status}): ${text.slice(0, 200)}`
		);
	}
	const accessUrl = (await claimResp.text()).trim();
	if (!/^https?:\/\//.test(accessUrl)) {
		throw new HttpsError('internal', 'SimpleFIN did not return a valid access URL.');
	}

	// Persist the access URL *before* we hit any other endpoint. The setup
	// token is single-use; if we lose the access URL here it can't be
	// recovered without re-issuing a setup token.
	await privateDoc(uid).set(
		{
			accessUrl,
			accessHost: safeAccessHost(accessUrl),
			connectedAt: new Date().toISOString(),
			lastSyncAt: null,
			lastSyncEpoch: null
		},
		{ merge: true }
	);
	logger.info('SimpleFIN connect: access URL stored', { uid });

	const accountsResp = await fetchSimpleFin(accessUrl);
	if (accountsResp.errors?.length) {
		logger.warn('SimpleFIN returned errors', { uid, errors: accountsResp.errors });
	}

	const batch = db.batch();
	for (const a of accountsResp.accounts ?? []) {
		batch.set(
			db.doc(`users/${uid}/accounts/${a.id}`),
			{
				name: a.name,
				institution: a.org?.name ?? '',
				mask: maskFromAccountId(a.id),
				currency: a.currency ?? 'USD',
				balance: parseFloat(a.balance ?? '0'),
				availableBalance: parseFloat(a['available-balance'] ?? a.balance ?? '0'),
				balanceDate: a['balance-date']
					? new Date(a['balance-date'] * 1000).toISOString()
					: null,
				lastSync: new Date().toISOString()
			},
			{ merge: true }
		);
	}
	await batch.commit();

	logger.info('SimpleFIN connect: accounts written', {
		uid,
		count: accountsResp.accounts?.length ?? 0
	});

	return {
		connected: true,
		accounts: accountsResp.accounts?.length ?? 0,
		...(accountsResp.errors?.length ? { warnings: accountsResp.errors } : {})
	};
}

// ── simpleFinSync ──────────────────────────────────────────────────────

export const simpleFinSync = onCall(async (request) => {
	const uid = requireUid(request);
	try {
		return await runSync(uid);
	} catch (err) {
		if (err instanceof HttpsError) throw err;
		const message = err instanceof Error ? err.message : String(err);
		logger.error('simpleFinSync unhandled', { uid, message });
		throw new HttpsError('internal', `Unexpected error: ${message}`);
	}
});

async function runSync(uid: string) {
	const priv = await privateDoc(uid).get();
	if (!priv.exists) {
		throw new HttpsError('failed-precondition', 'No SimpleFIN connection. Connect first.');
	}
	const accessUrl = priv.get('accessUrl') as string | undefined;
	if (!accessUrl) {
		throw new HttpsError('failed-precondition', 'Stored access URL is missing.');
	}
	const lastSyncEpoch = (priv.get('lastSyncEpoch') as number | null) ?? null;

	// Default to 90 days back on first sync to seed history without going wild.
	const startEpoch = lastSyncEpoch ?? Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;
	const newCursor = Math.floor(Date.now() / 1000);

	const result = await fetchSimpleFin(accessUrl, startEpoch);
	if (result.errors?.length) {
		logger.warn('SimpleFIN returned errors during sync', { uid, errors: result.errors });
	}

	const rulesSnap = await db.collection(`users/${uid}/merchantRules`).get();
	const rules: MerchantRule[] = rulesSnap.docs.map((d) => ({
		id: d.id,
		...(d.data() as Omit<MerchantRule, 'id'>)
	}));

	const settingsSnap = await db.doc(`users/${uid}/meta/settings`).get();
	const transferCategoryId = await (async () => {
		const cats = await db
			.collection(`users/${uid}/categories`)
			.where('isTransferCategory', '==', true)
			.limit(1)
			.get();
		return cats.empty ? null : cats.docs[0].id;
	})();

	// Load active bills + existing payments for auto-linking.
	const billsSnap = await db
		.collection(`users/${uid}/bills`)
		.where('isActive', '==', true)
		.get();
	const activeBills: Bill[] = billsSnap.docs.map((d) => ({
		id: d.id,
		...(d.data() as Omit<Bill, 'id'>)
	}));
	const paymentsSnap = await db.collection(`users/${uid}/billPayments`).get();
	const paidKeys = new Set(
		paymentsSnap.docs.map((d) => `${d.get('billId')}|${d.get('periodKey')}`)
	);

	const newlyImported: StoredTransaction[] = [];

	let imported = 0;
	let updated = 0;
	let billsAutoLinked = 0;
	const accountsBatch = db.batch();
	for (const a of result.accounts) {
		accountsBatch.set(
			db.doc(`users/${uid}/accounts/${a.id}`),
			{
				name: a.name,
				institution: a.org?.name ?? '',
				mask: maskFromAccountId(a.id),
				currency: a.currency ?? 'USD',
				balance: parseFloat(a.balance ?? '0'),
				availableBalance: parseFloat(a['available-balance'] ?? a.balance ?? '0'),
				balanceDate: a['balance-date']
					? new Date(a['balance-date'] * 1000).toISOString()
					: null,
				lastSync: new Date().toISOString()
			},
			{ merge: true }
		);

		for (const t of a.transactions ?? []) {
			const txRef = db.doc(`users/${uid}/transactions/${encodeURIComponent(t.id)}`);
			const existing = await txRef.get();
			const ruleHit = applyMerchantRules(t.description, rules);
			const fallbackName = cleanDisplayName(t.description);
			const amount = parseFloat(t.amount);
			const postedDate = new Date((t.transacted_at ?? t.posted) * 1000).toISOString();
			const isTransfer = ruleHit.categoryId === transferCategoryId && transferCategoryId !== null;

			if (existing.exists) {
				const patch: Record<string, unknown> = {
					amount,
					rawDescription: t.description,
					pending: !!t.pending,
					updatedAt: new Date().toISOString()
				};
				if (existing.get('pending') === true && !t.pending) {
					patch.postedDate = postedDate;
				}
				await txRef.set(patch, { merge: true });
				updated += 1;
			} else {
				const displayName = ruleHit.displayName ?? existing.get('displayName') ?? fallbackName;
				const txDocId = encodeURIComponent(t.id);
				await txRef.set({
					accountId: a.id,
					postedDate,
					amount,
					rawDescription: t.description,
					displayName,
					categoryId: ruleHit.categoryId ?? null,
					isTransfer,
					pending: !!t.pending,
					simpleFinId: t.id,
					dedupeKey: t.id,
					notes: t.memo ?? '',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				});
				imported += 1;
				newlyImported.push({
					id: txDocId,
					accountId: a.id,
					postedDate,
					amount,
					categoryId: ruleHit.categoryId ?? null,
					displayName,
					pending: !!t.pending
				});

				// Bill auto-link: if this transaction matches an active unpaid bill,
				// create a BillPayment and mark the bill paid for the period.
				if (ruleHit.categoryId && amount < 0) {
					const linked = await tryAutoLinkBill(uid, {
						id: txDocId,
						amount,
						postedDate,
						categoryId: ruleHit.categoryId
					}, activeBills, paidKeys);
					if (linked) billsAutoLinked += 1;
				}
			}
		}
	}
	await accountsBatch.commit();

	const transferSuggestions = await detectTransferSuggestions(uid, newlyImported);

	await privateDoc(uid).set(
		{ lastSyncAt: new Date().toISOString(), lastSyncEpoch: newCursor },
		{ merge: true }
	);

	if (settingsSnap.exists) {
		await db
			.doc(`users/${uid}/meta/settings`)
			.set({ lastSimpleFinSync: new Date().toISOString() }, { merge: true });
	} else {
		await db
			.doc(`users/${uid}/meta/settings`)
			.set({ lastSimpleFinSync: new Date().toISOString() }, { merge: true });
	}

	logger.info('SimpleFIN sync complete', {
		uid,
		imported,
		updated,
		billsAutoLinked,
		transferSuggestions
	});
	return {
		imported,
		updated,
		accounts: result.accounts?.length ?? 0,
		billsAutoLinked,
		transferSuggestions
	};
}

async function tryAutoLinkBill(
	uid: string,
	tx: { id: string; amount: number; postedDate: string; categoryId: string },
	activeBills: Bill[],
	paidKeys: Set<string>
): Promise<boolean> {
	const txAmount = Math.abs(tx.amount);
	const txDate = new Date(tx.postedDate);
	for (const bill of activeBills) {
		if (bill.categoryId !== tx.categoryId) continue;
		if (Math.abs(bill.amount - txAmount) > AUTO_LINK_AMOUNT_TOLERANCE) continue;

		const expected = new Date(txDate.getFullYear(), txDate.getMonth(), bill.dueDay);
		const daysDiff = Math.abs((txDate.getTime() - expected.getTime()) / 86400000);
		if (daysDiff > AUTO_LINK_DAY_WINDOW) continue;

		const periodKey = billPeriodKey(bill, txDate);
		const key = `${bill.id}|${periodKey}`;
		if (paidKeys.has(key)) continue;

		await db.collection(`users/${uid}/billPayments`).add({
			billId: bill.id,
			periodKey,
			amount: txAmount,
			paidDate: tx.postedDate,
			transactionId: tx.id,
			autoLinked: true
		});
		paidKeys.add(key);
		logger.info('Bill auto-linked', { uid, billId: bill.id, periodKey, txId: tx.id });
		return true;
	}
	return false;
}

const TRANSFER_DAY_WINDOW = 3;
const TRANSFER_AMOUNT_TOLERANCE = 0.01;

/**
 * For each newly-imported transaction with no category yet, look for an
 * opposite-sign tx of the same amount in another account within 3 days.
 * If we find a pair, tag both with `transferSuggested: true` so the
 * client can show a confirmation prompt. We never auto-categorize.
 */
async function detectTransferSuggestions(
	uid: string,
	newRows: StoredTransaction[]
): Promise<number> {
	const candidates = newRows.filter((r) => r.categoryId === null);
	if (candidates.length === 0) return 0;

	let suggested = 0;
	const seen = new Set<string>();

	for (const a of candidates) {
		if (seen.has(a.id)) continue;
		const aDate = new Date(a.postedDate);
		const lo = new Date(aDate.getTime() - TRANSFER_DAY_WINDOW * 86400000).toISOString();
		const hi = new Date(aDate.getTime() + TRANSFER_DAY_WINDOW * 86400000).toISOString();

		const others = await db
			.collection(`users/${uid}/transactions`)
			.where('postedDate', '>=', lo)
			.where('postedDate', '<=', hi)
			.where('categoryId', '==', null)
			.get();

		for (const doc of others.docs) {
			if (doc.id === a.id) continue;
			const accountId = doc.get('accountId') as string;
			if (accountId === a.accountId) continue;
			const amount = doc.get('amount') as number;
			if (Math.abs(amount + a.amount) > TRANSFER_AMOUNT_TOLERANCE) continue;
			if (seen.has(doc.id)) continue;

			seen.add(a.id);
			seen.add(doc.id);

			const aRef = db.doc(`users/${uid}/transactions/${a.id}`);
			const bRef = doc.ref;
			await aRef.set({ transferSuggested: true, transferPairId: doc.id }, { merge: true });
			await bRef.set({ transferSuggested: true, transferPairId: a.id }, { merge: true });
			suggested += 1;
			logger.info('Transfer pair flagged', { uid, a: a.id, b: doc.id });
			break;
		}
	}
	return suggested;
}

// ── simpleFinScheduledSync ─────────────────────────────────────────────

/**
 * Daily auto-pull for every user with a SimpleFIN connection. Runs at
 * 06:00 America/Los_Angeles via Cloud Scheduler (pub/sub backed).
 *
 * Each connection lives at /users/{uid}/__private/simplefin, so we use a
 * collection-group query to enumerate them without keeping a separate
 * top-level index. Each user's sync runs in its own try/catch so a single
 * failure doesn't poison the rest.
 */
export const simpleFinScheduledSync = onSchedule(
	{
		schedule: 'every day 06:00',
		timeZone: 'America/Los_Angeles',
		retryCount: 1
	},
	async () => {
		const start = Date.now();
		const snap = await db.collectionGroup('__private').get();

		let users = 0;
		let imported = 0;
		let updated = 0;
		let failed = 0;

		for (const doc of snap.docs) {
			if (doc.ref.id !== 'simplefin') continue;
			const uidRef = doc.ref.parent.parent;
			if (!uidRef) continue;
			const uid = uidRef.id;
			users += 1;
			try {
				const result = await runSync(uid);
				imported += result.imported;
				updated += result.updated;
			} catch (err) {
				failed += 1;
				const message = err instanceof Error ? err.message : String(err);
				logger.error('Scheduled sync failed for user', { uid, message });
			}
		}

		logger.info('Scheduled SimpleFIN sync complete', {
			users,
			imported,
			updated,
			failed,
			ms: Date.now() - start
		});
	}
);

// ── simpleFinDisconnect ────────────────────────────────────────────────

export const simpleFinDisconnect = onCall(async (request) => {
	const uid = requireUid(request);
	try {
		const accountsSnap = await db.collection(`users/${uid}/accounts`).get();
		const batch = db.batch();
		for (const d of accountsSnap.docs) batch.delete(d.ref);
		await batch.commit();

		await privateDoc(uid).delete();
		await db
			.doc(`users/${uid}/meta/settings`)
			.set({ lastSimpleFinSync: FieldValue.delete() }, { merge: true });

		return { disconnected: true };
	} catch (err) {
		if (err instanceof HttpsError) throw err;
		const message = err instanceof Error ? err.message : String(err);
		logger.error('simpleFinDisconnect unhandled', { uid, message });
		throw new HttpsError('internal', `Unexpected error: ${message}`);
	}
});
