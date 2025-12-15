import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/src/app/components/design-components/card';
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@/src/app/components/design-components/tabs';
import { LoginForm } from '@/src/app/components/login/login-form';

export function Login() {
	return (
		<div className="grid grid-cols-12 gap-4">
			<Card className="col-span-6 col-start-4">
				<Tabs defaultValue="login">
					<CardHeader>
						<CardTitle className="w-full">
							<TabsList className="w-full">
								<TabsTrigger value="login" className="w-1/2">
									Login
								</TabsTrigger>
								<TabsTrigger value="register" className="w-1/2">
									Register
								</TabsTrigger>
							</TabsList>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<TabsContent value="login">
							<LoginForm />
						</TabsContent>
						<TabsContent value="register"></TabsContent>
					</CardContent>
				</Tabs>
			</Card>
		</div>
	);
}
