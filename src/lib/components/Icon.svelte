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
		PieChart,
		User,
		Check,
		X,
		ChevronRight,
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
		type IconProps
	} from 'lucide-svelte';

	type Props = {
		name: string;
		size?: number;
		strokeWidth?: number;
		class?: string;
	} & IconProps;

	let { name, size = 20, strokeWidth = 2, class: className = '', ...rest }: Props = $props();

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
		'pie-chart': PieChart,
		user: User,
		check: Check,
		x: X,
		'chevron-right': ChevronRight,
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
		'help-circle': HelpCircle
	};

	let Component = $derived(map[name] ?? HelpCircle);
</script>

<Component {size} {strokeWidth} class={className} {...rest} />
