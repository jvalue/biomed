import { Outlet } from '@tanstack/react-router';
import { AppNav } from './app-nav';

export default function App({ children }: { children: React.ReactNode }) {
	return (
		<div className="app">
			<AppNav>{children}</AppNav>
			<hr />
			<Outlet />
			<hr />
		</div>
	);
}
