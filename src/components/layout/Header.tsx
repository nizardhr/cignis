import { motion } from 'framer-motion';
import { Sun, Moon, Bell, User } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/Button';
import { useLinkedInProfile } from '../../hooks/useLinkedInData';

export const Header = () => {
  const { darkMode, setDarkMode } = useAppStore();
  const { profile, logout, setTokens, setProfile } = useAuthStore();
  const { data: linkedInProfile } = useLinkedInProfile();

  const displayProfile = linkedInProfile || profile;

  const handleLogout = () => {
    // Clear all auth data
    setTokens(null, null);
    setProfile(null);
    logout();
    // Force page reload to ensure clean state
    window.location.href = '/';
  };
  return (
    <motion.header
      className="bg-white/80 backdrop-blur-xl border-b border-gray-200 px-6 py-4 text-gray-900"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <motion.h2
            className="text-2xl font-bold text-gray-800"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            Welcome back, {displayProfile?.given_name || 'User'}!
          </motion.h2>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <motion.button
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </motion.button>

          {/* Profile */}
          <div className="flex items-center space-x-3">
            {displayProfile?.picture ? (
              <img
                src={displayProfile.picture}
                alt="Profile"
                className="w-8 h-8 rounded-full ring-2 ring-blue-500"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </motion.header>
  );
};