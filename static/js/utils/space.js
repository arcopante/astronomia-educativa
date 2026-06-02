// Funciones comunes para escenas 3D (estrellas, líneas orbitales, etiquetas)

function createStarfield(scene, count, range) {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * range;
        positions[i * 3 + 1] = (Math.random() - 0.5) * range;
        positions[i * 3 + 2] = (Math.random() - 0.5) * range;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: true });
    return new THREE.Points(geo, mat);
}

function createOrbitLine(radius, inclinationDeg, color, opacity) {
    const points = [];
    const incl = (inclinationDeg || 0) * Math.PI / 180;
    for (let i = 0; i <= 256; i++) {
        const a = (i / 256) * Math.PI * 2;
        points.push(new THREE.Vector3(
            Math.cos(a) * radius,
            Math.sin(a) * radius * Math.sin(incl),
            Math.sin(a) * radius * Math.cos(incl)
        ));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: opacity || 0.5 });
    return new THREE.Line(geo, mat);
}

function createTextSprite(text, color, size) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    context.fillStyle = 'rgba(0,0,0,0)';
    context.fillRect(0, 0, 256, 64);
    context.font = 'bold 24px Arial';
    context.fillStyle = color || 'white';
    context.textAlign = 'center';
    context.strokeStyle = 'rgba(0,0,0,0.8)';
    context.lineWidth = 3;
    context.strokeText(text, 128, 40);
    context.fillText(text, 128, 40);
    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(size || 20, (size || 20) * 0.25, 1);
    return sprite;
}

function setupBackButton(buttonId) {
    const btn = document.getElementById(buttonId);
    if (btn) btn.addEventListener('click', () => {
        if (window.parent !== window) {
            window.parent.postMessage('back', '*');
        }
    });
}

function attachCameraControls(renderer, camera, target, opts) {
    const options = Object.assign({
        minDist: 30, maxDist: 8000, initialDist: 1500, phi: 0.6, theta: 0
    }, opts || {});

    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let camAngle = { theta: options.theta, phi: options.phi };
    let camDist = options.initialDist;
    let manualCamera = true;

    function update() {
        if (!manualCamera) return;
        camera.position.x = camDist * Math.sin(camAngle.phi) * Math.sin(camAngle.theta);
        camera.position.y = camDist * Math.cos(camAngle.phi);
        camera.position.z = camDist * Math.sin(camAngle.phi) * Math.cos(camAngle.theta);
        camera.lookAt(target);
    }

    renderer.domElement.addEventListener('mousedown', e => {
        isDragging = true;
        manualCamera = true;
        prevMouse = { x: e.clientX, y: e.clientY };
    });
    renderer.domElement.addEventListener('mousemove', e => {
        if (!isDragging) return;
        camAngle.theta -= (e.clientX - prevMouse.x) * 0.005;
        camAngle.phi = Math.max(0.05, Math.min(Math.PI - 0.05, camAngle.phi + (e.clientY - prevMouse.y) * 0.005));
        prevMouse = { x: e.clientX, y: e.clientY };
        update();
    });
    renderer.domElement.addEventListener('mouseup', () => isDragging = false);
    renderer.domElement.addEventListener('mouseleave', () => isDragging = false);
    renderer.domElement.addEventListener('wheel', e => {
        e.preventDefault();
        camDist = Math.max(options.minDist, Math.min(options.maxDist, camDist + e.deltaY * 0.5));
        update();
    });

    let touchStart = null;
    let touchDist = 0;
    renderer.domElement.addEventListener('touchstart', e => {
        if (e.touches.length === 1) {
            isDragging = true;
            manualCamera = true;
            prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            isDragging = false;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            touchDist = Math.sqrt(dx * dx + dy * dy);
        }
    });
    renderer.domElement.addEventListener('touchmove', e => {
        e.preventDefault();
        if (e.touches.length === 1 && isDragging) {
            camAngle.theta -= (e.touches[0].clientX - prevMouse.x) * 0.005;
            camAngle.phi = Math.max(0.05, Math.min(Math.PI - 0.05, camAngle.phi + (e.touches[0].clientY - prevMouse.y) * 0.005));
            prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            update();
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const d = Math.sqrt(dx * dx + dy * dy);
            camDist = Math.max(options.minDist, Math.min(options.maxDist, camDist - (d - touchDist) * 0.5));
            touchDist = d;
            update();
        }
    }, { passive: false });
    renderer.domElement.addEventListener('touchend', () => { isDragging = false; });

    update();
    return {
        setManual: (v) => { manualCamera = v; },
        setDistance: (d) => { camDist = Math.max(options.minDist, Math.min(options.maxDist, d)); update(); },
        update
    };
}
