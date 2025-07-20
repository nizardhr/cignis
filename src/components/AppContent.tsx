import { useAppStore } from '../stores/appStore';
import { Dashboard } from './dashboard/Dashboard';
import { Synergy } from './modules/Synergy';
import { PostPulse } from './modules/PostPulse';
import { PostGen } from './modules/PostGen';
import { Scheduler } from './modules/Scheduler';
import { Analytics } from './modules/Analytics';
import { CreationEngine } from './modules/CreationEngine';
import { TheAlgo } from './modules/TheAlgo';
import { Settings } from './modules/Settings';
import { DMATestPage } from './modules/DMATestPage';
import { useEffect } from 'react';

export const AppContent = () => {
  const { currentModule, setCurrentModule } = useAppStore();

  // Handle URL parameters for module navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const moduleParam = urlParams.get('module');
    if (moduleParam && moduleParam !== currentModule) {
      setCurrentModule(moduleParam);
      // Clean up URL after setting module
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [setCurrentModule, currentModule]);

  const renderModule = () => {
    switch (currentModule) {
      case 'dashboard':
        return <Dashboard />;
      case 'synergy':
        return <Synergy />;
      case 'postpulse':
        return <PostPulse />;
      case 'postgen':
        return <PostGen />;
      case 'scheduler':
        return <Scheduler />;
      case 'analytics':
        return <Analytics />;
      case 'creation':
        return <CreationEngine />;
      case 'algo':
        return <TheAlgo />;
      case 'settings':
        return <Settings />;
      case 'dma-test':
        return <DMATestPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="p-6">
      {renderModule()}
    </div>
  );
};