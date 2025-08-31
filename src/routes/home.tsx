import { HomePage } from '@/pages/Home';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/home')({
	component: RouteComponent,
});

function RouteComponent() {
	return <HomePage />;
}
