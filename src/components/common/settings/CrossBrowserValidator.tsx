import React, { useEffect, useState } from 'react';
import { detectBrowser, detectMobileDevice, BrowserInfo } from '../../../utils/browserDetection';

interface CrossBrowserValidatorProps {
  onValidationComplete: (results: ValidationResults) => void;
}

interface ValidationResults {
  browser: BrowserInfo;
  menuRendering: boolean;
  themeToggle: boolean;
  languageSelector: boolean;
  menuInteractions: boolean;
  cssSupport: boolean;
  accessibility: boolean;
  mobileResponsive: boolean;
  touchInteractions: boolean;
}

const CrossBrowserValidator: React.FC<CrossBrowserValidatorProps> = ({ onValidationComplete }) => {
  const [validationResults, setValidationResults] = useState<ValidationResults | null>(null);

  useEffect(() => {
    const runValidation = async () => {
      const browser = detectBrowser();
      const mobile = detectMobileDevice();
      console.log('🔍 Starting cross-browser validation for:', browser.name, mobile.isMobile ? '(Mobile)' : '(Desktop)');

      const results: ValidationResults = {
        browser,
        menuRendering: false,
        themeToggle: false,
        languageSelector: false,
        menuInteractions: false,
        cssSupport: false,
        accessibility: false,
        mobileResponsive: false,
        touchInteractions: false
      };

      // Test 1: Menu Rendering
      try {
        const settingsMenu = document.querySelector('.settings-menu');
        if (settingsMenu) {
          const computedStyle = window.getComputedStyle(settingsMenu);
          results.menuRendering = computedStyle.display !== 'none' && 
                                 computedStyle.visibility !== 'hidden' &&
                                 computedStyle.opacity !== '0';
          console.log('✅ Menu rendering test:', results.menuRendering);
        }
      } catch (error) {
        console.error('❌ Menu rendering test failed:', error);
      }

      // Test 2: Theme Toggle
      try {
        const themeToggle = document.querySelector('.theme-toggle-inline-container');
        if (themeToggle) {
          const buttons = themeToggle.querySelectorAll('button');
          results.themeToggle = buttons.length >= 2; // Light and dark mode buttons
          console.log('✅ Theme toggle test:', results.themeToggle);
        }
      } catch (error) {
        console.error('❌ Theme toggle test failed:', error);
      }

      // Test 3: Language Selector
      try {
        const languageSelector = document.querySelector('.language-selector');
        if (languageSelector) {
          const button = languageSelector.querySelector('button');
          results.languageSelector = !!button;
          console.log('✅ Language selector test:', results.languageSelector);
        }
      } catch (error) {
        console.error('❌ Language selector test failed:', error);
      }

      // Test 4: Menu Interactions
      try {
        const menuItems = document.querySelectorAll('.settings-menu-item');
        results.menuInteractions = menuItems.length >= 5; // Expected menu items
        console.log('✅ Menu interactions test:', results.menuInteractions, `(${menuItems.length} items)`);
      } catch (error) {
        console.error('❌ Menu interactions test failed:', error);
      }

      // Test 5: CSS Support
      try {
        results.cssSupport = browser.supportsCSS.flexbox && 
                           browser.supportsCSS.customProperties;
        console.log('✅ CSS support test:', results.cssSupport);
      } catch (error) {
        console.error('❌ CSS support test failed:', error);
      }

      // Test 6: Accessibility
      try {
        const menu = document.querySelector('[role="menu"]');
        const menuItems = document.querySelectorAll('[role="menuitem"]');
        results.accessibility = !!menu && menuItems.length > 0;
        console.log('✅ Accessibility test:', results.accessibility);
      } catch (error) {
        console.error('❌ Accessibility test failed:', error);
      }

      // Test 7: Mobile Responsive Design
      try {
        const menu = document.querySelector('.settings-menu') as HTMLElement;
        if (menu && mobile.isMobile) {
          const computedStyle = window.getComputedStyle(menu);
          const rect = menu.getBoundingClientRect();
          
          // Check if menu fits within viewport
          const fitsViewport = rect.right <= window.innerWidth && rect.bottom <= window.innerHeight;
          
          // Check for mobile-specific positioning
          const hasMobilePositioning = computedStyle.position === 'fixed' || 
                                     computedStyle.left === '8px' || 
                                     computedStyle.right === '8px';
          
          results.mobileResponsive = fitsViewport && (hasMobilePositioning || rect.width <= window.innerWidth - 16);
          console.log('✅ Mobile responsive test:', results.mobileResponsive, `(${rect.width}px wide, viewport: ${window.innerWidth}px)`);
        } else if (!mobile.isMobile) {
          results.mobileResponsive = true; // N/A for desktop
          console.log('✅ Mobile responsive test: N/A (desktop)');
        }
      } catch (error) {
        console.error('❌ Mobile responsive test failed:', error);
      }

      // Test 8: Touch Interactions
      try {
        if (mobile.touchSupport) {
          const menuItems = document.querySelectorAll('.settings-menu-item');
          let touchOptimized = true;
          
          menuItems.forEach(item => {
            const rect = item.getBoundingClientRect();
            // Check if touch targets are at least 44px (iOS guideline)
            if (rect.height < 44) {
              touchOptimized = false;
            }
          });
          
          results.touchInteractions = touchOptimized;
          console.log('✅ Touch interactions test:', results.touchInteractions);
        } else {
          results.touchInteractions = true; // N/A for non-touch devices
          console.log('✅ Touch interactions test: N/A (no touch support)');
        }
      } catch (error) {
        console.error('❌ Touch interactions test failed:', error);
      }

      setValidationResults(results);
      onValidationComplete(results);

      // Log comprehensive results
      console.log('🔍 Cross-browser validation complete:', {
        browser: `${browser.name} ${browser.version}`,
        device: mobile.isMobile ? `${mobile.isPhone ? 'Phone' : 'Tablet'} (${mobile.screenSize})` : 'Desktop',
        results: {
          menuRendering: results.menuRendering ? '✅' : '❌',
          themeToggle: results.themeToggle ? '✅' : '❌',
          languageSelector: results.languageSelector ? '✅' : '❌',
          menuInteractions: results.menuInteractions ? '✅' : '❌',
          cssSupport: results.cssSupport ? '✅' : '❌',
          accessibility: results.accessibility ? '✅' : '❌',
          mobileResponsive: results.mobileResponsive ? '✅' : '❌',
          touchInteractions: results.touchInteractions ? '✅' : '❌'
        }
      });
    };

    // Run validation after a short delay to ensure DOM is ready
    const timer = setTimeout(runValidation, 500);
    return () => clearTimeout(timer);
  }, [onValidationComplete]);

  if (!validationResults) {
    return (
      <div className="cross-browser-validator" style={{ display: 'none' }}>
        Validating browser compatibility...
      </div>
    );
  }

  const allTestsPassed = Object.values(validationResults)
    .filter(value => typeof value === 'boolean')
    .every(test => test);

  return (
    <div className="cross-browser-validator" style={{ display: 'none' }}>
      <div data-testid="validation-results" data-all-passed={allTestsPassed}>
        Browser: {validationResults.browser.name} {validationResults.browser.version}
        Tests: {allTestsPassed ? 'PASSED' : 'FAILED'}
      </div>
    </div>
  );
};

export default CrossBrowserValidator;