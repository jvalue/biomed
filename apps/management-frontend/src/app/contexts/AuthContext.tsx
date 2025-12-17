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
		fetchUserProfile();
	}, []);

	const fetchUserProfile = async () => {
		try {
			const response = await managementBackendClient.get('/auth/me');
			const data = response.data;
			setUser(data.user);
			setAbility(new PureAbility(data.abilityRules));
		} catch (error: any) {
			if (error.response?.status === 401) {
				// Silent fail - User isn't logged in
				setUser(null);
				setAbility(createAppAbility());
			} else {
				console.error('Failed to fetch user profile:', error);
			}
		} finally {
			setIsLoading(false);
		}
	};

	/*
	 * Logs in a user with the given username and password.
	 */
	const login = async (username: string, password: string) => {
		const response = await managementBackendClient.post('/auth/login', { username, password });
		const data = response.data;
		// Token is set via Cookie HttpOnly, so no need to store it in localStorage
		setUser(data.user);
		setAbility(new PureAbility(data.abilityRules));
	};

	/*
	 * Logs out the current user.
	 */
	const logout = async () => {
		await managementBackendClient.post('/auth/logout');
		setUser(null);
		setAbility(createAppAbility());
	};

	/*
	 * Registers a new user with the given username and password.
	 */
	const register = async (username: string, password: string) => {
		// There is nothing more to do here since registration does not log in the user
		await managementBackendClient.post('/auth/register', { username, password });
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
