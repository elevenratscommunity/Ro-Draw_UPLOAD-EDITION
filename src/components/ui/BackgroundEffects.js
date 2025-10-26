import React, { useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';

// --- Helper Functions ---
function randomBetween(min, max) { return Math.random() * (max - min) + min; }
// Styles function returns style string directly
function generateElements(count, className, stylesFn = () => '') {
    return Array.from({ length: count }, (_, i) =>
        `<div class="${className}" style="${stylesFn(i)}"></div>`
    ).join('');
}
// Generate elements with embedded SVG content
function generateSvgElements(count, className, stylesFn = () => ({}), svgFn = () => '') {
     return Array.from({ length: count }, (_, i) => {
         const styleString = Object.entries(stylesFn(i)).map(([key, value]) => `${key}:${value};`).join('');
         return `<div class="${className}" style="${styleString}">${svgFn(i)}</div>`;
     }).join('');
}

// --- Specific Background Effect Generators (Corrected & Final) ---

// 2. Galaxy (More stars added via CSS SVG)
function getGalaxyHtml() {
    // CSS handles the star fields now, just need shooting stars
    return `
        <div class="stars-bg-far"></div>
        <div class="stars-bg-medium"></div> {/* Added medium layer */}
        <div class="stars-bg-near"></div>
        ${generateElements(6, 'shooting-star')} {/* Slightly more shooting stars */}
    `;
}

// 3. Sunset (Static SVG Mountains)
function getSunsetHtml() {
     const mountainsSvg = `<svg viewBox="0 0 800 150" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg"><path d="M0 150 L 250 110 L 500 140 L 750 120 L 800 130 L 800 150 Z" fill="%231e2d44"/><path d="M0 150 L 200 90 L 400 140 L 550 100 L 700 130 L 800 110 L 800 150 Z" fill="%23141f30"/><path d="M0 150 L 150 70 L 300 130 L 450 80 L 600 140 L 800 90 L 800 150 Z" fill="%230a0f1d"/></svg>`;
     const cloud1Style = `width:350px; height:50px; top:20%; left:10%; animation-duration:150s;`;
     const cloud2Style = `width:450px; height:60px; top:25%; left:60%; animation-duration:180s; animation-delay: -20s;`;
     const cloud3Style = `width:300px; height:45px; top:18%; left:80%; animation-duration:130s; animation-delay: -40s;`;
     return ` <div class="sunset-sun"></div> <div class="sunset-cloud c1" style="${cloud1Style}"></div> <div class="sunset-cloud c2" style="${cloud2Style}"></div> <div class="sunset-cloud c3" style="${cloud3Style}"></div> <div class="sunset-mountains-svg">${mountainsSvg.replace(/#/g, '%23')}</div> `;
}

// 4. Forest (SVG Trees)
function getForestHtml() {
    const treeSvg = (fillColor = "#2d6a4f", trunkColor = "#4d3e3e") => `<svg viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg"><polygon points="50,0 85,70 70,70 75,110 60,110 65,150 35,150 40,110 25,110 30,70 15,70 50,0" fill="${fillColor}"/><rect x="40" y="150" width="20" height="50" fill="${trunkColor}" /></svg>`;
    const leafStyles = (i) => `left:${randomBetween(0, 100)}%; animation-duration:${randomBetween(8, 15)}s; animation-delay:${randomBetween(0, 10)}s; transform:scale(${randomBetween(0.7, 1.2)}) rotate(${randomBetween(-30, 30)}deg); --drift-leaf:${randomBetween(-60, 60)}px;`;
    const rayStyles = (i) => `--angle:${-40 + i * 20}deg; animation-delay:${randomBetween(-15, 0)}s;`;
    const treeStyles = [ `--tree-width:90px; --tree-height:180px; left: 8%; z-index: 4; animation-delay: -2s;`, `--tree-width:70px; --tree-height:140px; left: 25%; z-index: 6; animation-delay: -5s;`, `--tree-width:100px; --tree-height:200px; left: 45%; z-index: 3; animation-delay: -1s;`, `--tree-width:80px; --tree-height:160px; left: 70%; z-index: 5; animation-delay: -8s;`, `--tree-width:60px; --tree-height:120px; left: 88%; z-index: 7; animation-delay: -3s;` ];
    const treeColors = ['#40916c', '#52b788', '#2d6a4f', '#40916c', '#52b788'];
    const trunkColors = ['#5e454b', '#4d3e3e', '#443437', '#5e454b', '#4d3e3e'];
    return ` <div class="sun-forest"></div> ${generateElements(5, 'sun-ray', rayStyles)} <div class="cloud cloud-1"></div> <div class="cloud cloud-2"></div> ${treeStyles.map((style, i) => `<div class="forest-tree-svg" style="${style}">${treeSvg(treeColors[i], trunkColors[i])}</div>`).join('')} <div class="mountain-range-far"></div> <div class="mountain-range-near"></div> <div class="grass-layer"></div> <div class="leaves-wrapper"> ${generateElements(20, 'leaf', leafStyles)} </div> `;
}

// 5. Sea (Corrected Fish SVG Embedding)
function getSeaHtml() {
     const fishSvg = (fillColor = "#ffb703") => `<svg viewBox="0 0 50 30" xmlns="http://www.w3.org/2000/svg"><path d="M5 15 Q 15 0, 30 10 Q 45 15, 30 20 Q 15 30, 5 15 Z" fill="${fillColor}" /><path d="M30 10 Q 45 15, 48 10 L 48 20 Q 45 15, 30 20 Z" fill="${fillColor}" opacity="0.8" /><circle cx="12" cy="12" r="2" fill="#000"/></svg>`;
     const bubbleStyles = (i) => { const size = randomBetween(4, 18); return `left:${randomBetween(0, 100)}%; width:${size}px; height:${size}px; animation-duration:${randomBetween(15, 35)}s; animation-delay:${randomBetween(0, 20)}s; --drift:${randomBetween(-50, 50)};`; };
     const fishStyles = (i) => { const duration = randomBetween(15, 30); const direction = Math.random() < 0.5 ? 1 : -1; const size = randomBetween(35, 65); const yPos = randomBetween(20, 75); return { top: `${yPos}%`, '--fish-size': `${size}px`, '--swim-duration': `${duration}s`, 'animation-delay': `${randomBetween(0, -duration)}s`, '--direction': direction, '--start-pos': direction === 1 ? '-150px' : '110vw', '--end-pos': direction === 1 ? '110vw' : '-150px', '--drift-y': `${randomBetween(-20 * (yPos/100), 20 * (1-yPos/100))}px` }; };
     const fishColors = ['#ffb703', '#fb8500', '#e63946', '#8ecae6', '#219ebc'];
     return ` <div class="caustics"></div> <div class="sea-plants"></div> <div class="bubbles-wrapper">${generateElements(30, 'bubble', bubbleStyles)}</div> <div class="fish-wrapper"> ${generateSvgElements(5, 'fish-svg', fishStyles, i => fishSvg(fishColors[i % fishColors.length]))} </div> `;
}

// 6. Night City (Reimagined SVG Version)
function getNightCityHtml() {
     const cityscapeSvg = `<svg viewBox="0 0 1000 300" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg"><defs><filter id="cityGlow"><feGaussianBlur stdDeviation="1"/></filter><linearGradient id="building1Grad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#11152d;stop-opacity:1" /><stop offset="100%" style="stop-color:#0b0c1e;stop-opacity:1" /></linearGradient><linearGradient id="building2Grad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#1a223e;stop-opacity:1" /><stop offset="100%" style="stop-color:#11182a;stop-opacity:1" /></linearGradient><pattern id="windows" patternUnits="userSpaceOnUse" width="8" height="12" x="0" y="0"><rect width="8" height="12" fill="transparent"/><rect x="1" y="1" width="2" height="3" fill="rgba(255, 223, 111, 0.7)" class="window-light"/><rect x="5" y="1" width="2" height="3" fill="rgba(255, 223, 111, 0.5)" class="window-light"/><rect x="1" y="7" width="2" height="3" fill="rgba(255, 223, 111, 0.6)" class="window-light"/><rect x="5" y="7" width="2" height="3" fill="rgba(255, 223, 111, 0.4)" class="window-light"/></pattern><style>.window-light { animation: flicker-windows 7s linear infinite alternate; } @keyframes flicker-windows { 0% { opacity: var(--o1, 0.7); } 33% { opacity: var(--o2, 0.4); } 66% { opacity: var(--o3, 0.8); } 100% { opacity: var(--o1, 0.6); } }</style></defs><rect x="50" y="150" width="80" height="150" fill="url(%23building1Grad)" /><rect x="200" y="100" width="100" height="200" fill="url(%23building2Grad)" /><rect x="400" y="180" width="60" height="120" fill="url(%23building1Grad)" /><rect x="600" y="50" width="120" height="250" fill="url(%23building2Grad)" /><rect x="800" y="120" width="90" height="180" fill="url(%23building1Grad)" /><rect x="100" y="50" width="100" height="250" fill="url(%23building2Grad)" /><rect x="100" y="50" width="100" height="250" fill="url(%23windows)" style="--o1:0.6; --o2:0.3; --o3:0.7;" /><rect x="300" y="120" width="90" height="180" fill="url(%23building1Grad)" /><rect x="300" y="120" width="90" height="180" fill="url(%23windows)" style="--o1:0.8; --o2:0.5; --o3:0.9;" /><rect x="500" y="80" width="110" height="220" fill="url(%23building2Grad)" /><rect x="500" y="80" width="110" height="220" fill="url(%23windows)" style="--o1:0.5; --o2:0.2; --o3:0.6;" /><rect x="700" y="150" width="80" height="150" fill="url(%23building1Grad)" /><rect x="700" y="150" width="80" height="150" fill="url(%23windows)" style="--o1:0.7; --o2:0.4; --o3:0.8;" /><rect x="880" y="100" width="100" height="200" fill="url(%23building2Grad)" /><rect x="880" y="100" width="100" height="200" fill="url(%23windows)" style="--o1:0.6; --o2:0.3; --o3:0.7;" /><rect x="0" y="290" width="1000" height="10" fill="%23050813" /></svg>`;
    const carStyles = (i, isHeadlight) => { const duration = randomBetween(7, 14); return `bottom:${randomBetween(1, 3.5)}%; --car-duration:${duration}s; animation-delay:-${randomBetween(0, duration)}s;`; };
    return ` <div class="city-moon"></div> <div class="cityscape-svg">${cityscapeSvg.replace(/#/g, '%23')}</div> <div class="city-glow"></div> <div class="cars-wrapper"> ${generateElements(3, 'car-light headlight', i => carStyles(i, true))} ${generateElements(3, 'car-light taillight', i => carStyles(i, false))} </div> `;
}

// 7. Snow (Snowman SVG, Increased Snowflakes)
function getSnowHtml() {
     const snowmanSvg = `<svg viewBox="-5 -5 110 160" xmlns="http://www.w3.org/2000/svg"><defs><filter id="snowGlow"><feGaussianBlur stdDeviation="1.5"/></filter></defs><circle cx="50" cy="115" r="35" fill="#fff" filter="url(%23snowGlow)"/><circle cx="50" cy="60" r="25" fill="#fff" filter="url(%23snowGlow)"/><circle cx="50" cy="20" r="15" fill="#fff" filter="url(%23snowGlow)"/><circle cx="45" cy="18" r="2" fill="#222"/><circle cx="55" cy="18" r="2" fill="#222"/><polygon points="50,22 48,26 52,26" fill="#ff7b00"/><circle cx="50" cy="55" r="2.5" fill="#333"/><circle cx="50" cy="65" r="2.5" fill="#333"/><path d="M35 35 Q 50 45, 65 35 L 70 45 Q 50 55, 30 45 Z" fill="#d00"/><rect x="65" y="35" width="8" height="20" fill="#d00" transform="rotate(10 65 35)"/></svg>`;
    // Increased snowflake count slightly, adjusted styles
    const flakeStyles = (i) => { const size = randomBetween(3, 8); return `left:${randomBetween(0, 100)}%; --flake-size:${size}px; animation-duration:${randomBetween(10, 20)}s; animation-delay:-${randomBetween(0, 20)}s; opacity:${randomBetween(0.4, 0.9)}; --drift-snow:${randomBetween(-60, 60)}px;`; };
    return ` <div class="snow-wrapper"> ${generateElements(70, 'snowflake', flakeStyles)} </div> <div class="snowman">${snowmanSvg.replace(/#/g, '%23')}</div> <div class="snowdrift"></div> `;
}

// 8. Cherry Blossom
function getCherryBlossomHtml() {
    const petalStyles = (i) => `left:${randomBetween(0, 100)}%; animation-duration:${randomBetween(10, 18)}s; animation-delay:${randomBetween(0, 12)}s; transform:scale(${randomBetween(0.7, 1.2)}); --drift-petal:${randomBetween(-100, 100)}; --spin:${randomBetween(360, 1080)};`;
    return ` <div class="cherry-branch"></div> <div class="petals-wrapper"> ${generateElements(35, 'petal', petalStyles)} </div> `;
}

// 9. Aurora (Reduced blur for performance)
function getAuroraHtml() {
    const layer1Style = `animation-delay: -5s; animation-duration: 28s;`;
    const layer2Style = `opacity: 0.4; animation-delay: -12s; animation-duration: 33s;`;
    const layer3Style = `opacity: 0.45; animation-delay: -18s; animation-duration: 38s;`;
    return ` <div class="aurora-stars"></div> <div class="aurora-layer aurora-layer-1" style="${layer1Style}"></div> <div class="aurora-layer aurora-layer-2" style="${layer2Style}"></div> <div class="aurora-layer aurora-layer-3" style="${layer3Style}"></div> `;
}


// --- Main Component ---
export default function BackgroundEffects() {
    const { currentUser } = useAuth();
    const bgStyle = useMemo(() => currentUser?.equippedBackground || 'bg-classic', [currentUser?.equippedBackground]);

    useEffect(() => {
        const container = document.getElementById('background-effects-container');
        if (!container) return;

        let html = '';
        const generators = {
            'bg-galaxy': getGalaxyHtml,
            'bg-sunset': getSunsetHtml,
            'bg-forest': getForestHtml,
            'bg-sea': getSeaHtml,
            'bg-night-city': getNightCityHtml,
            'bg-snow': getSnowHtml,
            'bg-cherry-blossom': getCherryBlossomHtml,
            'bg-aurora': getAuroraHtml,
        };
        html = generators[bgStyle]?.() || '';

        // Simple and direct update
        container.innerHTML = html;

    }, [bgStyle]);

    return (
        <div id="background-effects-container" className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1] overflow-hidden"></div>
    );
}