import { Backgrounds } from '@/@types/background';
import OfflineAccount from '@/assets/icons/steve.png';
import Skeleton from '@/assets/icons/skeleton.png';
import TNT from '@/assets/icons/tnt.png';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { FaArrowRightLong } from 'react-icons/fa6';
import { IoIosArrowBack } from 'react-icons/io';
import AuthService from '@/services/auth';
import { useLauncher } from '@/contexts/launcher';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export const LoginPage = () => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [selectingName, setSelectingName] = useState(false);
  const [isSkeleton, setIsSkeleton] = useState(false);
  const [text, setText] = useState('');
  const [tntExploded, setTntExploded] = useState(false);

  const { updateUserSettings, userSettings, globalLoading, setGlobalLoading } =
    useLauncher();
  const authService = AuthService.getInstance();

  useEffect(() => {
    if (!globalLoading && userSettings.username != 'MetaPlayer') {
      window.location.href = '/home';
    }
  }, [globalLoading]);

  useEffect(() => {

    const updater = async () => {
      const update = await check();
      if (update) {
        setTntExploded(true)
        console.log(
          `found update ${update.version} from ${update.date} with notes ${update.body}`
        );
        let downloaded = 0;
        let contentLength = 0;
        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              contentLength = event.data.contentLength ?? 0;
              console.log(`iniciou o download de ${event.data.contentLength ?? 0} bytes`);
              break;
            case 'Progress':
              downloaded += event.data.chunkLength;
              console.log(`downloaded ${downloaded} from ${contentLength}`);
              break;
            case 'Finished':
              console.log('download finished');
              break;
          }
        });

        console.log('update installed');

        setTimeout(async () => {
          await relaunch();
        }, 1500)
      } else {
        setTntExploded(true)

        setTimeout(() => {
          setGlobalLoading(false);
        }, 1000);
      }
    }
    updater()
  }, [])

  const handleClick = async (type: 'Microsoft' | 'Offline') => {
    try {
      if (type === 'Offline') return setSelectingName(true);

      setIsAuthenticating(true);
      const account = await authService.authenticateWithMicrosoftModal();
      const newSettings = {
        authMethod: 'microsoft' as const,
        microsoftAccount: account,
        username: account.username,
      };
      updateUserSettings(newSettings);
      window.location.href = '/home';
    } catch (error) {
      console.error('Failed to start Microsoft authentication:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleOfflineLogin = () => {
    updateUserSettings({ username: text });
    window.location.href = '/home';
  };

  const backgroundRef = useRef(
    Backgrounds[Math.floor(Math.random() * Backgrounds.length)],
  );

  return (
    <motion.div
      className="w-full h-screen absolute -z-40"
      style={{
        background: `
          linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.8)), 
          url(${backgroundRef.current}) center/cover no-repeat
        `,
      }}
    >
      <AnimatePresence mode="wait">
        {globalLoading && !tntExploded ? (
          <motion.div
            key="loading"
            className="w-screen h-[calc(100vh-40px)] flex flex-col items-center justify-center gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.img
              src={TNT}
              alt="TNT"
              className="w-20 h-20"
              animate={{ rotate: [-5, 5, -5], scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 0.6 }}
            />

            <motion.p
              className="text-white font-bold text-lg"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              Checking updates...
            </motion.p>
          </motion.div>
        ) : globalLoading && tntExploded ? (
          <motion.div
            key="explosion"
            className="w-screen h-[calc(100vh-40px)] flex items-center justify-center relative"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            {[...Array(16)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-6 h-6 bg-[#e9e9e9e0] rounded-sm"
                initial={{ scale: 1, opacity: 1, x: 0, y: 0 }}
                animate={{
                  scale: 0,
                  opacity: 0,
                  x: (Math.random() - 0.5) * 400,
                  y: (Math.random() - 0.5) * 400,
                  rotate: 360,
                }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            ))}
          </motion.div>
        ) : selectingName ? (
          <motion.div
            key="offline"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-screen h-[calc(100vh-40px)] flex flex-col items-center justify-center gap-2"
          >
            <div className="flex flex-row gap-4 items-center">
              <AnimatePresence mode="wait">
                <motion.img
                  key={isSkeleton ? 'skeleton' : 'steve'}
                  src={isSkeleton ? Skeleton : OfflineAccount}
                  className="w-9 h-9"
                  initial={{ opacity: 0, scale: 0.7, rotate: -15 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.7, rotate: 15 }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                />
              </AnimatePresence>

              <motion.input
                type="text"
                placeholder="MetaPlayer"
                className="text-[14px] tracking-widest border-b-2 text-white bg-transparent focus:outline-0 focus:border-b-2 placeholder:text-white"
                whileFocus={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
                onFocus={() => setIsSkeleton(true)}
                onBlur={() => setIsSkeleton(false)}
                onChange={(e) => setText(e.target.value)}
              />

              <motion.div
                className="w-6 h-6 rounded-sm bg-[#a0a0a0] flex justify-center items-center cursor-pointer"
                whileHover={{ scale: 1.2, rotate: 10 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 250 }}
                onClick={handleOfflineLogin}
              >
                <FaArrowRightLong color="white" />
              </motion.div>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5, ease: 'easeOut' }}
              whileHover={{ scale: 1.05, x: -3 }}
              whileTap={{ scale: 0.95, x: 0 }}
              onClick={() => setSelectingName(false)}
              className="text-white flex items-center justify-center cursor-pointer gap-1"
            >
              <IoIosArrowBack size={19} />
              Voltar
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-screen h-[calc(100vh-40px)] flex items-center justify-center flex-col gap-4"
          >
            <h1 className="text-white text-[20px] font-bold">Login Options</h1>

            <div className="w-[16em]">
              <motion.button
                onClick={() => handleClick('Microsoft')}
                whileHover={{ scale: isAuthenticating ? 1 : 1.05 }}
                whileTap={{ scale: isAuthenticating ? 1 : 0.97 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                disabled={isAuthenticating}
                className={`w-full h-[50px] rounded-sm cursor-pointer flex items-center gap-2 px-5 
                  border border-gray-500/60 bg-black/25 hover:bg-gray-800/10 focus:bg-gray-800/25 
                  transition-colors ${isAuthenticating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isAuthenticating ? (
                  <span className="text-white text-[12px]">
                    Authenticating...
                  </span>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="22"
                      height="22"
                      viewBox="0 0 23 23"
                    >
                      <path fill="#f35325" d="M1 1h10v10H1z" />
                      <path fill="#81bc06" d="M12 1h10v10H12z" />
                      <path fill="#05a6f0" d="M1 12h10v10H1z" />
                      <path fill="#ffba08" d="M12 12h10v10H12z" />
                    </svg>
                    <span className="text-white text-[12px]">
                      Continue with Microsoft
                    </span>
                  </>
                )}
              </motion.button>
            </div>

            <div className="w-[16em]">
              <motion.button
                onClick={() => handleClick('Offline')}
                whileHover={{ scale: isAuthenticating ? 1 : 1.05 }}
                whileTap={{ scale: isAuthenticating ? 1 : 0.97 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                disabled={isAuthenticating}
                className={`w-full h-[50px] rounded-sm cursor-pointer flex items-center px-5 gap-2 
                  border border-gray-500/60 bg-black/25 hover:bg-gray-800/10 focus:bg-gray-800/25 
                  transition-colors ${isAuthenticating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <img
                  src={OfflineAccount}
                  alt="Offline Account"
                  className="w-5 h-5"
                />
                <span className="text-white text-[12px]">
                  Continue with Offline Account
                </span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
