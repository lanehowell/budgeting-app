/**
 * One-off icon generator. Produces the PNG icons referenced by the PWA
 * manifest and Apple touch icon — a centered black dot on a white squircle.
 *
 *   npm run gen:icons
 *
 * Outputs to /static so they're served at /icon-192.png etc.
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, '../static');

function svg(size) {
	const radius = size * 0.22;
	const dot = size * 0.18;
	return `
		<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
			<rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#FAFAF8"/>
			<circle cx="${size / 2}" cy="${size / 2}" r="${dot}" fill="#0A0A0A"/>
		</svg>
	`.trim();
}

const targets = [
	{ name: 'icon-192.png', size: 192 },
	{ name: 'icon-512.png', size: 512 },
	{ name: 'apple-touch-icon.png', size: 180 },
	{ name: 'icon-192-maskable.png', size: 192, maskable: true },
	{ name: 'icon-512-maskable.png', size: 512, maskable: true }
];

for (const t of targets) {
	const buf = Buffer.from(svg(t.size));
	await sharp(buf).png().toFile(resolve(out, t.name));
	console.log(`Wrote ${t.name} (${t.size}×${t.size})`);
}
