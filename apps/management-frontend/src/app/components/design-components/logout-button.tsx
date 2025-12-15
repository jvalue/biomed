import { Button } from '@/src/app/components/design-components/button';
import { useAuth } from '@/src/app/contexts/AuthContext';

export function LogoutButton() {
	const { logout } = useAuth();

	const handleLogout = () => {
		logout();
	};

	return (
		<Button variant={'destructive'} onClick={handleLogout}>
			Abmelden
		</Button>
	);
}
