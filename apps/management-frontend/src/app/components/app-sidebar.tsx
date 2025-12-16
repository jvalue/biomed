import { Can } from '@casl/react';
import { Link } from '@tanstack/react-router';
import { useAuth } from '@/src/app/contexts/AuthContext';
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

export function AppSidebar() {
	const { state, open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar } = useSidebar();
	const { ability } = useAuth();
	return (
		<Sidebar>
			<SidebarHeader />
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>General</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem key="home">
								<SidebarMenuButton asChild>
									<Link to="/" activeProps={{ style: { fontWeight: 'bold' } }}>
										Home
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<Can ability={ability} I="read" a="workflow">
					<SidebarGroup>
						<SidebarGroupLabel>Statistics and Workflow Information</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								<SidebarMenuItem key="workflow-list">
									<SidebarMenuButton asChild>
										<Link to="/workflow-list" activeProps={{ style: { fontWeight: 'bold' } }}>
											Workflow List
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</Can>
				<Can ability={ability} I="read" a="template">
					<SidebarGroup>
						<SidebarGroupLabel>Orchestration</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								<SidebarMenuItem key="workflow-templates">
									<SidebarMenuButton asChild>
										<Link to="/workflow-templates" activeProps={{ style: { fontWeight: 'bold' } }}>
											Workflow Templates
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</Can>
				<Can ability={ability} I="read" a="user">
					<SidebarGroup>
						<SidebarGroupLabel>Admin Sections</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								<SidebarMenuItem key="admin">
									<SidebarMenuButton asChild>
										<Link to="/admin" activeProps={{ style: { fontWeight: 'bold' } }}>
											Admin Page
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</Can>
			</SidebarContent>
			<SidebarFooter />
		</Sidebar>
	);
}
