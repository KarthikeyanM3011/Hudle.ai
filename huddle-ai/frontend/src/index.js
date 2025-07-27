import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
// Remove React.StrictMode to prevent double execution of useEffect hooks
root.render(<App />);