import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { SettingsProvider } from './contexts/SettingsContext';
import PrivateRoute from './features/auth/PrivateRoute';
import AuthRedirect from './components/auth/AuthRedirect';
import NetworkStatus from './components/common/NetworkStatus';
import CacheProvider from './components/common/cache/CacheProvider';
import { registerSW } from './utils/serviceWorkerRegistration';
import { queryClient } from './lib/queryClient';
import { bustCSSCache } from './utils/cssCleanup';
import './styles/global.css';
import './styles/themes.css';
import './styles/cache-bust.css';
import './App.css';
import './performance.css';


// Lazy load components for better performance
const NewLanding = React.lazy(() => import('./pages/newlanding/NewLanding'));
const Login = React.lazy(() => import('./components/login/NewLoginFlow'));
const Signup = React.lazy(() => import('./features/auth/EnhancedSignup'));
const Home = React.lazy(() => import('./pages/home/Home'));
const Profile = React.lazy(() => import('./pages/profile/Profile'));
const Search = React.lazy(() => import('./pages/search/Search'));
const AddPost = React.lazy(() => import('./pages/addpost/AddPost'));
const AddStory = React.lazy(() => import('./pages/addstory/AddStory'));
const Messages = React.lazy(() => import('./pages/messages/Messages'));
const Events = React.lazy(() => import('./pages/events/Events'));
const PostDetail = React.lazy(() => import('./pages/postdetail/PostDetail'));
const StoryDetail = React.lazy(() => import('./features/stories/StoryDetail'));
const StorySharePage = React.lazy(() => import('./features/stories/StorySharePage'));
const VerificationPage = React.lazy(() => import('./pages/verification/VerificationPage'));
const CompleteProfile = React.lazy(() => import('./pages/profile/CompleteProfile'));

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)'
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '4px solid var(--accent-primary)',
      borderTop: '4px solid transparent',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }}></div>
  </div>
);

function AppContent() {
  useEffect(() => {
    // Set document title
    document.title = 'AmaPlayer - Sports Social Media Platform v2.1';
    
    // Global CSS cache busting on app start
    bustCSSCache();
    console.log('APP: Global CSS cache busted on startup');
    
    // Only clear service workers if they exist (keep this for now)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        if (registrations.length > 0) {
          console.log('APP: Clearing service workers...');
          registrations.forEach(registration => registration.unregister());
        }
      });
    }
    
    // Register service worker for offline functionality - Phase 1
    registerSW({
      onSuccess: () => {
        console.log('SW Phase 1: Service worker registered successfully');
      },
      onUpdate: () => {
        console.log('SW Phase 1: New version available');
      }
    });
  }, []);

  return (
    <div className="App">
      <NetworkStatus />
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/landing" element={<NewLanding />} />
              <Route path="/login" element={<Login />} />
              <Route path="/profile-select" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/home" element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              } />
              <Route path="/search" element={
                <PrivateRoute>
                  <Search />
                </PrivateRoute>
              } />
              <Route path="/add-post" element={
                <PrivateRoute>
                  <AddPost />
                </PrivateRoute>
              } />
              <Route path="/add-story" element={
                <PrivateRoute>
                  <AddStory />
                </PrivateRoute>
              } />
              <Route path="/messages" element={
                <PrivateRoute>
                  <Messages />
                </PrivateRoute>
              } />
              <Route path="/events" element={
                <PrivateRoute>
                  <Events />
                </PrivateRoute>
              } />
              <Route path="/profile" element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              } />
                            <Route path="/profile/:userId" element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              } />
              <Route path="/profile/complete" element={
                <PrivateRoute>
                  <CompleteProfile />
                </PrivateRoute>
              } />
              <Route path="/post/:postId" element={
                <PrivateRoute>
                  <PostDetail />
                </PrivateRoute>
              } />
              <Route path="/story/:storyId" element={
                <PrivateRoute>
                  <StoryDetail />
                </PrivateRoute>
              } />
              <Route path="/story-share/:storyId" element={<StorySharePage />} />
              <Route path="/verify/:verificationId" element={<VerificationPage />} />
              </Routes>
      </Suspense>
      
    </div>
  );
}

function App() {
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <CacheProvider>
          <ThemeProvider>
            <LanguageProvider>
              <AuthProvider>
                <SettingsProvider>
                  <AuthRedirect>
                    <AppContent />
                  </AuthRedirect>
                </SettingsProvider>
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </CacheProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;
