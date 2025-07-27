import React from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import Dashboard from '../dashboard/Dashboard';

const DashboardPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          <Dashboard />
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;