
/**
 * HairqareTimer - Promotional Timer System
 * Version 1.0.0
 */
(function(window) {
  'use strict';
  
  // Main timer object
  const HairqareTimer = {
    // Configuration defaults
    config: {
      timerSettings: {
        initialMinutes: 28,
        initialSeconds: 0,
        restartAfterMinutes: 1
      },
      defaultText: 'Self-care Special',
      styles: {
        barBackgroundColor: '#6c63a5',
        barTextColor: '#ffffff',
        timerBackgroundColor: '#4a4373',
        timerTextColor: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '16px',
        timerFontSize: '18px'
      },
      urlPatterns: [],
      dataSource: {
        type: 'csv',
        url: ''
      }
    },
    
    // Current timer state
    state: {
      minutes: 28,
      seconds: 0,
      countryCode: null,
      promoText: null,
      timerInterval: null,
      isInitialized: false
    },
    
    // Cache for promo data
    cache: {
      promoData: null,
      lastFetched: null
    },
    
    /**
     * Initialize the timer system
     * @param {Object} userConfig - Custom configuration options
     */
    init: function(userConfig) {
      // Don't initialize twice
      if (this.state.isInitialized) return;
      
      console.log('Initializing HairqareTimer...');
      
      // Merge user config with defaults
      this.config = this.mergeConfig(this.config, userConfig || {});
      
      // Check if timer should show on current URL
      if (!this.shouldShowOnCurrentURL()) {
        console.log('Timer not configured to show on this URL');
        return;
      }
      
      // Set initial timer values
      this.state.minutes = this.config.timerSettings.initialMinutes;
      this.state.seconds = this.config.timerSettings.initialSeconds;
      
      // Load configuration asynchronously if URL provided
      if (userConfig && userConfig.configUrl) {
        this.loadConfigFromUrl(userConfig.configUrl)
          .then(() => this.continueInitialization())
          .catch(err => {
            console.error('Error loading config:', err);
            this.continueInitialization();
          });
      } else {
        this.continueInitialization();
      }
      
      this.state.isInitialized = true;
    },
    
    /**
     * Continue initialization after config is loaded
     */
    continueInitialization: function() {
      // Detect user's country
      this.getCountry()
        .then(countryCode => {
          this.state.countryCode = countryCode;
          console.log('Detected country:', countryCode);
          
          // Fetch promo data
          return this.fetchPromoData();
        })
        .then(promoData => {
          // Get appropriate promo text
          this.state.promoText = this.getPromoText(this.state.countryCode, new Date(), promoData);
          console.log('Selected promo text:', this.state.promoText);
          
          // Platform-specific initialization
          if (this.isPlatform('wordpress')) {
            this.initWordPress();
          } else if (this.isPlatform('webflow')) {
            this.initWebFlow();
          } else if (this.isPlatform('flutterflow')) {
            this.initFlutterFlow();
          } else {
            // Generic initialization
            this.initGeneric();
          }
        })
        .catch(err => {
          console.error('Error during initialization:', err);
          // Use default text in case of error
          this.state.promoText = this.config.defaultText;
          this.initGeneric();
        });
    },
    
    /**
     * Load configuration from a URL
     * @param {string} url - URL to fetch configuration from
     * @returns {Promise} - Resolves when config is loaded
     */
    loadConfigFromUrl: function(url) {
      return fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to load config: ${response.status}`);
          }
          return response.json();
        })
        .then(config => {
          this.config = this.mergeConfig(this.config, config);
          console.log('Loaded config from URL:', this.config);
        });
    },
    
    /**
     * Merge default config with user config
     * @param {Object} defaultConfig - Default configuration
     * @param {Object} userConfig - User-provided configuration
     * @returns {Object} - Merged configuration
     */
    mergeConfig: function(defaultConfig, userConfig) {
      const result = { ...defaultConfig };
      
      for (const key in userConfig) {
        if (userConfig.hasOwnProperty(key)) {
          if (typeof userConfig[key] === 'object' && userConfig[key] !== null && 
              typeof result[key] === 'object' && result[key] !== null) {
            result[key] = this.mergeConfig(result[key], userConfig[key]);
          } else {
            result[key] = userConfig[key];
          }
        }
      }
      
      return result;
    },
    
    /**
     * Check if timer should show on current URL
     * @returns {boolean} - True if timer should show
     */
    shouldShowOnCurrentURL: function() {
      if (!this.config.urlPatterns || this.config.urlPatterns.length === 0) {
        return true; // Show on all URLs if no patterns specified
      }
      
      const currentURL = window.location.href;
      
      return this.config.urlPatterns.some(pattern => 
        currentURL.includes(pattern)
      );
    },
    
    /**
     * Get user's country code
     * @returns {Promise<string>} - Resolves with country code
     */
    getCountry: function() {
      return new Promise((resolve) => {
        // First try to get country from HTTP headers (set by Cloudflare Worker)
        const countryFromHeader = this.getCountryFromHeader();
        if (countryFromHeader) {
          resolve(countryFromHeader);
          return;
        }
        
        // Next try to get country from session storage
        const countryFromSession = this.getCountryFromSessionStorage();
        if (countryFromSession) {
          resolve(countryFromSession);
          return;
        }
        
        // Fallback to default country
        resolve('US');
      });
    },
    
    /**
     * Get country from HTTP header
     * @returns {string|null} - Country code or null
     */
    getCountryFromHeader: function() {
      // This would work if the Cloudflare Worker has set the header
      // However, JavaScript cannot directly access response headers after page load
      // This is more of a placeholder for server-side integration
      return null;
    },
    
    /**
     * Get country from session storage
     * @returns {string|null} - Country code or null
     */
    getCountryFromSessionStorage: function() {
      try {
        // Check sessionStorage for wc_stripe_checkout_fields or similar
        const checkoutFields = sessionStorage.getItem('wc_stripe_checkout_fields');
        if (checkoutFields) {
          try {
            // Try parsing as JSON
            const parsedFields = JSON.parse(checkoutFields);
            
            // Extract billing_country using regex
            const regex = /"billing_country":\s*"([A-Z]{2})"/;
            const match = checkoutFields.match(regex);
            if (match && match[1]) {
              return match[1];
            }
          } catch (e) {
            console.error("Error processing checkout fields:", e.message);
          }
        }
        
        // Scan all sessionStorage as backup
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          const value = sessionStorage.getItem(key);
          
          if (value && value.includes('billing_country')) {
            const countryMatch = value.match(/"billing_country":\s*"([A-Z]{2})"/);
            if (countryMatch && countryMatch[1]) {
              return countryMatch[1];
            }
          }
        }
        
        return null;
      } catch (error) {
        console.error("Error getting billing country:", error.message);
        return null;
      }
    },
    
    /**
     * Fetch promotion data from CSV
     * @returns {Promise<Array>} - Resolves with promo data
     */
    fetchPromoData: function() {
      // Check cache first
      if (this.cache.promoData && this.cache.lastFetched) {
        const cacheAge = Date.now() - this.cache.lastFetched;
        if (cacheAge < 3600000) { // 1 hour cache
          return Promise.resolve(this.cache.promoData);
        }
      }
      
      // Fetch from URL if provided
      if (this.config.dataSource && this.config.dataSource.url) {
        return fetch(this.config.dataSource.url)
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to fetch promo data: ${response.status}`);
            }
            return response.text();
          })
          .then(csvText => {
            const data = this.parseCSV(csvText);
            
            // Update cache
            this.cache.promoData = data;
            this.cache.lastFetched = Date.now();
            
            return data;
          })
          .catch(err => {
            console.error('Error fetching promo data:', err);
            // Return fallback data
            return this.getFallbackPromoData();
          });
      } else {
        // No URL provided, use fallback data
        return Promise.resolve(this.getFallbackPromoData());
      }
    },
    
    /**
     * Parse CSV text into structured data
     * @param {string} text - CSV text
     * @returns {Array} - Parsed data
     */
    parseCSV: function(text) {
      const lines = text.split('\n');
      return lines.map(line => {
        // Handle quoted values that might contain commas
        const row = [];
        let inQuote = false;
        let currentValue = '';
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuote = !inQuote;
          } else if (char === ',' && !inQuote) {
            row.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        
        // Don't forget the last value
        row.push(currentValue.trim());
        
        return row;
      }).filter(row => row.length > 0 && row[0].trim() !== '');
    },
    
    /**
     * Get fallback promotion data
     * @returns {Array} - Fallback data
     */
    getFallbackPromoData: function() {
      return [
        ['Country', 'PromoText', 'StartDate', 'EndDate'],
        ['AU', 'Australia Day Special', '2025-01-26', '2025-01-26'],
        ['DE', 'German Unity Day Special', '2025-10-03', '2025-10-03'],
        ['US', '4th of July Special', '2025-07-04', '2025-07-04']
      ];
    },
    
    /**
     * Get appropriate promo text based on country and date
     * @param {string} countryCode - Country code
     * @param {Date} currentDate - Current date
     * @param {Array} promoData - Promotion data
     * @returns {string} - Promo text
     */
    getPromoText: function(countryCode, currentDate, promoData) {
      if (!promoData || promoData.length <= 1) {
        return this.config.defaultText;
      }
      
      // Skip header row
      for (let i = 1; i < promoData.length; i++) {
        const row = promoData[i];
        
        if (row[0] === countryCode) {
          // For v1, we'll skip date checking and just return the promo text
          // This simplifies the implementation initially
          return row[1];
          
          /* Uncomment for date-based promo selection
          const startDate = new Date(row[2]);
          const endDate = new Date(row[3]);
          endDate.setHours(23, 59, 59);
          
          if (currentDate >= startDate && currentDate <= endDate) {
            return row[1];
          }
          */
        }
      }
      
      return this.config.defaultText;
    },
    
    /**
     * Check if current platform matches
     * @param {string} platform - Platform name
     * @returns {boolean} - True if current platform matches
     */
    isPlatform: function(platform) {
      // Simple platform detection
      if (platform === 'wordpress') {
        return typeof wp !== 'undefined' || document.body.classList.contains('wp-');
      } else if (platform === 'webflow') {
        return typeof Webflow !== 'undefined' || document.documentElement.getAttribute('data-wf-site');
      } else if (platform === 'flutterflow') {
        return window.location.href.includes('flutterflow') || document.querySelector('[data-ff-id]');
      }
      
      return false;
    },
    
    /**
     * Generic initialization for any platform
     */
    initGeneric: function() {
      // Create and insert floating bar
      const timerBar = this.createFloatingBar();
      document.body.insertBefore(timerBar, document.body.firstChild);
      
      // Start timer
      this.startTimer();
    },
    
    /**
     * Initialize for WordPress
     */
    initWordPress: function() {
      // Similar to generic but with WordPress-specific adjustments
      this.initGeneric();
    },
    
    /**
     * Initialize for WebFlow
     */
    initWebFlow: function() {
      // Find existing elements by ID
      const promoTextElement = document.getElementById('promo-text');
      const timerElement = document.getElementById('timer-display');
      
      if (promoTextElement && timerElement) {
        // Update existing elements
        promoTextElement.textContent = this.state.promoText;
        this.startTimer(timerElement);
      } else {
        // Fall back to generic implementation
        this.initGeneric();
      }
    },
    
    /**
     * Initialize for FlutterFlow
     */
    initFlutterFlow: function() {
      // Similar to WebFlow, look for existing elements
      this.initWebFlow();
    },
    
    /**
     * Create floating bar element
     * @returns {HTMLElement} - Floating bar element
     */
    createFloatingBar: function() {
      // Create container
      const bar = document.createElement('div');
      bar.id = 'hairqare-timer-bar';
      bar.style.position = 'fixed';
      bar.style.top = '0';
      bar.style.left = '0';
      bar.style.right = '0';
      bar.style.zIndex = '9999';
      bar.style.backgroundColor = this.config.styles.barBackgroundColor;
      bar.style.color = this.config.styles.barTextColor;
      bar.style.fontFamily = this.config.styles.fontFamily;
      bar.style.fontSize = this.config.styles.fontSize;
      bar.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      
      // Create inner container
      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.justifyContent = 'space-between';
      container.style.alignItems = 'center';
      container.style.padding = '8px 16px';
      container.style.maxWidth = '1200px';
      container.style.margin = '0 auto';
      
      // Create promo text element
      const promoText = document.createElement('div');
      promoText.id = 'promo-text';
      promoText.textContent = this.state.promoText;
      promoText.style.flex = '1';
      
      // Create timer display element
      const timerDisplay = document.createElement('div');
      timerDisplay.id = 'timer-display';
      timerDisplay.style.backgroundColor = this.config.styles.timerBackgroundColor;
      timerDisplay.style.color = this.config.styles.timerTextColor;
      timerDisplay.style.padding = '4px 12px';
      timerDisplay.style.borderRadius = '4px';
      timerDisplay.style.marginLeft = '12px';
      timerDisplay.style.fontWeight = 'bold';
      timerDisplay.style.fontSize = this.config.styles.timerFontSize;
      
      // Assemble elements
      container.appendChild(promoText);
      container.appendChild(timerDisplay);
      bar.appendChild(container);
      
      // Add responsive styles
      const styleTag = document.createElement('style');
      styleTag.textContent = `
        @media (max-width: 640px) {
          #hairqare-timer-bar .timer-container {
            flex-direction: column;
            gap: 4px;
            text-align: center;
            padding: 8px;
          }
          
          #hairqare-timer-bar #timer-display {
            margin-left: 0;
            margin-top: 4px;
          }
          
          #hairqare-timer-bar #promo-text {
            font-size: 14px;
          }
        }
      `;
      document.head.appendChild(styleTag);
      
      return bar;
    },
    
    /**
     * Start countdown timer
     * @param {HTMLElement} [element] - Optional timer element (uses #timer-display by default)
     */
    startTimer: function(element) {
      // Clear any existing timer
      if (this.state.timerInterval) {
        clearInterval(this.state.timerInterval);
      }
      
      // Get timer element
      const timerElement = element || document.getElementById('timer-display');
      if (!timerElement) return;
      
      // Update display initially
      this.updateTimerDisplay(timerElement);
      
      // Set up interval
      this.state.timerInterval = setInterval(() => {
        // Decrease time
        if (this.state.seconds > 0) {
          this.state.seconds--;
        } else if (this.state.minutes > 0) {
          this.state.minutes--;
          this.state.seconds = 59;
        } else {
          // Timer expired
          this.handleTimerExpiration();
        }
        
        // Update display
        this.updateTimerDisplay(timerElement);
      }, 1000);
    },
    
    /**
     * Update timer display
     * @param {HTMLElement} element - Timer element
     */
    updateTimerDisplay: function(element) {
      if (!element) return;
      
      const minutes = String(this.state.minutes).padStart(2, '0');
      const seconds = String(this.state.seconds).padStart(2, '0');
      
      element.textContent = `${minutes}:${seconds}`;
    },
    
    /**
     * Handle timer expiration
     */
    handleTimerExpiration: function() {
      console.log('Timer expired');
      
      // Reset timer after specified delay
      setTimeout(() => {
        this.state.minutes = this.config.timerSettings.initialMinutes;
        this.state.seconds = this.config.timerSettings.initialSeconds;
      }, this.config.timerSettings.restartAfterMinutes * 60 * 1000);
    }
  };
  
  // Expose to window
  window.HairqareTimer = HairqareTimer;
  
})(window);

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // You can pass custom config or load from a URL
  window.HairqareTimer.init({
    configUrl: 'https://yourgithubpages.com/timer-config.json'
  });
});
