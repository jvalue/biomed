import { AppSidebar } from '@/src/app/components/app-sidebar';
import { SidebarProvider } from '@/src/app/components/design-components/sidebar';
import { Header } from './components/header';

export function AppNav({ children }: { children: React.ReactNode }) {
	return (
		<SidebarProvider defaultOpen={false}>
			<AppSidebar />
			<main className="flex-1 flex flex-col">
				<Header />
				<div className="flex-1 py-4 sm:py-6">
					<div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="grid grid-cols-12 gap-4">
							<div className="col-span-12">{children}</div>
						</div>
					</div>
				</div>
			</main>
		</SidebarProvider>
	);
}
