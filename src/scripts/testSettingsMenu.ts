/**
 * Cross-browser testing script for Settings Menu
 * This script can be run in browser console to test functionality
 */

interface TestResult {
  test: string;
  passed: boolean;
  details: string;
  browser: string;
}

class SettingsMenuTester {
  private results: TestResult[] = [];
  private browser: string;

  constructor() {
    this.browser = this.detectBrowser();
    console.log(`🔍 Starting Settings Menu tests on ${this.browser}`);
  }

  private detectBrowser(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edg')) return 'Edge';
    return 'Unknown';
  }

  private addResult(test: string, passed: boolean, details: string): void {
    this.results.push({ test, passed, details, browser: this.browser });
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${test}: ${details}`);
  }

  async testMenuRendering(): Promise<void> {
    try {
      // Check if settings menu exists and is visible
      const menu = document.querySelector('.settings-menu') as HTMLElement;
      if (!menu) {
        this.addResult('Menu Rendering', false, 'Settings menu not found in DOM');
        return;
      }

      const computedStyle = window.getComputedStyle(menu);
      const isVisible = computedStyle.display !== 'none' && 
                       computedStyle.visibility !== 'hidden' && 
                       computedStyle.opacity !== '0';

      if (isVisible) {
        const rect = menu.getBoundingClientRect();
        const inViewport = rect.width > 0 && rect.height > 0;
        this.addResult('Menu Rendering', inViewport, 
          `Menu visible: ${inViewport}, Size: ${rect.width}x${rect.height}`);
      } else {
        this.addResult('Menu Rendering', false, 
          `Menu not visible - display: ${computedStyle.display}, visibility: ${computedStyle.visibility}, opacity: ${computedStyle.opacity}`);
      }
    } catch (error) {
      this.addResult('Menu Rendering', false, `Error: ${error}`);
    }
  }

  async testThemeToggle(): Promise<void> {
    try {
      const themeSection = document.querySelector('.settings-menu-item')?.querySelector('[aria-label*="theme" i]');
      if (!themeSection) {
        this.addResult('Theme Toggle', false, 'Theme toggle section not found');
        return;
      }

      const themeToggle = document.querySelector('.theme-toggle-inline-container');
      if (!themeToggle) {
        this.addResult('Theme Toggle', false, 'Theme toggle component not found');
        return;
      }

      const buttons = themeToggle.querySelectorAll('button');
      const hasLightDarkButtons = buttons.length >= 2;
      
      if (hasLightDarkButtons) {
        // Test if buttons are clickable
        const firstButton = buttons[0] as HTMLButtonElement;
        const isClickable = !firstButton.disabled && firstButton.offsetParent !== null;
        this.addResult('Theme Toggle', isClickable, 
          `Found ${buttons.length} theme buttons, clickable: ${isClickable}`);
      } else {
        this.addResult('Theme Toggle', false, `Expected 2+ buttons, found ${buttons.length}`);
      }
    } catch (error) {
      this.addResult('Theme Toggle', false, `Error: ${error}`);
    }
  }

  async testLanguageSelector(): Promise<void> {
    try {
      const languageSection = document.querySelector('.language-selector');
      if (!languageSection) {
        this.addResult('Language Selector', false, 'Language selector not found');
        return;
      }

      const button = languageSection.querySelector('button[aria-label*="language" i]') as HTMLButtonElement;
      if (!button) {
        this.addResult('Language Selector', false, 'Language selector button not found');
        return;
      }

      const isClickable = !button.disabled && button.offsetParent !== null;
      const hasGlobeIcon = languageSection.querySelector('svg') !== null;
      
      this.addResult('Language Selector', isClickable && hasGlobeIcon, 
        `Button clickable: ${isClickable}, Has icon: ${hasGlobeIcon}`);
    } catch (error) {
      this.addResult('Language Selector', false, `Error: ${error}`);
    }
  }

  async testMenuItems(): Promise<void> {
    try {
      const menuItems = document.querySelectorAll('.settings-menu-item');
      const expectedItems = ['Account Settings', 'Theme', 'Language', 'Change Password', 'Privacy Policy', 'Logout'];
      
      let foundItems = 0;
      const foundLabels: string[] = [];

      menuItems.forEach(item => {
        const label = item.textContent?.trim();
        if (label) {
          foundLabels.push(label);
          if (expectedItems.some(expected => label.includes(expected))) {
            foundItems++;
          }
        }
      });

      const allItemsFound = foundItems >= 5; // Allow for guest vs authenticated differences
      this.addResult('Menu Items', allItemsFound, 
        `Found ${foundItems}/${expectedItems.length} expected items: ${foundLabels.join(', ')}`);
    } catch (error) {
      this.addResult('Menu Items', false, `Error: ${error}`);
    }
  }

  async testAccessibility(): Promise<void> {
    try {
      const menu = document.querySelector('[role="menu"]');
      const menuItems = document.querySelectorAll('[role="menuitem"]');
      
      const hasMenuRole = !!menu;
      const hasMenuItems = menuItems.length > 0;
      const hasAriaLabel = menu?.hasAttribute('aria-label') || false;

      // Test focus management
      let focusManagement = false;
      if (menu) {
        const focusableElements = menu.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        focusManagement = focusableElements.length > 0;
      }

      const accessibilityScore = [hasMenuRole, hasMenuItems, hasAriaLabel, focusManagement].filter(Boolean).length;
      this.addResult('Accessibility', accessibilityScore >= 3, 
        `Menu role: ${hasMenuRole}, Menu items: ${menuItems.length}, ARIA label: ${hasAriaLabel}, Focusable elements: ${focusManagement}`);
    } catch (error) {
      this.addResult('Accessibility', false, `Error: ${error}`);
    }
  }

  async testResponsiveDesign(): Promise<void> {
    try {
      const menu = document.querySelector('.settings-menu') as HTMLElement;
      if (!menu) {
        this.addResult('Responsive Design', false, 'Menu not found');
        return;
      }

      const computedStyle = window.getComputedStyle(menu);
      const rect = menu.getBoundingClientRect();
      
      // Check if menu fits within viewport
      const fitsViewport = rect.right <= window.innerWidth && rect.bottom <= window.innerHeight;
      const hasResponsiveWidth = menu.offsetWidth <= window.innerWidth;
      
      // Check for mobile-specific classes or styles
      const isMobile = document.documentElement.classList.contains('is-mobile');
      const isTablet = document.documentElement.classList.contains('is-tablet');
      const isPhone = document.documentElement.classList.contains('is-phone');
      
      let deviceOptimized = true;
      if (isMobile) {
        // Check mobile-specific positioning
        const hasMobilePositioning = computedStyle.position === 'fixed' || 
                                   rect.left <= 16 || 
                                   rect.right >= window.innerWidth - 16;
        deviceOptimized = hasMobilePositioning && fitsViewport;
      }

      this.addResult('Responsive Design', fitsViewport && hasResponsiveWidth && deviceOptimized, 
        `Fits viewport: ${fitsViewport}, Device: ${isPhone ? 'Phone' : isTablet ? 'Tablet' : 'Desktop'}, Optimized: ${deviceOptimized}`);
    } catch (error) {
      this.addResult('Responsive Design', false, `Error: ${error}`);
    }
  }

  async testTouchInteractions(): Promise<void> {
    try {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      if (!hasTouch) {
        this.addResult('Touch Interactions', true, 'N/A - No touch support detected');
        return;
      }

      const menuItems = document.querySelectorAll('.settings-menu-item');
      let touchOptimized = true;
      let minHeight = Infinity;
      
      menuItems.forEach(item => {
        const rect = item.getBoundingClientRect();
        minHeight = Math.min(minHeight, rect.height);
        // Check if touch targets meet iOS guidelines (44px minimum)
        if (rect.height < 44) {
          touchOptimized = false;
        }
      });
      
      this.addResult('Touch Interactions', touchOptimized, 
        `Touch targets optimized: ${touchOptimized}, Min height: ${minHeight.toFixed(1)}px (44px+ recommended)`);
    } catch (error) {
      this.addResult('Touch Interactions', false, `Error: ${error}`);
    }
  }

  async testMobileViewport(): Promise<void> {
    try {
      const isMobile = window.innerWidth <= 768;
      
      if (!isMobile) {
        this.addResult('Mobile Viewport', true, 'N/A - Desktop viewport');
        return;
      }

      const menu = document.querySelector('.settings-menu') as HTMLElement;
      if (!menu) {
        this.addResult('Mobile Viewport', false, 'Menu not found');
        return;
      }

      const rect = menu.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(menu);
      
      // Check if menu doesn't overflow viewport
      const noHorizontalOverflow = rect.left >= 0 && rect.right <= window.innerWidth;
      const noVerticalOverflow = rect.top >= 0 && rect.bottom <= window.innerHeight;
      
      // Check for proper mobile positioning
      const hasMobilePosition = computedStyle.position === 'fixed' || 
                               computedStyle.position === 'absolute';
      
      const mobileOptimized = noHorizontalOverflow && noVerticalOverflow && hasMobilePosition;
      
      this.addResult('Mobile Viewport', mobileOptimized, 
        `No overflow: ${noHorizontalOverflow && noVerticalOverflow}, Mobile position: ${hasMobilePosition}, Size: ${rect.width.toFixed(0)}x${rect.height.toFixed(0)}`);
    } catch (error) {
      this.addResult('Mobile Viewport', false, `Error: ${error}`);
    }
  }

  async runAllTests(): Promise<TestResult[]> {
    console.log(`🚀 Running comprehensive Settings Menu tests on ${this.browser}...`);
    
    await this.testMenuRendering();
    await this.testThemeToggle();
    await this.testLanguageSelector();
    await this.testMenuItems();
    await this.testAccessibility();
    await this.testResponsiveDesign();
    await this.testTouchInteractions();
    await this.testMobileViewport();

    const passedTests = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    
    console.log(`\n📊 Test Results Summary for ${this.browser}:`);
    console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests} tests`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Settings menu is fully functional.');
    } else {
      console.log('⚠️  Some tests failed. Check the details above.');
    }

    return this.results;
  }

  getResults(): TestResult[] {
    return this.results;
  }
}

// Export for use in browser console or automated testing
(window as any).SettingsMenuTester = SettingsMenuTester;

// Auto-run if settings menu is present
if (document.querySelector('.settings-menu')) {
  const tester = new SettingsMenuTester();
  tester.runAllTests().then(results => {
    console.log('Test results available in window.lastTestResults');
    (window as any).lastTestResults = results;
  });
}

export default SettingsMenuTester;