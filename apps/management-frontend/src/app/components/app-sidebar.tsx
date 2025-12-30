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
} from './design-components/sidebar';

export function AppSidebar() {
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
									<Link
										to="/"
										activeProps={{ style: { fontWeight: 'bold' } }}
										activeOptions={{ exact: true }}
									>
										Home
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<Can ability={ability} I="read" a="crawler-run">
					<SidebarGroup>
						<SidebarGroupLabel>Statistics and Run Information</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								<SidebarMenuItem key="crawler-runs">
									<SidebarMenuButton asChild>
										<Link
											to="/crawler-runs"
											activeProps={{ style: { fontWeight: 'bold' } }}
											activeOptions={{ exact: true }}
										>
											Crawler Runs
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</Can>
				<Can ability={ability} I="read" a="crawler-template">
					<SidebarGroup>
						<SidebarGroupLabel>Orchestration</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								<SidebarMenuItem key="crawler-templates">
									<SidebarMenuButton asChild>
										<Link
											to="/crawler-templates"
											activeProps={{ style: { fontWeight: 'bold' } }}
											activeOptions={{ exact: true }}
										>
											Crawler Templates
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
								<Can ability={ability} I="read" a="schedule">
									<SidebarMenuItem key="schedules">
										<SidebarMenuButton asChild>
											<Link
												to="/schedules"
												activeProps={{ style: { fontWeight: 'bold' } }}
												activeOptions={{ exact: true }}
											>
												Schedules
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								</Can>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</Can>
				<Can ability={ability} I="read" a="user">
					<SidebarGroup>
						<SidebarGroupLabel>Admin Section</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								<SidebarMenuItem key="admin">
									<SidebarMenuButton asChild>
										<Link
											to="/admin"
											activeProps={{ style: { fontWeight: 'bold' } }}
											activeOptions={{ exact: true }}
										>
											Admin Overview
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
								<SidebarMenuItem key="admin-user-management">
									<SidebarMenuButton asChild>
										<Link
											to="/admin/user-management"
											activeProps={{ style: { fontWeight: 'bold' } }}
											activeOptions={{ exact: true }}
										>
											User Management
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
