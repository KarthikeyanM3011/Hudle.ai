import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, Bot, Settings, Plus } from 'lucide-react';

const Sidebar = ({ activeTab, onTabChange }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { 
      icon: Home, 
      label: 'Dashboard', 
      path: '/dashboard',
      tab: 'overview'
    },
    { 
      icon: Calendar, 
      label: 'Meetings', 
      path: '/dashboard',
      tab: 'meetings'
    },
    { 
      icon: Bot, 
      label: 'AI Profiles', 
      path: '/dashboard',
      tab: 'profiles'
    },
  ];

  const handleNavigation = (item) => {
    if (location.pathname === '/dashboard') {
      // If already on dashboard, just switch tabs
      onTabChange(item.tab);
    } else {
      // Navigate to dashboard with specific tab
      navigate('/dashboard', { state: { activeTab: item.tab } });
    }
  };

  const handleCreateNew = () => {
    navigate('/config');
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-full shadow-sm">
      <div className="p-4">
        <button
          onClick={handleCreateNew}
          className="w-full flex items-center justify-center px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium mb-6"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create New
        </button>
      </div>

      <nav className="px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = (location.pathname === '/dashboard' && activeTab === item.tab) || 
                          (location.pathname === item.path && item.tab === 'overview');
          
          return (
            <button
              key={item.label}
              onClick={() => handleNavigation(item)}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg mb-2 transition-colors ${
                isActive
                  ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="h-5 w-5 mr-3" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <Settings className="h-5 w-5 mr-3" />
          Settings
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;