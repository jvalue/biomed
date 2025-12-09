import { AppSidebar } from '@/src/app/components/app-sidebar';
import { SidebarProvider, SidebarTrigger } from '@/src/app/components/design-components/sidebar';

export function AppNav({ children }: { children: React.ReactNode }) {
	return (
		<SidebarProvider>
			<AppSidebar />
			<main>
				<SidebarTrigger />
				{children}
			</main>
		</SidebarProvider>
	);
}
