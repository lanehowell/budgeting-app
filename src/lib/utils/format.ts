const currencyFormatter = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});

export function formatCurrency(amount: number): string {
	return currencyFormatter.format(amount);
}

export function formatSignedCurrency(amount: number): string {
	const formatted = currencyFormatter.format(Math.abs(amount));
	return amount < 0 ? `-${formatted}` : formatted;
}

export function formatDate(dateStr: string): string {
	const d = new Date(dateStr);
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateLong(dateStr: string): string {
	const d = new Date(dateStr);
	return d.toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
}

export function dueDayLabel(day: number): string {
	const suffix = (n: number) => {
		if (n >= 11 && n <= 13) return 'th';
		switch (n % 10) {
			case 1:
				return 'st';
			case 2:
				return 'nd';
			case 3:
				return 'rd';
			default:
				return 'th';
		}
	};
	return `${day}${suffix(day)}`;
}

