import { Outlet, createRootRoute } from '@tanstack/react-router';
import { Titlebar } from '@/components/titlebar';

export const Route = createRootRoute({
	component: () => {
		return (
			<>
				<Titlebar />
				<Outlet />
			</>
		);
	},
});
