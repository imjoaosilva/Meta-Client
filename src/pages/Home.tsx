import { Backgrounds } from '@/@types/background';
import { useLauncher } from '@/contexts/launcher';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { IoIosSettings } from 'react-icons/io';
import { TbSeparator } from 'react-icons/tb';
import { FaDiscord, FaTwitter, FaDownload, FaRocket } from 'react-icons/fa';
import { AiFillInstagram } from 'react-icons/ai';
import { FaGithub } from 'react-icons/fa';
import { CiLogout } from 'react-icons/ci';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { app } from '@tauri-apps/api';

const teamMembers = [
  { name: 'Z4', role: 'Developer' },
  { name: 'Baques', role: 'Administrator' },
  { name: 'Kalil', role: 'Mapper / Designer / Cutcene Maker' },
  { name: 'Yeps', role: 'Principal Lore Maker' },
  { name: 'Kiyo', role: 'Lore Maker' },
  { name: 'Belbi', role: 'Skin/Lore Maker' },
  { name: 'Yoruno', role: 'Modpack Manager' },
  { name: 'Twi (Hells Angels)', role: 'Skin Maker' },
  { name: 'Ark', role: 'Creative Thinker' },
];

export const HomePage = () => {
  const {
    userSettings,
    Logout,
    LaunchMinecraft,
    progressStatus,
    progressMessage,
    progressCurrent,
    progressTotal,
  } = useLauncher();

  const [version, setVersion] = useState('');
  const [clickCount, setClickCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const backgroundRef = useRef(
    Backgrounds[Math.floor(Math.random() * Backgrounds.length)],
  );

  useEffect(() => {
    app.getVersion().then(setVersion);
  }, []);

  const handleButtonClick = () => {
    if (progressStatus === 'launch' || progressStatus === 'done') {
      LaunchMinecraft();
    } else {
      toast('Operation in progress!', { position: 'top-center' });
    }
  };

  const handleEaster01 = () => {
    setClickCount(clickCount + 1);
  };

  const getButtonContent = () => {
    switch (progressStatus) {
      case 'launch':
        return <><FaRocket /> Launch</>;
      case 'launching':
        return <><FaRocket /> Launching...</>;
      case 'downloading':
        return <><FaDownload /> Downloading...</>;
      case 'installing':
        return <><FaDownload /> Installing...</>;
      case 'done':
        return <><FaRocket /> Launched</>;
      default:
        return <><FaRocket /> Launch</>;
    }
  };

  const percent =
    progressTotal > 0 ? (progressCurrent / progressTotal) * 100 : 0;

  return (
    <motion.div
      className="w-full min-h-screen flex flex-col justify-between"
      initial={{ scale: 1 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: window.location.pathname === '/' ? 1.03 : 1 }}
      transition={{ duration: 1, ease: 'easeInOut' }}
      style={{
        background: `
          linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.8)), 
          url(${backgroundRef.current}) center/cover no-repeat
        `,
      }}
    >
      <AnimatePresence mode="wait">
        {!showSettings ? (
          <motion.div
            key="homepage-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col flex-1 justify-between xl:justify-center xl:max-h-[calc(100vh-50px)]"
          >
            <div className="flex lg:flex-row justify-between mt-12 xl:mt-0 px-6 lg:px-12 gap-8 text-white">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col gap-6 w-full max-w-xs"
              >
                <h2 className="text-lg font-bold border-b border-white pb-1 mb-2">
                  Team
                </h2>
                <ul className="flex flex-col gap-2 w-full xl:gap-3">
                  {teamMembers.map((member) => (
                    <li
                      key={member.name}
                      className="flex justify-between items-center w-full px-3 py-1 rounded bg-[#30303056] hover:bg-white/20 transition-colors"
                    >
                      <span className="font-medium opacity-70 text-sm xl:text-[16px]">{member.name}</span>
                      <span className="text-xs opacity-70 xl:text-[14px]">{member.role}</span>
                    </li>
                  ))}
                </ul>
                <div className="text-[11px] opacity-70 xl:text-[13px]">
                  Launcher Beta V{version || '...'} <span>📦</span>
                </div>
              </motion.div>

              <div className="flex flex-col items-center gap-4 xl:gap-6">
                <motion.img
                  onClick={handleEaster01}
                  src={clickCount < 9 ? `https://mineskin.eu/avatar/${userSettings.username}` : `https://mineskin.eu/bust/${userSettings.username}/100.png`}
                  className="w-8 h-8 xl:w-9 xl:h-9 2xl:w-12 2xl:h-12 rounded-sm"
                />
                <p className="text-white text-sm font-semibold">{userSettings.username}</p>

                <Tooltip>
                  <TooltipTrigger>
                    <IoIosSettings
                      size={20}
                      color="white"
                      className="cursor-pointer hover:opacity-55 transition-opacity 2xl:w-6 2xl:h-6"
                      onClick={() => setShowSettings(true)}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Settings</p>
                  </TooltipContent>
                </Tooltip>

                <TbSeparator size={20} color="white" />
                <FaDiscord className="cursor-pointer hover:opacity-55 2xl:w-5 2xl:h-5" size={20} color="white" />
                <FaTwitter className="cursor-pointer hover:opacity-55 2xl:w-5 2xl:h-5" size={20} color="white" />
                <AiFillInstagram className="cursor-pointer hover:opacity-55 2xl:w-5 2xl:h-5" size={20} color="white" />
                <FaGithub className="cursor-pointer hover:opacity-55 mb-4 2xl:w-5 2xl:h-5" size={20} color="white" />
                <Tooltip>
                  <TooltipTrigger>
                    <CiLogout
                      size={20}
                      color="white"
                      className="cursor-pointer hover:opacity-55 2xl:w-5 2xl:h-5"
                      onClick={Logout}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Logout</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="px-6 lg:px-12 mt-3 flex gap-3 mb-6 items-center xl:absolute bottom-0 w-full">
              <div className="flex justify-between text-white text-xs">
                <span>{percent === 0 ? '0%' : ''}</span>
                <span>{percent === 100 ? '100%' : ' '}</span>
              </div>

              <div className="relative w-full">
                <Progress
                  className="[&>*]:bg-linear-to-r [&>*]:from-[#3F70DD] [&>*]:to-[#B377F3] h-1 lg:h-2 bg-[#323538] rounded"
                  value={percent}
                  max={100}
                />
                {percent > 0 && percent < 100 && (
                  <div
                    className="absolute -top-6 flex flex-col items-center"
                    style={{ left: `${percent}%`, transform: 'translateX(-50%)' }}
                  >
                    <span className="text-white text-[10px] font-semibold">
                      {Math.round(percent)}%
                    </span>
                    <motion.p
                      className="text-[12px]"
                      initial={{ scale: 0 }}
                      animate={{ scale: [1, 1.1, 1], rotate: [0, 15, -15, 0], opacity: 1 }}
                      transition={{ duration: 1.5, repeat: Infinity, repeatType: 'mirror' }}
                    >
                      🎉
                    </motion.p>
                  </div>
                )}
              </div>

              {['downloading', 'installing'].includes(progressStatus) && progressCurrent > 0 && progressTotal > 0 && (
                <p className="text-white text-[10px] font-medium text-center mt-2">
                  {progressStatus === 'downloading' ? 'Downloading: ' : 'Installing: '}
                  {progressMessage || 'Unknown'}
                </p>
              )}

              <motion.button
                onClick={handleButtonClick}
                whileTap={{ scale: 0.97 }}
                disabled={['downloading', 'installing', 'launching', 'done'].includes(progressStatus)}
                transition={{ type: 'spring', stiffness: 250 }}
                className={`text-white font-[Poppins] cursor-pointer outline-0 bg-linear-to-r from-[#3F70DD] to-[#B377F3] rounded-sm text-[11px] w-[115px] h-[36px] flex items-center xl:text-[14px] xl:w-[140px] justify-center gap-1 ${['downloading', 'installing', 'launching', 'done'].includes(progressStatus) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                {getButtonContent()}
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="settings-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center h-full text-white"
          >
            <Settings onBack={() => setShowSettings(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

function Settings({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-2xl font-bold">⚙️ Settings</h1>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onBack}
        className="bg-[#3F70DD] px-4 py-2 rounded text-white"
      >
        Done
      </motion.button>
    </div>
  );
}
