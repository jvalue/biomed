import { CreateAbility, PureAbility } from '@casl/ability';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { UserDto } from '@/src/app/api/dto/user/user.dto';
import { managementBackendClient } from '../api/management-backend-client';

type AppAbility = PureAbility;

interface AuthContextType {
	user: UserDto | null;
	ability: AppAbility;
	login: (username: string, password: string) => Promise<void>;
	register: (username: string, password: string) => Promise<void>;
	logout: () => void;
	isLoading: boolean;
	isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const createAppAbility: CreateAbility<AppAbility> = (rules: any[] = []) => new PureAbility(rules);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<UserDto | null>(null);
	const [ability, setAbility] = useState<AppAbility>(createAppAbility());
	const [isLoading, setIsLoading] = useState<boolean>(true);

	useEffect(() => {
		const token = localStorage.getItem('accessToken');
		if (token) {
			fetchUserProfile(token);
		} else {
			setIsLoading(false);
		}
	}, []);

	const fetchUserProfile = async (token: string) => {
		try {
			const response = await managementBackendClient.get('/auth/me');
			const data = response.data;
			setUser(data.user);
			setAbility(new PureAbility(data.abilityRules));
		} catch (error) {
			console.error('Failed to fetch user profile:', error);
			localStorage.removeItem('accessToken');
		} finally {
			setIsLoading(false);
		}
	};

	const login = async (username: string, password: string) => {
		const response = await managementBackendClient.post('/auth/login', { username, password });
		const data = response.data;
		localStorage.setItem('accessToken', data.accessToken);
		setUser(data.user);
		setAbility(new PureAbility(data.abilityRules));
	};

	const register = async (username: string, password: string) => {
		const response = await managementBackendClient.post('/auth/register', { username, password });
		const data = response.data;
		localStorage.setItem('accessToken', data.accessToken);
		setUser(data.user);
		setAbility(new PureAbility(data.abilityRules));
	};

	const logout = () => {
		localStorage.removeItem('accessToken');
		setUser(null);
		setAbility(createAppAbility());
	};

	return (
		<AuthContext.Provider
			value={{ user, ability, login, register, logout, isAuthenticated: !!user, isLoading }}
		>
			{children}
		</AuthContext.Provider>
	);
}

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) throw new Error('useAuth must be used within AuthProvider');
	return context;
};
