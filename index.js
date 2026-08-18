import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 宣告全域變數
let CONSTELLATIONS = [];
const starEntries = [];
const constGroups = [];
const sphereRadius = 150;

// --- 初始化 Three.js ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 2, 5); 

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// 補完星星貼圖生成函數
function createStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
}
const starTex = createStarTexture();

function calculatePosition(ra, dec, radius) {
    const phi = (90 - dec) * (Math.PI / 180);
    const theta = (ra + 180) * (Math.PI / 180);
    return new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
}

// ==========================================
//  核心邏輯：讀取與建構
// ==========================================
async function loadConstellationData() {
    try {
        const response = await fetch('./constellations.json');
        if (!response.ok) throw new Error("HTTP error! status: " + response.status);
        CONSTELLATIONS = await response.json();
        
        buildSkyMap();
        buildUIButtons();
    } catch (error) {
        console.error("無法載入資料，請檢查 JSON 格式 (特別是 Libra 的 ra 欄位):", error);
    }
}

function buildSkyMap() {
    CONSTELLATIONS.forEach((con, ci) => {
        const starMeshes = [];
        
        con.stars.forEach((s, si) => {
            const pos = calculatePosition(s.ra, s.dec, sphereRadius);
            
            // --- BUG FIX: 處理 mag 缺失與類型判斷 ---
            let size;
            if (s.type === 'nebula' || s.type === 'cluster') {
                size = 8; // 星雲或星團給予較大的視覺範圍
            } else {
                // 如果 mag 缺失，預設給 3.0
                const mag = (s.mag !== undefined) ? s.mag : 3.0;
                size = Math.max(1.5, (5 - mag) * 1.5);
            }

            // --- BUG FIX: 顏色解析 ---
            const colorHex = parseInt(s.color.replace('0x', ''), 16);
            
            const mat = new THREE.SpriteMaterial({ 
                map: starTex, 
                color: colorHex, 
                transparent: true, 
                blending: THREE.AdditiveBlending 
            });
            
            const obj = new THREE.Sprite(mat);
            obj.position.copy(pos);
            obj.scale.set(size, size, 1);
            scene.add(obj);
            
            const entry = { mesh: obj, data: s, ci, si };
            starEntries.push(entry);
            starMeshes.push(entry);
        });

        // 生成連線
        const linePoints = [];
        con.lines.forEach(([a, b]) => {
            if(starMeshes[a] && starMeshes[b]) {
                linePoints.push(starMeshes[a].mesh.position.clone(), starMeshes[b].mesh.position.clone());
            }
        });

        if (linePoints.length > 0) {
            const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
            const lineMat = new THREE.LineBasicMaterial({ color: 0x7aa2f7, transparent: true, opacity: 0 });
            const lineObj = new THREE.LineSegments(lineGeo, lineMat);
            scene.add(lineObj);
            constGroups.push(lineObj);
        } else {
            // 即使沒有連線，也補一個空物件維持陣列長度一致，避免 toggle 時索引對不上
            constGroups.push({ material: { opacity: 0 } });
        }
    });
}

function buildUIButtons() {
    const constMenu = document.getElementById('const-menu');
    CONSTELLATIONS.forEach((con, ci) => {
        const btn = document.createElement('button');
        btn.className = 'const-btn';
        btn.textContent = con.name;
        btn.onclick = () => toggleConst(ci);
        constMenu.appendChild(btn);
    });
}

let activeCi = -1;
function toggleConst(ci) {
    const subMenu = document.getElementById('sub-menu');
    const starBtnsContainer = document.getElementById('star-btns');

    if(activeCi === ci) {
        activeCi = -1;
        constGroups.forEach(g => g.material.opacity = 0);
        subMenu.style.display = 'none';
        return;
    }

    activeCi = ci;
    // 點亮連線
    constGroups.forEach((g, i) => {
        if(g.material) g.material.opacity = (i === ci ? 0.6 : 0);
    });

    // --- 顯示星星詳細按鈕 ---
    subMenu.style.display = 'block';
    starBtnsContainer.innerHTML = ''; 
    const currentConst = CONSTELLATIONS[ci];
    
    currentConst.stars.forEach((s, si) => {
        const btn = document.createElement('button');
        btn.className = 'star-btn';
        btn.textContent = s.name;
        btn.onclick = () => {
            // 點擊星星時更新 Detail Panel
            showDetail(s);
        };
        starBtnsContainer.appendChild(btn);
    });
}

function showDetail(s) {
    document.getElementById('dp-name').textContent = s.name;
    document.getElementById('dp-type').textContent = s.type.toUpperCase();
    document.getElementById('dp-ra').textContent = s.ra.toFixed(2);
    document.getElementById('dp-dec').textContent = s.dec.toFixed(2);
    
    const magRow = document.getElementById('dp-mag-row');
    if (s.mag !== undefined) {
        magRow.style.display = 'flex';
        document.getElementById('dp-mag').textContent = s.mag;
    } else {
        magRow.style.display = 'none';
    }
    
    document.getElementById('dp-desc').textContent = s.desc;
    document.getElementById('detail-panel').classList.add('active');
}

// 監聽視窗大小
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 啟動
loadConstellationData();

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();
