import { Link } from '@tanstack/react-router';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from './design-components/sidebar';

const menuItems = {
	// General Pages
	general: [{ name: 'Home', link: '/' }],
	// Statistics and Workflow Information
	stats: [{ name: 'Workflow List', link: '/workflow-list' }],
};

export function AppSidebar() {
	const { state, open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar } = useSidebar();
	return (
		<Sidebar>
			<SidebarHeader />
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>General</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{menuItems.general.map((item) => (
								<SidebarMenuItem key={item.name}>
									<SidebarMenuButton asChild>
										<Link to={item.link} activeProps={{ style: { fontWeight: 'bold' } }}>
											{item.name}
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarGroup />
				<SidebarGroup>
					<SidebarGroupLabel>Statistics and Workflow Information</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{menuItems.stats.map((item) => (
								<SidebarMenuItem key={item.name}>
									<SidebarMenuButton asChild>
										<Link to={item.link} activeProps={{ style: { fontWeight: 'bold' } }}>
											{item.name}
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarGroup />
			</SidebarContent>
			<SidebarFooter />
		</Sidebar>
	);
}
