import React, { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import ThemeToggle from '../common/ui/ThemeToggle';
import LanguageSelector from '../common/forms/LanguageSelector';
import './AppHeader.css';

const AppHeader = memo(function AppHeader({
  title = 'AmaPlayer',
  showBackButton = false,
  onTitleClick = null,
  showThemeToggle = true
}) {
  const { isGuest, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Show navbar when scrolling up, hide when scrolling down
      if (currentScrollY < lastScrollY || currentScrollY < 10) {
        // Scrolling up or near top
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down and past threshold
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    // Throttle scroll events
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
    };
  }, [lastScrollY]);

  const handleTitleClick = () => {
    if (onTitleClick) {
      onTitleClick();
    } else {
      // Default behavior - navigate to home
      navigate('/home');
    }
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className={`app-header ${isVisible ? 'visible' : 'hidden'}`}>
      <div className="header-content">
        <div className="header-left">
          {showBackButton && (
            <button 
              className="back-button"
              onClick={handleBackClick}
              aria-label="Go back"
            >
              ←
            </button>
          )}
          <h1 
            className="app-title" 
            onClick={handleTitleClick}
            style={{ cursor: onTitleClick || !showBackButton ? 'pointer' : 'default' }}
          >
            {title}
          </h1>
        </div>
        
        <div className="header-right">
          {showThemeToggle && (
            <div className="nav-links">
              <LanguageSelector />
              <ThemeToggle />
              {isGuest() && <span className="guest-indicator">Guest Mode</span>}
              <button onClick={handleLogout}>{isGuest() ? 'Sign In' : t('logout')}</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
});

export default AppHeader;