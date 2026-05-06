import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			devOptions: { enabled: false },
			manifest: {
				name: 'Budget',
				short_name: 'Budget',
				description: 'A personal budget that doesn\'t guess.',
				theme_color: '#FAFAF8',
				background_color: '#FAFAF8',
				display: 'standalone',
				orientation: 'portrait',
				start_url: '/bills',
				scope: '/',
				icons: [
					{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
					{ src: '/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
					{ src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
				]
			}
		})
	]
});
