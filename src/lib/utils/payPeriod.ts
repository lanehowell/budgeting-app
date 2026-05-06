import type { PayPeriodType, Settings } from '$lib/types';

export type PeriodInfo = {
	type: PayPeriodType;
	start: Date;
	end: Date;
	key: string;
	daysElapsed: number;
	totalDays: number;
	label: {
		start: string;
		end: string;
		long: string;
	};
};

function startOfDay(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
	const r = new Date(d);
	r.setDate(r.getDate() + n);
	return r;
}

function isoWeekNumber(d: Date): number {
	const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
	const dayNum = date.getUTCDay() || 7;
	date.setUTCDate(date.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
	return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function shortLabel(d: Date): string {
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function defaults(now: Date = new Date()): Settings {
	return {
		payPeriodType: 'monthly',
		payPeriodStartDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
		payPeriodLength: 14,
		theme: 'system',
		defaultPage: 'bills',
		lastSimpleFinSync: null
	};
}

export const defaultSettings = defaults;

export function getCurrentPeriod(
	settings: Settings | null | undefined,
	now: Date = new Date()
): PeriodInfo {
	const type: PayPeriodType = settings?.payPeriodType ?? 'monthly';

	if (type === 'monthly') {
		const start = new Date(now.getFullYear(), now.getMonth(), 1);
		const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		const totalDays = end.getDate();
		const daysElapsed = Math.min(totalDays, now.getDate());
		const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
		return {
			type,
			start,
			end,
			key,
			daysElapsed,
			totalDays,
			label: {
				start: shortLabel(start),
				end: shortLabel(end),
				long: `${shortLabel(start)} – ${shortLabel(end)}`
			}
		};
	}

	const length =
		type === 'weekly' ? 7 : type === 'biweekly' ? 14 : Math.max(1, settings?.payPeriodLength ?? 14);

	const anchorISO = settings?.payPeriodStartDate;
	const anchor = startOfDay(
		anchorISO ? new Date(anchorISO) : new Date(now.getFullYear(), 0, 1)
	);
	const today = startOfDay(now);
	const daysSinceAnchor = Math.floor((today.getTime() - anchor.getTime()) / 86400000);
	const cycleIndex = Math.floor(daysSinceAnchor / length);
	const start = addDays(anchor, cycleIndex * length);
	const end = addDays(start, length - 1);
	const daysElapsed = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
	const totalDays = length;

	let key: string;
	if (type === 'weekly') {
		key = `${start.getFullYear()}-W${String(isoWeekNumber(start)).padStart(2, '0')}`;
	} else if (type === 'biweekly') {
		key = `${start.getFullYear()}-W${String(isoWeekNumber(start)).padStart(2, '0')}`;
	} else {
		key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
	}

	return {
		type,
		start,
		end,
		key,
		daysElapsed,
		totalDays,
		label: {
			start: shortLabel(start),
			end: shortLabel(end),
			long: `${shortLabel(start)} – ${shortLabel(end)}`
		}
	};
}

/**
 * Compute days from `now` until the next time a bill with `dueDay` (1–31)
 * comes due, scoped to the current period.
 *
 * For monthly periods this is the same as before — number of days until the
 * next occurrence in the current or next month.
 *
 * For non-monthly periods we treat dueDay as a calendar day each month and
 * compute days until that calendar day, regardless of which period it lands
 * in. (Bills are still month-recurring templates per SPEC.)
 */
export function daysUntilDueDay(dueDay: number, now: Date = new Date()): number {
	const today = startOfDay(now);
	let target = new Date(today.getFullYear(), today.getMonth(), dueDay);
	if (target.getTime() < today.getTime()) {
		target = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
	}
	const diff = target.getTime() - today.getTime();
	return Math.round(diff / 86400000);
}

/** Backwards-compat: monthly key for `now`. */
export function currentPeriodKey(now: Date = new Date()): string {
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, '0');
	return `${y}-${m}`;
}
