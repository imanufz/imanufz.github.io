// --- 1. Datos e Inicialización ---
const documentVersions = [
    { id: 1, fecha: "2026-01-10-09.00AM", versionName: "v1.0.0 - Initial Core", descripcion: "Lanzamiento base del sistema de documentación técnica." },
    { id: 2, fecha: "2026-02-05-02.30PM", versionName: "v1.1.2 - Security Patch", descripcion: "Optimización de protocolos de encriptación y corrección de bugs menores." },
    { id: 4, fecha: "19-02-2026-12.30PM", versionName: "v1.3.0 - Módulos Base", descripcion: "Módulos de seguridad #2 agregados al core." },
    { id: 3, fecha: "2026-02-18-11.45AM", versionName: "v1.2.0 - UI Overhaul", descripcion: "Nueva interfaz con soporte avanzado y Dark Mode." }
];

// --- 2. Lógica Core: Parseo de Fechas Robusto ---
/**
 * Normaliza fechas mixtas (YYYY-MM-DD y DD-MM-YYYY con horas) a objetos Date nativos.
 */
const parseDateRobust = (dateStr) => {
    const parts = dateStr.split('-');
    let year, month, day, timeStr;

    // Lógica de detección: si el primer bloque es de 4 dígitos, es YYYY.
    if (parts[0].length === 4) {
        [year, month, day, timeStr] = parts;
    } else {
        [day, month, year, timeStr] = parts;
    }

    // Extraer Hora (Ej: 12.30PM)
    const timeMatch = timeStr.match(/(\d{2})\.(\d{2})(AM|PM)/i);
    if (!timeMatch) return new Date(0); // Fallback seguro

    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const period = timeMatch[3].toUpperCase();

    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    // Mes en JS es 0-indexado
    return new Date(year, month - 1, day, hours, minutes);
};

// Ordenar de más reciente a más antiguo
const sortedVersions = documentVersions.sort((a, b) => {
    return parseDateRobust(b.fecha) - parseDateRobust(a.fecha);
});

