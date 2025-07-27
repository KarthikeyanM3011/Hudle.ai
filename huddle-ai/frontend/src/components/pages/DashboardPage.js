import React, { useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import Dashboard from '../dashboard/Dashboard';

const DashboardPage = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex h-[calc(100vh-80px)]">
        {/* <Sidebar activeTab={activeTab} onTabChange={handleTabChange} /> */}
        <main className="flex-1 overflow-auto">
          <Dashboard activeTab={activeTab} onTabChange={handleTabChange} />
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;