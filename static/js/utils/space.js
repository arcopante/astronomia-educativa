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

    // target puede ser Vector3 o función () => Vector3 (para follow modes)
    let targetFn = (typeof target === 'function') ? target : () => target;
    const panOffset = new THREE.Vector3(0, 0, 0);

    let active = true;
    let isRotating = false;
    let isPanning = false;
    let prevMouse = { x: 0, y: 0 };
    let camAngle = { theta: options.theta, phi: options.phi };
    let camDist = options.initialDist;
    let continuousUpdate = false;
    let rafId = null;

    function getEffectiveTarget(out) {
        return out.copy(targetFn()).add(panOffset);
    }

    function update() {
        if (!active) return;
        const tgt = getEffectiveTarget(new THREE.Vector3());
        camera.position.x = tgt.x + camDist * Math.sin(camAngle.phi) * Math.sin(camAngle.theta);
        camera.position.y = tgt.y + camDist * Math.cos(camAngle.phi);
        camera.position.z = tgt.z + camDist * Math.sin(camAngle.phi) * Math.cos(camAngle.theta);
        camera.lookAt(tgt);
    }

    function continuousLoop() {
        if (continuousUpdate && active) {
            update();
            rafId = requestAnimationFrame(continuousLoop);
        } else {
            rafId = null;
        }
    }

    function getPanScale() {
        return camDist * 0.0015;
    }

    renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

    renderer.domElement.addEventListener('mousedown', e => {
        active = true;
        if (e.button === 2) {
            isPanning = true;
        } else {
            isRotating = true;
        }
        prevMouse = { x: e.clientX, y: e.clientY };
    });
    renderer.domElement.addEventListener('mousemove', e => {
        if (isRotating) {
            camAngle.theta -= (e.clientX - prevMouse.x) * 0.005;
            camAngle.phi = Math.max(0.05, Math.min(Math.PI - 0.05, camAngle.phi + (e.clientY - prevMouse.y) * 0.005));
            prevMouse = { x: e.clientX, y: e.clientY };
            update();
        } else if (isPanning) {
            const dx = (e.clientX - prevMouse.x);
            const dy = (e.clientY - prevMouse.y);
            const tgt = getEffectiveTarget(new THREE.Vector3());
            const camToTgt = tgt.clone().sub(camera.position).normalize();
            const right = new THREE.Vector3().crossVectors(camToTgt, new THREE.Vector3(0, 1, 0)).normalize();
            const up = new THREE.Vector3().crossVectors(right, camToTgt).normalize();
            const scale = getPanScale();
            panOffset.add(right.multiplyScalar(-dx * scale));
            panOffset.add(up.multiplyScalar(dy * scale));
            prevMouse = { x: e.clientX, y: e.clientY };
            update();
        }
    });
    renderer.domElement.addEventListener('mouseup', e => {
        if (e.button === 2) isPanning = false;
        else isRotating = false;
    });
    renderer.domElement.addEventListener('mouseleave', () => { isRotating = false; isPanning = false; });
    renderer.domElement.addEventListener('wheel', e => {
        e.preventDefault();
        active = true;
        camDist = Math.max(options.minDist, Math.min(options.maxDist, camDist + e.deltaY * 0.5));
        update();
    });

    let touchDist = 0;
    let touchMid = null;
    let touchStartedAsPan = false;
    renderer.domElement.addEventListener('touchstart', e => {
        if (e.touches.length === 1) {
            isRotating = true;
            touchStartedAsPan = false;
            prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            isRotating = false;
            touchStartedAsPan = true;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            touchDist = Math.sqrt(dx * dx + dy * dy);
            touchMid = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
        }
    });
    renderer.domElement.addEventListener('touchmove', e => {
        e.preventDefault();
        if (e.touches.length === 1 && isRotating) {
            camAngle.theta -= (e.touches[0].clientX - prevMouse.x) * 0.005;
            camAngle.phi = Math.max(0.05, Math.min(Math.PI - 0.05, camAngle.phi + (e.touches[0].clientY - prevMouse.y) * 0.005));
            prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            update();
        } else if (e.touches.length === 2 && touchStartedAsPan) {
            const newMid = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
            const dx = newMid.x - touchMid.x;
            const dy = newMid.y - touchMid.y;
            const tgt = getEffectiveTarget(new THREE.Vector3());
            const camToTgt = tgt.clone().sub(camera.position).normalize();
            const right = new THREE.Vector3().crossVectors(camToTgt, new THREE.Vector3(0, 1, 0)).normalize();
            const up = new THREE.Vector3().crossVectors(right, camToTgt).normalize();
            const scale = getPanScale();
            panOffset.add(right.multiplyScalar(-dx * scale));
            panOffset.add(up.multiplyScalar(dy * scale));
            const cdx = e.touches[0].clientX - e.touches[1].clientX;
            const cdy = e.touches[0].clientY - e.touches[1].clientY;
            const d = Math.sqrt(cdx * cdx + cdy * cdy);
            camDist = Math.max(options.minDist, Math.min(options.maxDist, camDist - (d - touchDist) * 0.5));
            touchDist = d;
            touchMid = newMid;
            update();
        }
    }, { passive: false });
    renderer.domElement.addEventListener('touchend', e => {
        if (e.touches.length === 0) { isRotating = false; touchStartedAsPan = false; }
    });

    update();
    return {
        setTarget: (t) => { targetFn = (typeof t === 'function') ? t : () => t; update(); },
        getTarget: () => getEffectiveTarget(new THREE.Vector3()),
        setDistance: (d) => { camDist = Math.max(options.minDist, Math.min(options.maxDist, d)); update(); },
        setView: (theta, phi, dist) => {
            camAngle.theta = theta;
            camAngle.phi = phi;
            if (dist !== undefined) camDist = Math.max(options.minDist, Math.min(options.maxDist, dist));
            panOffset.set(0, 0, 0);
            update();
        },
        resetPan: () => { panOffset.set(0, 0, 0); update(); },
        setActive: (v) => {
            active = v;
            if (v && continuousUpdate && !rafId) continuousLoop();
            update();
        },
        isActive: () => active,
        startContinuous: () => {
            continuousUpdate = true;
            if (active && !rafId) continuousLoop();
        },
        stopContinuous: () => {
            continuousUpdate = false;
        },
        update
    };
}
