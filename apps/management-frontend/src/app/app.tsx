import { Outlet } from '@tanstack/react-router';
import { Snowfall } from 'react-snowfall';
import { AppNav } from './app-nav';

export default function App() {
	return (
		<div className="app">
			<Snowfall />
			<AppNav>
				<Outlet />
			</AppNav>
		</div>
	);
}
