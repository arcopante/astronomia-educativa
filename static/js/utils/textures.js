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

// TIERRA: con formas reconocibles de continentes, ~71% océanos, ~29% tierra
// Los polígonos están en (lat, lon). Se proyectan equirectangular.
const EARTH_LANDMASSES = [
    // Norteamérica
    [[70, -168], [72, -140], [70, -110], [68, -82], [60, -65], [48, -55], [40, -70], [28, -80], [25, -98], [32, -117], [50, -125], [60, -148], [70, -168]],
    // Groenlandia
    [[83, -30], [78, -15], [70, -22], [62, -42], [70, -55], [80, -65], [83, -30]],
    // Sudamérica
    [[12, -82], [8, -62], [-5, -35], [-23, -40], [-35, -57], [-55, -68], [-55, -75], [-30, -71], [-10, -78], [5, -77], [12, -82]],
    // Europa
    [[71, 25], [68, 40], [60, 30], [55, 12], [50, 5], [43, -8], [38, 5], [40, 18], [45, 28], [55, 35], [65, 32], [71, 25]],
    // África
    [[37, -8], [32, 10], [30, 32], [12, 43], [-5, 40], [-15, 40], [-30, 32], [-35, 20], [-22, 14], [-5, 8], [10, -15], [20, -17], [30, -10], [37, -8]],
    // Madagascar
    [[-12, 49], [-15, 50], [-22, 47], [-26, 45], [-25, 43], [-15, 44], [-12, 49]],
    // Asia (gran masa eurasiática)
    [[72, 60], [75, 100], [70, 140], [65, 170], [55, 160], [50, 140], [40, 130], [30, 122], [20, 110], [12, 100], [8, 80], [20, 70], [25, 60], [30, 50], [40, 45], [50, 55], [60, 55], [70, 60], [72, 60]],
    // India (subcontinente)
    [[28, 68], [22, 72], [8, 78], [8, 82], [20, 88], [26, 88], [30, 80], [28, 68]],
    // Indochina / Malaca
    [[22, 95], [10, 100], [1, 103], [5, 110], [15, 109], [22, 95]],
    // Indonesia (Borneo)
    [[7, 109], [3, 118], [-4, 114], [-3, 108], [3, 105], [7, 109]],
    // Sumatra
    [[6, 95], [-6, 105], [-5, 102], [5, 95], [6, 95]],
    // Japón
    [[45, 142], [38, 142], [33, 136], [35, 130], [42, 132], [45, 142]],
    // Filipinas
    [[18, 122], [7, 125], [5, 120], [12, 118], [18, 122]],
    // Australia
    [[-10, 142], [-12, 130], [-15, 122], [-25, 113], [-35, 116], [-38, 142], [-32, 152], [-22, 150], [-15, 145], [-10, 142]],
    // Tasmania
    [[-40, 145], [-43, 148], [-43, 147], [-40, 145]],
    // Nueva Zelanda
    [[-34, 173], [-42, 174], [-47, 167], [-41, 172], [-34, 173]],
    // Gran Bretaña
    [[58, -5], [55, 1], [51, 1], [50, -5], [55, -8], [58, -5]],
    // Irlanda
    [[55, -10], [52, -6], [51, -10], [55, -10]],
    // Islandia
    [[66, -17], [63, -14], [63, -22], [66, -25], [66, -17]],
    // Cuba
    [[23, -82], [20, -75], [20, -78], [23, -82]],
    // Antártida (banda continua a lo ancho)
    [[-65, -180], [-72, -130], [-78, -100], [-80, -60], [-75, -20], [-70, 20], [-72, 60], [-70, 100], [-75, 140], [-68, 170], [-65, -180]]
];

// Point-in-polygon test (ray casting). polygon = [[lat,lon], ...]
function pointInPolygon(lat, lon, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [latI, lonI] = polygon[i];
        const [latJ, lonJ] = polygon[j];
        // Manejar wrap-around en longitud
        let dLon = lonI - lonJ;
        if (Math.abs(dLon) > 180) dLon = dLon > 0 ? dLon - 360 : dLon + 360;
        const intersect = ((latI > lat) !== (latJ > lat)) &&
            (lon < (lonJ - lonI) * (lat - latI) / (latJ - latI) + lonI);
        if (intersect) inside = !inside;
    }
    return inside;
}

