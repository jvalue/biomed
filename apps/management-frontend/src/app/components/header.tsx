// apps/management-frontend/src/app/components/header.tsx
import { Link } from '@tanstack/react-router';
import { Avatar, AvatarFallback } from '@/src/app/components/design-components/avatar';
import { SidebarTrigger } from '@/src/app/components/design-components/sidebar';

export function Header() {
	return (
		<div className="sticky top-0 z-30 flex h-16 sm:h-20 w-full items-center justify-between bg-background px-3 sm:px-6 lg:px-12 pb-2 pt-4 border-b border-sidebar-border">
			<div className="flex items-center gap-4">
				<SidebarTrigger />
			</div>
			<Link to="/">
				<h2 className="text-bold items-center text-lg sm:text-xl lg:text-2xl text-primary">
					<span className="hidden md:inline">Crawler Management</span>
				</h2>
			</Link>
			{/*Will be used for User Avatar*/}
			<Link to="/">
				<div className="h-9 w-9 sm:h-10 sm:w-10">
					<Avatar className="h-full w-full">
						<AvatarFallback>MM</AvatarFallback>
					</Avatar>
				</div>
			</Link>
		</div>
	);
}
