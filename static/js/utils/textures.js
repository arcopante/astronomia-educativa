// Generadores de texturas procedurales para planetas
// Trabajan offline con canvas 2D, devuelven ImageData o CanvasTexture

const TEX_W = 512;
const TEX_H = 256;

function createCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w || TEX_W;
    c.height = h || TEX_H;
    return c;
}

function fbm(x, y, octaves, persistence) {
    let total = 0, frequency = 1, amplitude = 1, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
        total += noise(x * frequency, y * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2;
    }
    return total / maxValue;
}

function hash(x, y) {
    let h = x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
}

function smoothNoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const a = hash(xi, yi);
    const b = hash(xi + 1, yi);
    const c = hash(xi, yi + 1);
    const d = hash(xi + 1, yi + 1);
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function noise(x, y) {
    return smoothNoise(x, y) * 2 - 1;
}

function colorRamp(t, stops) {
    t = Math.max(0, Math.min(1, t));
    for (let i = 0; i < stops.length - 1; i++) {
        if (t >= stops[i].t && t <= stops[i + 1].t) {
            const local = (t - stops[i].t) / (stops[i + 1].t - stops[i].t);
            return lerpColor(stops[i].color, stops[i + 1].color, local);
        }
    }
    return stops[stops.length - 1].color;
}

function lerpColor(a, b, t) {
    return [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t)
    ];
}

function setPixel(img, x, y, color) {
    const i = (y * img.width + x) * 4;
    img.data[i] = color[0];
    img.data[i + 1] = color[1];
    img.data[i + 2] = color[2];
    img.data[i + 3] = 255;
}

// SOL
function generateSunTexture() {
    const canvas = createCanvas();
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const n1 = fbm(x / 30, y / 30, 5, 0.5);
            const n2 = fbm(x / 80 + 100, y / 80 + 100, 4, 0.5);
            const t = (n1 + 1) * 0.4 + (n2 + 1) * 0.2;
            const color = colorRamp(t, [
                { t: 0, color: [255, 180, 0] },
                { t: 0.5, color: [255, 220, 80] },
                { t: 0.8, color: [255, 240, 180] },
                { t: 1, color: [255, 255, 255] }
            ]);
            setPixel(img, x, y, color);
        }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

// MERCURIO: gris con cráteres
function generateMercuryTexture() {
    const canvas = createCanvas();
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(canvas.width, canvas.height);

    const craters = [];
    for (let i = 0; i < 80; i++) {
        craters.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: 3 + Math.random() * 15
        });
    }

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            let v = fbm(x / 40, y / 40, 5, 0.5) * 0.4;
            for (const c of craters) {
                const dx = x - c.x, dy = y - c.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < c.r) {
                    const t = d / c.r;
                    v -= (1 - t) * 0.3;
                    if (d > c.r * 0.7) v += 0.1;
                }
            }
            const t = (v + 1) * 0.5;
            const color = colorRamp(t, [
                { t: 0, color: [60, 55, 50] },
                { t: 0.5, color: [130, 120, 110] },
                { t: 1, color: [180, 170, 160] }
            ]);
            setPixel(img, x, y, color);
        }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

// VENUS: amarillo con nubes
function generateVenusTexture() {
    const canvas = createCanvas();
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const n1 = fbm(x / 25 + y * 0.01, y / 15, 5, 0.5);
            const n2 = fbm(x / 60, y / 60, 4, 0.5);
            const t = (n1 + 1) * 0.4 + (n2 + 1) * 0.2;
            const color = colorRamp(t, [
                { t: 0, color: [200, 160, 80] },
                { t: 0.5, color: [230, 200, 130] },
                { t: 1, color: [255, 240, 200] }
            ]);
            setPixel(img, x, y, color);
        }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

