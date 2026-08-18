// --- 修正後的關鍵部分 ---

// 1. 補完星星貼圖生成函數 (用 Canvas 生成一個發光的點)
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
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// 2. 修正顏色解析
// 在 buildSkyMap 裡面：
const colorHex = s.color.startsWith('0x') ? parseInt(s.color, 16) : parseInt(s.color, 16);
// 或者更安全的寫法：
// const colorHex = parseInt(s.color.replace('0x', ''), 16);

// 3. 增加 Resize 監聽器
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 4. 修正 toggleConst 的邏輯 (補上星星按鈕生成)
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
    constGroups.forEach((g, i) => g.material.opacity = (i === ci ? 0.6 : 0));
    
    // 顯示子選單並生成星星按鈕
    subMenu.style.display = 'block';
    starBtnsContainer.innerHTML = ''; // 清空舊按鈕
    
    const currentConst = CONSTELLATIONS[ci];
    currentConst.stars.forEach((s, si) => {
        const btn = document.createElement('button');
        btn.className = 'star-btn'; // 你要在 CSS 定義這個 class
        btn.textContent = s.name || ''; // 假設 JSON 有名字
        btn.onclick = () => {
            // 點擊星星的行為 (例如：跳轉相機或顯示詳細資料)
            console.log("Clicked star:", s);
        };
        starBtnsContainer.appendChild(btn);
    });
}
