/**
 * Helper to generate dynamic geometric avatars as SVG data URIs.
 * This replaces all photos of real people with clean, colorful geometric shapes.
 */
export const getAvatarSrc = (avatarId: string | null | undefined): string => {
    const id = avatarId || "1";
    
    const avatarsData: Record<string, { gradient: string[], shape: string }> = {
        "1": {
            // Blue gradient + Hexagon (Centered)
            gradient: ["#3a7bd5", "#3a6073"],
            shape: `<polygon points="50,15 85,35 85,65 50,85 15,65 15,35" fill="none" stroke="#ffffff" stroke-width="6" stroke-linejoin="round" />`
        },
        "2": {
            // Purple gradient + Diamond
            gradient: ["#8e2de2", "#4a00e0"],
            shape: `<polygon points="50,15 85,50 50,85 15,50" fill="none" stroke="#ffffff" stroke-width="6" stroke-linejoin="round" />`
        },
        "3": {
            // Green gradient + Circle
            gradient: ["#11998e", "#38ef7d"],
            shape: `<circle cx="50" cy="50" r="30" fill="none" stroke="#ffffff" stroke-width="6" />`
        },
        "5": {
            // Sunset gradient + Triangle (Centered)
            gradient: ["#fc4a1a", "#f7b733"],
            shape: `<polygon points="50,10 85,70 15,70" fill="none" stroke="#ffffff" stroke-width="6" stroke-linejoin="round" />`
        },
        "6": {
            // Teal/Blue gradient + Square
            gradient: ["#00c6ff", "#0072ff"],
            shape: `<rect x="22" y="22" width="56" height="56" rx="10" fill="none" stroke="#ffffff" stroke-width="6" />`
        },
        "8": {
            // Pink/Red gradient + Star
            gradient: ["#ff007f", "#ff4b2b"],
            shape: `<polygon points="50,15 61,38 85,41 68,58 73,82 50,70 27,82 32,58 15,41 39,38" fill="none" stroke="#ffffff" stroke-width="5" stroke-linejoin="round" />`
        }
    };
    
    const data = avatarsData[id] || avatarsData["1"];
    const [c1, c2] = data.gradient;
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
            <linearGradient id="grad-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${c1};stop-opacity:1" />
                <stop offset="100%" style="stop-color:${c2};stop-opacity:1" />
            </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#grad-${id})" />
        ${data.shape}
    </svg>`;
    
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
