/**
 * Theme System Integration Guide for ApsaraWidget.js
 * 
 * This file contains the code snippets to integrate the theme system
 * into the Apsara Widget component.
 */

// ============================================
// STEP 1: Import themes.css in ApsaraWidget.js
// ============================================
// Add this import at the top of ApsaraWidget.js:
import './themes.css';


// ============================================
// STEP 2: Add State for Theme Management
// ============================================
// Add these state variables in the component:
const [currentTheme, setCurrentTheme] = useState('light'); // Default theme
const [showThemeSelector, setShowThemeSelector] = useState(false);

// Load saved theme from localStorage on mount
useEffect(() => {
    const savedTheme = localStorage.getItem('apsara-theme');
    if (savedTheme) {
        setCurrentTheme(savedTheme);
    }
}, []);

// Save theme to localStorage when changed
useEffect(() => {
    localStorage.setItem('apsara-theme', currentTheme);
}, [currentTheme]);


// ============================================
// STEP 3: Theme Definitions
// ============================================
const themes = [
    { name: 'light', class: 'light' },
    { name: 'dark', class: 'dark' },
    { name: 'nightly', class: 'nightly' },
    { name: 'dracula', class: 'dracula' },
    { name: 'monokai', class: 'monokai' },
    { name: 'nord', class: 'nord' },
    { name: 'solarized-light', class: 'solarized-light' },
    { name: 'solarized-dark', class: 'solarized-dark' },
    // { name: 'custom', class: 'custom' } // Future: custom image upload
];


// ============================================
// STEP 4: Theme Change Handler
// ============================================
const handleThemeChange = (themeName) => {
    setCurrentTheme(themeName);
    setShowThemeSelector(false);
};


// ============================================
// STEP 5: Update Main Widget Container Class
// ============================================
// Change the main div from:
// <div className="apsara-widget">
// To:
<div className={`apsara-widget theme-${currentTheme}`}>


// ============================================
// STEP 6: Add Settings Button (Before Close Button)
// ============================================
// Add this JSX inside the widget container, near the close button:
{/* Settings Button */}
<button 
    className="settings-button"
    onClick={() => setShowThemeSelector(!showThemeSelector)}
    title="Theme Settings"
>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M12 1v6m0 6v6m4.22-13.78l-1.42 1.42M10.59 12.59l-1.42 1.42m7.05 0l-1.42-1.42M10.59 10.59l-1.42-1.42M1 12h6m6 0h6"></path>
    </svg>
</button>


// ============================================
// STEP 7: Add Theme Selector Component
// ============================================
// Add this JSX inside the widget container:
{/* Theme Selector */}
{showThemeSelector && (
    <div className="theme-selector">
        {themes.map((theme) => (
            <div
                key={theme.name}
                className={`theme-swatch ${theme.class} ${currentTheme === theme.name ? 'active' : ''}`}
                onClick={() => handleThemeChange(theme.name)}
                title={theme.name.charAt(0).toUpperCase() + theme.name.slice(1).replace('-', ' ')}
            />
        ))}
    </div>
)}


// ============================================
// STEP 8: Optional - Custom Image Upload (Future Feature)
// ============================================
// To allow users to upload custom background images:

const [customBgImage, setCustomBgImage] = useState(null);

const handleCustomImageUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            setCustomBgImage(e.target.result);
            setCurrentTheme('custom');
            localStorage.setItem('apsara-custom-bg', e.target.result);
        };
        reader.readAsDataURL(file);
    }
};

// In the theme selector, add:
<input
    type="file"
    id="custom-theme-upload"
    accept="image/*"
    style={{ display: 'none' }}
    onChange={handleCustomImageUpload}
/>
<div
    className="theme-swatch custom"
    onClick={() => document.getElementById('custom-theme-upload').click()}
    title="Upload Custom Background"
/>

// And add this CSS in themes.css:
.apsara-widget.theme-custom {
    background-image: var(--custom-bg-image);
    background-size: cover;
    background-position: center;
}

// Set the custom background dynamically:
useEffect(() => {
    if (customBgImage) {
        document.documentElement.style.setProperty('--custom-bg-image', `url(${customBgImage})`);
    }
}, [customBgImage]);


// ============================================
// COMPLETE EXAMPLE - Theme Selector Section
// ============================================
/*
return (
    <div className={`apsara-widget theme-${currentTheme}`}>
        
        {/* Close Button (existing) *\/}
        {isElectron() && (
            <button className="close-button" onClick={handleClose}>
                ✕
            </button>
        )}

        {/* Settings Button (NEW) *\/}
        <button 
            className="settings-button"
            onClick={() => setShowThemeSelector(!showThemeSelector)}
            title="Theme Settings"
        >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 1v6m0 6v6m4.22-13.78l-1.42 1.42M10.59 12.59l-1.42 1.42m7.05 0l-1.42-1.42M10.59 10.59l-1.42-1.42M1 12h6m6 0h6"></path>
            </svg>
        </button>

        {/* Theme Selector (NEW) *\/}
        {showThemeSelector && (
            <div className="theme-selector">
                {themes.map((theme) => (
                    <div
                        key={theme.name}
                        className={`theme-swatch ${theme.class} ${currentTheme === theme.name ? 'active' : ''}`}
                        onClick={() => handleThemeChange(theme.name)}
                        title={theme.name.charAt(0).toUpperCase() + theme.name.slice(1).replace('-', ' ')}
                    />
                ))}
            </div>
        )}

        {/* ... rest of widget JSX ... *\/}
    </div>
);
*/


// ============================================
// TESTING THE THEME SYSTEM
// ============================================
/*
1. Click the settings gear icon (bottom-right)
2. Click on any color swatch to change theme
3. Theme should persist across page reloads
4. Each theme changes:
   - Background gradient
   - Text colors
   - Button colors
   - Button hover states
   - End button color
*/

// ============================================
// POSITIONING NOTES
// ============================================
/*
- Settings button: bottom: 10px, right: 10px (absolute)
- Theme selector: bottom: 60px, right: 10px (absolute)
- Both use -webkit-app-region: no-drag for Electron compatibility
- Theme selector scrolls if too many themes (max-height: 300px)
*/
