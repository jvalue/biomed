import { Link } from '@tanstack/react-router';

export function AppNav() {
	return (
		<nav>
			<ul>
				<li>
					<Link to="/" activeProps={{ style: { fontWeight: 'bold' } }}>
						Home
					</Link>
				</li>
				<li>
					<Link to="/about" activeProps={{ style: { fontWeight: 'bold' } }}>
						About
					</Link>
				</li>
			</ul>
		</nav>
	);
}
