import { IoIosClose } from 'react-icons/io';
import { CiMinimize1, CiMaximize1 } from 'react-icons/ci';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect, useState } from 'react';

export const Titlebar = () => {
	const currentWindow = getCurrentWindow();
	const [isMaximized, setIsMaximized] = useState(false);

	useEffect(() => {
		currentWindow.isMaximized().then((isMaximized) => {
			setIsMaximized(isMaximized);
		});
	}, []);

	return (
		<div className="absolute w-full h-6 z-50">
			<div
				data-tauri-drag-region
				className="absolute w-[calc(100%-90px)] h-6"
			></div>
			<div className="flex items-center justify-between">
				<p className="text-white text-[13px] py-1 px-3">Meta-Launcher</p>
				<div className="flex pr-1 gap-1">
					<button
						title="minimize"
						onClick={() => currentWindow.minimize()}
						className="text-white flex items-center justify-center text-[17px] cursor-pointer w-[30px] h-[23px] hover:bg-[#31313173] hover:opacity-80 rounded-sm"
					>
						-
					</button>
					<button
						onClick={() => currentWindow.toggleMaximize()}
						className="cursor-pointer flex items-center justify-center w-[30px] h-[23px] hover:bg-[#31313173] hover:opacity-80 rounded-sm"
					>
						{isMaximized ? (
							<CiMinimize1 className="text-white" size={14} />
						) : (
							<CiMaximize1 className="text-white" size={14} />
						)}
					</button>
					<button
						onClick={() => currentWindow.close()}
						className="cursor-pointer flex items-center justify-center w-[30px] h-[23px] hover:bg-red-500 hover:opacity-80 rounded-sm"
					>
						<IoIosClose className="text-white text-[17px]" />
					</button>
				</div>
			</div>
		</div>
	);
};