// TIERRA: ~71% océanos, ~29% continentes, casquetes polares
function generateEarthTexture() {
    const canvas = createCanvas();
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(canvas.width, canvas.height);

    // Pocas y pequeñas masas de tierra para que el océano domine
    const continents = [];
    for (let i = 0; i < 8; i++) {
        continents.push({
            cx: Math.random() * canvas.width,
            cy: canvas.height * (0.25 + Math.random() * 0.5),
            rx: 18 + Math.random() * 35,
            ry: 15 + Math.random() * 25,
            rot: Math.random() * Math.PI
        });
    }
    // Umbral alto para que solo el centro de cada elipse sea tierra
    const landThreshold = 0.55;

    for (let y = 0; y < canvas.height; y++) {
        const lat = Math.abs(y / canvas.height - 0.5) * 2;
        for (let x = 0; x < canvas.width; x++) {
            let isLand = false;
            for (const c of continents) {
                const dx = (x - c.cx) * Math.cos(c.rot) + (y - c.cy) * Math.sin(c.rot);
                const dy = -(x - c.cx) * Math.sin(c.rot) + (y - c.cy) * Math.cos(c.rot);
                const d = (dx * dx) / (c.rx * c.rx) + (dy * dy) / (c.ry * c.ry);
                const noise = fbm(x / 30 + c.cx, y / 30 + c.cy, 4, 0.5) * 0.4;
                if (d + noise < landThreshold) { isLand = true; break; }
            }
            const noiseVal = fbm(x / 50, y / 50, 4, 0.5);
            let color;
            if (lat > 0.88) {
                color = [240, 245, 255];
            } else if (isLand) {
                // Tierra con variación: zonas desérticas marrones, selvas verdes, etc.
                const t = (noiseVal + 1) * 0.5;
                if (lat > 0.4 && t > 0.55) {
                    // Zonas áridas (entre los 25° y 60° de latitud)
                    color = colorRamp(t, [
                        { t: 0, color: [120, 100, 60] },
                        { t: 0.5, color: [160, 140, 90] },
                        { t: 1, color: [200, 170, 110] }
                    ]);
                } else if (lat < 0.25) {
                    // Zonas ecuatoriales: verde intenso
                    color = colorRamp(t, [
                        { t: 0, color: [50, 95, 45] },
                        { t: 0.5, color: [70, 125, 60] },
                        { t: 1, color: [100, 145, 80] }
                    ]);
                } else {
                    // Zonas templadas: verde moderado
                    color = colorRamp(t, [
                        { t: 0, color: [70, 110, 55] },
                        { t: 0.5, color: [100, 140, 75] },
                        { t: 1, color: [130, 155, 95] }
                    ]);
                }
            } else {
                // Océano con variación de profundidad
                const t = (noiseVal + 1) * 0.5;
                color = colorRamp(t, [
                    { t: 0, color: [10, 40, 100] },
                    { t: 0.5, color: [25, 75, 150] },
                    { t: 1, color: [50, 120, 180] }
                ]);
            }
            setPixel(img, x, y, color);
        }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

// MARTE: rojo con regiones oscuras y casquetes polares
function generateMarsTexture() {
    const canvas = createCanvas();
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(canvas.width, canvas.height);

    const features = [];
    for (let i = 0; i < 20; i++) {
        features.push({
            x: Math.random() * canvas.width,
            y: canvas.height * (0.2 + Math.random() * 0.6),
            r: 30 + Math.random() * 80
        });
    }

    for (let y = 0; y < canvas.height; y++) {
        const lat = Math.abs(y / canvas.height - 0.5) * 2;
        for (let x = 0; x < canvas.width; x++) {
            let dark = 0;
            for (const f of features) {
                const d = Math.sqrt((x - f.x) ** 2 + (y - f.y) ** 2);
                if (d < f.r) dark = Math.max(dark, 1 - d / f.r);
            }
            const n = fbm(x / 60, y / 60, 5, 0.5);
            const t = (n + 1) * 0.5;
            let color = colorRamp(t, [
                { t: 0, color: [120, 50, 30] },
                { t: 0.5, color: [180, 90, 50] },
                { t: 1, color: [220, 140, 90] }
            ]);
            if (dark > 0.3) {
                color = colorRamp(dark, [
                    { t: 0, color },
                    { t: 1, color: [80, 40, 25] }
                ]);
            }
            if (lat > 0.88) color = [240, 230, 220];
            setPixel(img, x, y, color);
        }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

// JÚPITER: bandas horizontales de colores
function generateJupiterTexture() {
    const canvas = createCanvas();
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const band1 = Math.sin(y / 12) * 0.4;
            const band2 = Math.sin(y / 25 + 1) * 0.2;
            const turb = fbm(x / 15, y / 8, 4, 0.5) * 0.3;
            const t = 0.5 + band1 + band2 + turb;
            let color;
            if (t < 0.3) color = [120, 70, 40];
            else if (t < 0.5) color = [200, 150, 100];
            else if (t < 0.65) color = [240, 220, 190];
            else if (t < 0.8) color = [200, 150, 100];
            else color = [150, 90, 50];

            const redSpotY = canvas.height * 0.6;
            const redSpotX = canvas.width * 0.7;
            const dx = (x - redSpotX) / 50, dy = (y - redSpotY) / 25;
            if (dx * dx + dy * dy < 1) {
                const spot = 1 - (dx * dx + dy * dy);
                color = lerpColor(color, [220, 100, 60], spot);
            }
            setPixel(img, x, y, color);
        }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

// SATURNO: bandas doradas
function generateSaturnTexture() {
    const canvas = createCanvas();
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const band = Math.sin(y / 18) * 0.3;
            const turb = fbm(x / 20, y / 10, 4, 0.5) * 0.2;
            const t = 0.5 + band + turb;
            let color;
            if (t < 0.3) color = [180, 150, 100];
            else if (t < 0.5) color = [220, 195, 140];
            else if (t < 0.7) color = [240, 220, 170];
            else color = [200, 170, 120];
            setPixel(img, x, y, color);
        }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

// URANO: azul-cian uniforme
function generateUranusTexture() {
    const canvas = createCanvas();
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const n = fbm(x / 40, y / 40, 4, 0.5) * 0.15;
            const t = 0.5 + n;
            const color = colorRamp(t, [
                { t: 0, color: [120, 180, 200] },
                { t: 0.5, color: [150, 200, 215] },
                { t: 1, color: [180, 220, 230] }
            ]);
            setPixel(img, x, y, color);
        }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

// NEPTUNO: azul profundo
function generateNeptuneTexture() {
    const canvas = createCanvas();
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const n = fbm(x / 35, y / 35, 4, 0.5) * 0.2;
            const t = 0.5 + n;
            const color = colorRamp(t, [
                { t: 0, color: [30, 60, 160] },
                { t: 0.5, color: [60, 100, 200] },
                { t: 1, color: [100, 140, 220] }
            ]);
            setPixel(img, x, y, color);
        }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

// LUNA: gris con mareas
function generateMoonTexture() {
    const canvas = createCanvas();
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(canvas.width, canvas.height);

    const maria = [];
    for (let i = 0; i < 12; i++) {
        maria.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: 30 + Math.random() * 60
        });
    }

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            let dark = 0;
            for (const m of maria) {
                const d = Math.sqrt((x - m.x) ** 2 + (y - m.y) ** 2);
                if (d < m.r) dark = Math.max(dark, 1 - d / m.r);
            }
            const n = fbm(x / 40, y / 40, 5, 0.5);
            const t = (n + 1) * 0.5;
            let color = colorRamp(t, [
                { t: 0, color: [100, 100, 100] },
                { t: 0.5, color: [160, 160, 160] },
                { t: 1, color: [200, 200, 200] }
            ]);
            if (dark > 0.3) {
                color = lerpColor(color, [70, 70, 70], dark);
            }
            setPixel(img, x, y, color);
        }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

function makeTexture(canvas) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function generatePlanetTexture(planetKey) {
    let canvas;
    switch (planetKey) {
        case 'sun': canvas = generateSunTexture(); break;
        case 'mercury': canvas = generateMercuryTexture(); break;
        case 'venus': canvas = generateVenusTexture(); break;
        case 'earth': canvas = generateEarthTexture(); break;
        case 'mars': canvas = generateMarsTexture(); break;
        case 'jupiter': canvas = generateJupiterTexture(); break;
        case 'saturn': canvas = generateSaturnTexture(); break;
        case 'uranus': canvas = generateUranusTexture(); break;
        case 'neptune': canvas = generateNeptuneTexture(); break;
        case 'moon': canvas = generateMoonTexture(); break;
        default: canvas = generateMercuryTexture();
    }
    return makeTexture(canvas);
}
