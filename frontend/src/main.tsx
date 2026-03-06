import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import About from './components/About';
import SignUpForm from './components/SignUpForm';
import SignInForm from './components/SignInForm';
import { AuthProvider } from './contexts/AuthContext';

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/About', element: <About />},
  { path: '/signin', element: <SignInForm /> },
  { path: '/signup', element: <SignUpForm /> },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
