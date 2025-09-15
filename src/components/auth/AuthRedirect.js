import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AuthRedirect = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't redirect while auth is still loading
    if (loading) return;

    // Check if user is on login/signup pages
    const isAuthPage = ['/login', '/signup', '/'].includes(location.pathname);

    // Check for logout parameter
    const urlParams = new URLSearchParams(location.search);
    const isLogout = urlParams.get('logout') === 'yes';

    // If user is authenticated and not logging out, redirect to home
    if (currentUser && isAuthPage && !isLogout) {
      console.log('✅ User is authenticated, redirecting to home');
      navigate('/home', { replace: true });
    }

    // If user is not authenticated and trying to access protected pages
    if (!currentUser && !isAuthPage && !loading) {
      console.log('❌ User not authenticated, redirecting to login');
      navigate('/login', { replace: true });
    }
  }, [currentUser, loading, location, navigate]);

  return children;
};

export default AuthRedirect;