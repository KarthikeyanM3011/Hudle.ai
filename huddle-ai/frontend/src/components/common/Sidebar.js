import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, Bot, Settings } from 'lucide-react';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Calendar, label: 'Meetings', path: '/dashboard' },
    { icon: Bot, label: 'AI Profiles', path: '/dashboard' },
    { icon: Settings, label: 'Settings', path: '/dashboard' },
  ];

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 h-full">
      <nav className="mt-8">
        <div className="px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg mb-2 transition-colors ${
                  isActive
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;