// --- 3. UI: Renderizado ---
const renderVersions = () => {
    const grid = document.getElementById('version-grid');
    const latest = sortedVersions[0];

    // Poblar Hero Widget
    document.getElementById('hero-title').innerText = latest.versionName;
    document.getElementById('hero-desc').innerText = latest.descripcion;
    document.getElementById('hero-date').innerText = latest.fecha.replace(/-/g, ' ');

    const heroWidget = document.getElementById('hero-widget');
    heroWidget.onclick = () => processDownload(latest.fecha);
    heroWidget.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); processDownload(latest.fecha); }};

    // Renderizar Historial
    grid.innerHTML = '';
    sortedVersions.forEach((doc, index) => {
        const card = document.createElement('div');
        card.className = 'version-card shadow-dark fade-in-cascade';
        card.style.animationDelay = `${index * 0.1}s`;
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Descargar versión ${doc.versionName}`);
        
        card.innerHTML = `
            <h4>${doc.versionName}</h4>
            <p>${doc.descripcion}</p>
            <span class="version-date">
                <i data-lucide="clock" class="meta-icon"></i> ${doc.fecha.replace(/-/g, ' ')}
            </span>
        `;
        
        const triggerDownload = () => processDownload(doc.fecha);
        card.onclick = triggerDownload;
        card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); triggerDownload(); }};
        
        grid.appendChild(card);
    });

    // Inicializar iconos de Lucide
    lucide.createIcons();
};

// --- 4. Lógica de Descarga y Red ---

/**
 * Verifica la existencia del archivo vía HEAD request.
 */
const checkFileAvailability = async (url) => {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch (e) {
        // En caso de bloqueo CORS en Github Pages, retornamos true para permitir el intento de descarga
        console.warn("CORS/Network impidió la verificación HEAD. Procediendo con intento de descarga.");
        return true; 
    }
};

/**
 * Ejecuta la descarga física del archivo
 */
const triggerActualDownload = (url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = "_blank"; // Fallback por si el navegador intenta abrir el PDF en vez de descargarlo
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

/**
 * Orquestador principal de la animación y validación
 */
const processDownload = async (fecha) => {
    const modal = document.getElementById('loader-modal');
    const fill = document.getElementById('progress-fill');
    const text = document.getElementById('progress-text');
    const statusText = document.getElementById('modal-status');
    const closeBtn = document.getElementById('modal-close-btn');
    const progressBar = modal.querySelector('.progress-bar-container');
    
    // Configuración Inicial del Modal
    modal.classList.add('active');
    closeBtn.classList.add('hidden');
    fill.style.width = '0%';
    fill.style.background = 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))';
    text.innerText = '0%';
    statusText.innerText = "Verificando disponibilidad en el servidor...";
    statusText.style.color = "var(--text-muted)";
    progressBar.setAttribute('aria-valuenow', 0);

    const targetUrl = `https://imanufz.github.io/pdf/${fecha}.pdf`;
    const fileName = `${fecha}.pdf`;

    // 1. Validar Archivo
    const isAvailable = await checkFileAvailability(targetUrl);

    if (!isAvailable) {
        statusText.innerText = "Error: El archivo no se encuentra en el servidor.";
        statusText.style.color = "var(--error-color)";
        fill.style.background = "var(--error-color)";
        fill.style.width = '100%';
        text.innerText = "Error 404";
        closeBtn.classList.remove('hidden');
        closeBtn.onclick = () => modal.classList.remove('active');
        return;
    }

    // 2. Simular Progreso de Descarga Segura
    let progress = 0;
    const statusMessages = [
        "Negociando handshake seguro (TLS 1.3)...",
        "Resolviendo fragmentos de datos...",
        "Desencriptando paquetes AES-256...",
        "Preparando volcado a disco..."
    ];

    const simulateProgress = () => {
        if (progress >= 100) {
            fill.style.width = '100%';
            text.innerText = '100%';
            statusText.innerText = "¡Descarga autorizada y completada!";
            progressBar.setAttribute('aria-valuenow', 100);
            
            // Disparar Descarga Real
            setTimeout(() => {
                triggerActualDownload(targetUrl, fileName);
                modal.classList.remove('active');
            }, 800);
            return;
        }

        // Simulación realista de red
        const isPause = Math.random() > 0.85; 
        const increment = isPause ? 0 : Math.random() * 18 + 4; 
        const delay = isPause ? Math.random() * 600 + 300 : Math.random() * 150 + 50; 

        progress = Math.min(progress + increment, 100);
        
        const stage = Math.floor((progress / 100) * statusMessages.length);
        statusText.innerText = statusMessages[Math.min(stage, statusMessages.length - 1)];

        fill.style.width = `${progress}%`;
        text.innerText = `${Math.round(progress)}%`;
        progressBar.setAttribute('aria-valuenow', Math.round(progress));

        setTimeout(simulateProgress, delay);
    };

    simulateProgress();
};

// --- 5. Background Neural Optimizado para Rendimiento ---
const canvas = document.getElementById('neuralCanvas');
const ctx = canvas.getContext('2d', { alpha: false }); // Optimización de renderizado
let particles = [];
let animationFrameId;

const initCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particles = [];
    
    // Detección Mobile-First para optimizar batería/CPU
    const isMobile = window.innerWidth < 640;
    // Menos densidad de partículas en móviles
    const divisor = isMobile ? 60 : 35; 
    const particleCount = Math.floor(window.innerWidth / divisor); 
    
    for(let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.2, 
            vy: (Math.random() - 0.5) * 0.2
        });
    }
};

const drawCanvas = () => {
    // Rellenar fondo sólido en el canvas para evitar el parpadeo y mejorar performance
    ctx.fillStyle = '#020617'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const connectionRadius = window.innerWidth < 640 ? 120 : 180;

    particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if(p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if(p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.5)'; // Cyan
        ctx.fill();

        for(let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const distSq = dx * dx + dy * dy; // Más rápido que Math.hypot
            
            if(distSq < connectionRadius * connectionRadius) {
                const dist = Math.sqrt(distSq);
                const opacity = 1 - (dist / connectionRadius);
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = `rgba(59, 130, 246, ${opacity * 0.25})`; // Blue
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    });
    animationFrameId = requestAnimationFrame(drawCanvas);
};

// Debounce para el resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        cancelAnimationFrame(animationFrameId);
        initCanvas();
        drawCanvas();
    }, 200);
});

// Boot
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    drawCanvas();
    renderVersions();
});
