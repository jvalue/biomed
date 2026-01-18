import { ParameterDto } from '@/src/app/api/dto/crawler-runs/parameter.dto';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/src/app/components/design-components/card';

export default function ParameterSectionComponent({ parameters }: { parameters?: ParameterDto[] }) {
	return (
		<Card className="shadow-lg">
			<CardHeader className="border-b">
				<CardTitle className="text-xl">Parameters</CardTitle>
				<CardDescription>Configured parameters</CardDescription>
			</CardHeader>
			<CardContent className="pt-6">
				{parameters && parameters.length > 0 ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
						{parameters.map((p) => (
							<div
								key={p.name}
								className="px-4 py-2 rounded-md bg-gray-100 border border-gray-200 text-sm"
							>
								<span className="font-semibold text-gray-900">{p.name}:</span>{' '}
								<span className="text-gray-700">{p.value}</span>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-muted-foreground">No parameters configured</p>
				)}
			</CardContent>
		</Card>
	);
}
