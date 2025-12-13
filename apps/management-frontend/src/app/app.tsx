import { Outlet } from '@tanstack/react-router';
import { AppNav } from './app-nav';

export default function App() {
	return (
		<div className="app">
			<AppNav>
				<Outlet />
			</AppNav>
		</div>
	);
}
