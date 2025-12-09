import { AppSidebar } from '@/src/app/components/app-sidebar';
import { SidebarProvider } from '@/src/app/components/design-components/sidebar';
import { Header } from './components/header';

export function AppNav({ children }: { children: React.ReactNode }) {
	return (
		<SidebarProvider defaultOpen={false}>
			<AppSidebar />
			<main className="flex-1 flex flex-col">
				<Header />
				<div className="flex-1 px-3 sm:px-6 lg:px-12 py-4 sm:py-6">{children}</div>
			</main>
		</SidebarProvider>
	);
}
