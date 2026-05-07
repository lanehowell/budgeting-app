<script lang="ts">
	import {
		ArrowLeftRight,
		ShoppingCart,
		Utensils,
		Coffee,
		Fuel,
		Zap,
		Home,
		Repeat,
		Package,
		Film,
		Undo2,
		Receipt,
		List,
		BarChart3,
		User,
		Check,
		X,
		ChevronRight,
		ChevronLeft,
		Layers,
		Plus,
		Pencil,
		Trash2,
		Search,
		Filter,
		MoreHorizontal,
		Sun,
		Moon,
		Monitor,
		RefreshCw,
		Tag,
		HelpCircle,
		Heart,
		Tv,
		Plane,
		Car,
		Wallet,
		ArrowDown,
		ArrowUp,
		Zap as Bolt
	} from 'lucide-svelte';

	type Props = {
		name: string;
		size?: number;
		strokeWidth?: number;
		class?: string;
	};

	let { name, size = 18, strokeWidth = 1.5, class: className = '' }: Props = $props();

	const map: Record<string, typeof Coffee> = {
		'arrow-left-right': ArrowLeftRight,
		'shopping-cart': ShoppingCart,
		utensils: Utensils,
		coffee: Coffee,
		fuel: Fuel,
		zap: Zap,
		home: Home,
		repeat: Repeat,
		package: Package,
		film: Film,
		'undo-2': Undo2,
		receipt: Receipt,
		list: List,
		'bar-chart': BarChart3,
		user: User,
		check: Check,
		x: X,
		'chevron-right': ChevronRight,
		'chevron-left': ChevronLeft,
		layers: Layers,
		plus: Plus,
		pencil: Pencil,
		'trash-2': Trash2,
		search: Search,
		filter: Filter,
		'more-horizontal': MoreHorizontal,
		sun: Sun,
		moon: Moon,
		monitor: Monitor,
		'refresh-cw': RefreshCw,
		tag: Tag,
		'help-circle': HelpCircle,
		heart: Heart,
		tv: Tv,
		plane: Plane,
		car: Car,
		wallet: Wallet,
		'arrow-down': ArrowDown,
		'arrow-up': ArrowUp,
		bolt: Bolt
	};

	let Component = $derived(map[name] ?? HelpCircle);
</script>

<Component {size} {strokeWidth} class={className} />
