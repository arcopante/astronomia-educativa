const canvas = document.createElement('canvas');
canvas.id = 'starfield-canvas';
canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';
document.getElementById('starfield').appendChild(canvas);
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const stars = [];
for (let i = 0; i < 400; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.8 + 0.2,
        twinkle: Math.random() * 0.02
    });
}

let animationFrame;
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(star => {
        star.opacity += star.twinkle;
        if (star.opacity > 1 || star.opacity < 0.2) {
            star.twinkle = -star.twinkle;
        }
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();
    });
    animationFrame = requestAnimationFrame(animate);
}
animate();

function loadApp(appName) {
    const container = document.getElementById('app-container');
    const iframe = document.getElementById('app-frame');
    container.classList.remove('hidden');
    // Cache-busting para evitar que el iframe muestre HTML antiguo en caché
    iframe.src = `static/js/modules/${appName}.html?v=${Date.now()}`;
    cancelAnimationFrame(animationFrame);
}

function goBack() {
    const container = document.getElementById('app-container');
    const iframe = document.getElementById('app-frame');
    container.classList.add('hidden');
    iframe.src = '';
    animate();
}

window.addEventListener('message', (event) => {
    if (event.data === 'back') {
        goBack();
    }
});