function isLand(lat, lon) {
    // Cerca de la costa: jitter para que las costas sean irregulares
    const coastJitter = fbm(lon * 0.8, lat * 0.8, 3, 0.5) * 1.8;
    const jitteredLat = lat + coastJitter;
    const jitteredLon = lon + coastJitter * 0.6;
    for (const poly of EARTH_LANDMASSES) {
        if (pointInPolygon(jitteredLat, jitteredLon, poly)) return true;
    }
    return false;
}

function generateEarthTexture() {
    const canvas = createCanvas();
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(canvas.width, canvas.height);
    const W = canvas.width, H = canvas.height;

    for (let y = 0; y < H; y++) {
        const lat = 90 - (y / H) * 180;
        const absLat = Math.abs(lat);
        for (let x = 0; x < W; x++) {
            const lon = -180 + (x / W) * 360;
            const land = isLand(lat, lon);
            const noiseVal = fbm(x / 40, y / 40, 4, 0.5);
            const microNoise = fbm(x / 12, y / 12, 3, 0.5) * 0.15;
            const t = (noiseVal + 1) * 0.5;
            let color;
            if (land) {
                // Tierra: casquetes, tundra, bosques, desiertos, selvas
                if (absLat > 85) {
                    color = [245, 248, 255]; // casquete polar
                } else if (absLat > 75) {
                    color = colorRamp(t, [
                        { t: 0, color: [200, 210, 215] },
                        { t: 1, color: [235, 240, 245] }
                    ]);
                } else if (absLat > 65) {
                    // Tundra / taiga: marrón verdoso
                    color = colorRamp(t, [
                        { t: 0, color: [70, 90, 60] },
                        { t: 1, color: [110, 130, 80] }
                    ]);
                } else if (absLat > 45) {
                    // Templado: verde con variación
                    color = colorRamp(t, [
                        { t: 0, color: [60, 100, 50] },
                        { t: 1, color: [120, 150, 80] }
                    ]);
                } else if (absLat > 30) {
                    // Subtropical: mezcla verde-marrón
                    // Algunas zonas desérticas (Sahara, Arabia, Australia interior)
                    const desertNoise = fbm(x / 80, y / 80, 3, 0.5);
                    if (desertNoise > 0.2) {
                        // Desierto
                        color = colorRamp(t, [
                            { t: 0, color: [160, 130, 80] },
                            { t: 1, color: [210, 180, 120] }
                        ]);
                    } else {
                        color = colorRamp(t, [
                            { t: 0, color: [80, 110, 50] },
                            { t: 1, color: [130, 150, 80] }
                        ]);
                    }
                } else if (absLat > 15) {
                    // Tropical: verde con sabana
                    color = colorRamp(t, [
                        { t: 0, color: [70, 110, 50] },
                        { t: 1, color: [110, 140, 70] }
                    ]);
                } else {
                    // Ecuatorial: verde intenso (selva)
                    color = colorRamp(t, [
                        { t: 0, color: [40, 90, 40] },
                        { t: 1, color: [80, 120, 60] }
                    ]);
                }
                // Variación de micro-detalle
                color = color.map((c, i) => Math.max(0, Math.min(255, c + microNoise * (i === 0 ? 15 : 25))));
            } else {
                // Océano: profundidad variable (más oscuro lejos de costa)
                const coastNoise = fbm(x / 30, y / 30, 3, 0.5);
                const tOcean = (coastNoise + 1) * 0.5;
                if (absLat > 70) {
                    // Hielo marino cerca de los polos
                    if (tOcean > 0.6) {
                        color = [220, 230, 240];
                    } else {
                        color = colorRamp(tOcean, [
                            { t: 0, color: [20, 50, 110] },
                            { t: 1, color: [40, 90, 150] }
                        ]);
                    }
                } else {
                    color = colorRamp(tOcean, [
                        { t: 0, color: [8, 35, 90] },     // abismo
                        { t: 0.5, color: [20, 65, 130] },
                        { t: 1, color: [50, 110, 170] }   // costa
                    ]);
                }
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
