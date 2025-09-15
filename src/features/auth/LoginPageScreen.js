import React, { useState, useEffect } from "react";
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../../components/common/ui/ThemeToggle';
import LanguageSelector from '../../components/common/forms/LanguageSelector';
import { useLanguage } from '../../contexts/LanguageContext';
import { resetPageStyles, bustCSSCache } from '../../utils/cssCleanup';

// Import SVG assets
import googleLogo from "../../assets/images/icons/google-logo.svg";
import appleLogo from "../../assets/images/icons/apple-logo.svg";
import facebookLogo from "../../assets/images/icons/facebook-logo.svg";

export const LoginPageScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, guestLogin, googleLogin, appleLogin } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // CSS cleanup and cache busting
  useEffect(() => {
    resetPageStyles('login');
    bustCSSCache();
    document.title = 'AmaPlayer - Login';
  }, []);

  // Handle email/password login
  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/home');
    } catch (error) {
      setError('Failed to log in. Please check your credentials.');
      console.error('Login error:', error);
    }
    setLoading(false);
  }

  // Handle guest login
  async function handleGuestLogin() {
    try {
      setError('');
      setLoading(true);
      await guestLogin();
      navigate('/home');
    } catch (error) {
      setError('Failed to log in as guest');
      console.error('Guest login error:', error);
    }
    setLoading(false);
  }

  // Handle Google login
  async function handleGoogleLogin() {
    try {
      setError('');
      setLoading(true);
      await googleLogin();
      navigate('/home');
    } catch (error) {
      setError('Failed to log in with Google');
      console.error('Google login error:', error);
    }
    setLoading(false);
  }

  // Handle Apple login
  async function handleAppleLogin() {
    try {
      setError('');
      setLoading(true);
      await appleLogin();
      navigate('/home');
    } catch (error) {
      console.error('Apple login error:', error);
      if (error.code === 'auth/operation-not-allowed') {
        setError('Apple Sign-in is not enabled. Please contact support.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        setError('Sign-in was cancelled');
      } else {
        setError('Failed to log in with Apple');
      }
    }
    setLoading(false);
  }

  // Handle Facebook login (placeholder)
  async function handleFacebookLogin() {
    // Note: Facebook login not implemented in AuthContext
    setError('Facebook login is not available at the moment');
  }

  // Navigate to signup
  function handleSignupClick() {
    navigate('/signup');
  }

  // Navigate to coach registration (placeholder)
  function handleCoachRegistration() {
    // This could navigate to a special coach signup page
    navigate('/signup?type=coach');
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      {/* Back Button - Upper Left */}
      <button
        className="fixed top-4 left-4 z-50 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg hover:bg-opacity-70 transition-all duration-200 flex items-center gap-2"
        onClick={() => navigate('/landing')}
        title="Go to Landing Page"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        <span>Back</span>
      </button>

      {/* Header controls */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <LanguageSelector />
        <ThemeToggle />
      </div>

      {/* Main Login Container */}
      <div className="w-full max-w-md mx-auto">
        <div 
          className="bg-black bg-opacity-80 backdrop-blur-lg border-2 border-green-500 rounded-2xl p-8 shadow-2xl"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), url(/newlanding/images/landingbg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Ama Player</h1>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-500 bg-opacity-90 text-white px-4 py-3 rounded-lg text-sm text-center mb-6">
              {error}
            </div>
          )}

          {/* Login Form */}
          <div className="space-y-4 mb-6">
            {/* Email Input */}
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:border-green-500 focus:bg-opacity-20 transition-all"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:border-green-500 focus:bg-opacity-20 transition-all"
                required
              />
            </div>

            {/* Login Button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-3 mb-6">
            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 bg-white text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-all duration-200 disabled:opacity-50"
            >
              <img className="w-5 h-5" alt="Google" src={googleLogo} />
              {loading ? 'Signing in...' : 'Continue with Google'}
            </button>

            {/* Apple Login */}
            <button
              onClick={handleAppleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-900 transition-all duration-200 disabled:opacity-50"
            >
              <img className="w-4 h-5" alt="Apple" src={appleLogo} />
              {loading ? 'Signing in...' : 'Sign in with Apple'}
            </button>

            {/* Facebook Login */}
            <button
              onClick={handleFacebookLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50"
            >
              <img className="w-5 h-5 bg-white rounded p-0.5" alt="Facebook" src={facebookLogo} />
              Continue with Facebook
            </button>
          </div>

          {/* OR Divider */}
          <div className="text-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-500"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-black bg-opacity-50 text-gray-300">OR</span>
              </div>
            </div>
          </div>

          {/* Guest and Signup Section */}
          <div className="space-y-3">
            {/* Continue as Guest */}
            <button
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full py-3 bg-white bg-opacity-10 hover:bg-opacity-20 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              {loading ? 'Continuing...' : 'Continue as Guest'}
            </button>

            {/* New User Section */}
            <div className="text-center text-gray-300 text-sm mt-6">
              New User
            </div>

            {/* Sign up Button */}
            <button
              onClick={handleSignupClick}
              disabled={loading}
              className="w-full py-3 bg-purple-600 bg-opacity-70 hover:bg-opacity-90 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Sign up'}
            </button>

            {/* Register as Coach */}
            <button
              onClick={handleCoachRegistration}
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 bg-opacity-70 hover:bg-opacity-90 text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Register as a Coach'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPageScreen;