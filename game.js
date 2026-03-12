// 太空射击游戏 - 主游戏逻辑
class SpaceShooterGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 游戏状态
        this.gameState = 'menu'; // menu, playing, paused, gameover
        this.score = 0;
        this.highScore = localStorage.getItem('spaceShooterHighScore') || 0;
        this.lives = 5; // 增加初始生命值
        this.level = 1;
        this.gameSpeed = 2; // 降低基础速度
        
        // 玩家飞船
        this.player = {
            x: this.canvas.width / 2 - 25,
            y: this.canvas.height - 80,
            width: 50,
            height: 60,
            speed: 7,
            color: '#00ff88',
            isMovingLeft: false,
            isMovingRight: false
        };
        
        // 子弹数组
        this.bullets = [];
        this.bulletSpeed = 8;
        this.bulletWidth = 4;
        this.bulletHeight = 15;
        this.bulletColor = '#ff3300';
        this.lastShotTime = 0;
        this.shotDelay = 300; // 毫秒
        
        // 陨石数组
        this.asteroids = [];
        this.asteroidColors = ['#888888', '#aaaaaa', '#cccccc', '#999999'];
        this.asteroidSizes = [20, 25, 30, 35]; // 减小陨石大小
        this.lastAsteroidTime = 0;
        this.asteroidDelay = 1500; // 增加陨石生成间隔，降低难度
        this.combo = 0;
        this.lastComboTime = 0;
        
        // 新增：道具系统
        this.powerUps = [];
        this.powerUpTypes = ['health', 'slow', 'rapid', 'shield'];
        this.powerUpColors = {
            'health': '#ff3333',
            'slow': '#33ccff', 
            'rapid': '#ffcc00',
            'shield': '#9933ff'
        };
        this.lastPowerUpTime = 0;
        this.powerUpDelay = 10000; // 10秒生成一个道具
        
        // 新增：玩家状态
        this.hasShield = false;
        this.shieldTime = 0;
        this.rapidFire = false;
        this.rapidFireTime = 0;
        this.slowTime = 0;
        
        // 音效
        this.soundEnabled = true;
        this.sounds = {
            shoot: this.createSound(800, 0.1, 0.1),
            explosion: this.createSound(200, 0.2, 0.3),
            hit: this.createSound(300, 0.1, 0.2),
            gameOver: this.createSound(150, 0.3, 0.5),
            powerUp: this.createSound(600, 0.2, 0.2),
            shield: this.createSound(400, 0.3, 0.3)
        };
        
        // 初始化
        this.init();
        this.setupEventListeners();
        this.updateUI();
        this.gameLoop();
    }
    
    // 创建简单音效（Web Audio API）
    createSound(frequency, duration, volume) {
        return () => {
            if (!this.soundEnabled) return;
            
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = frequency;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + duration);
            } catch (e) {
                console.log('音效创建失败:', e);
            }
        };
    }
    
    init() {
        // 清空数组
        this.bullets = [];
        this.asteroids = [];
        
        // 重置玩家位置
        this.player.x = this.canvas.width / 2 - 25;
        this.player.y = this.canvas.height - 80;
        
        // 更新UI
        document.getElementById('highScore').textContent = this.highScore;
    }
    
    setupEventListeners() {
        // 键盘控制
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    this.player.isMovingLeft = true;
                    break;
                case 'ArrowRight':
                    this.player.isMovingRight = true;
                    break;
                case ' ':
                    this.shoot();
                    e.preventDefault();
                    break;
                case 'p':
                case 'P':
                    this.togglePause();
                    break;
                case 'Enter':
                    if (this.gameState === 'menu' || this.gameState === 'gameover') {
                        this.startGame();
                    }
                    break;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    this.player.isMovingLeft = false;
                    break;
                case 'ArrowRight':
                    this.player.isMovingRight = false;
                    break;
            }
        });
        
        // 按钮控制
        document.getElementById('startBtn').addEventListener('click', () => {
            if (this.gameState === 'menu' || this.gameState === 'gameover') {
                this.startGame();
            }
        });
        
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.togglePause();
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('soundBtn').addEventListener('click', () => {
            this.toggleSound();
        });
        
        // 移动端控制
        document.getElementById('leftBtn').addEventListener('touchstart', () => {
            this.player.isMovingLeft = true;
        });
        
        document.getElementById('leftBtn').addEventListener('touchend', () => {
            this.player.isMovingLeft = false;
        });
        
        document.getElementById('rightBtn').addEventListener('touchstart', () => {
            this.player.isMovingRight = true;
        });
        
        document.getElementById('rightBtn').addEventListener('touchend', () => {
            this.player.isMovingRight = false;
        });
        
        document.getElementById('shootBtn').addEventListener('touchstart', () => {
            this.shoot();
        });
        
        // 防止移动端滚动
        document.addEventListener('touchmove', (e) => {
            if (e.target.classList.contains('mobile-btn')) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // 窗口大小调整
        window.addEventListener('resize', () => {
            // 保持游戏画布比例
            this.adjustCanvasSize();
        });
    }
    
    adjustCanvasSize() {
        // 保持画布在容器内，但保持宽高比
        const container = document.querySelector('.game-container');
        const maxWidth = container.clientWidth;
        
        if (maxWidth < 800) {
            this.canvas.style.width = '100%';
            this.canvas.style.height = 'auto';
        } else {
            this.canvas.style.width = '800px';
            this.canvas.style.height = '500px';
        }
    }
    
    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.lives = 5; // 增加初始生命值
        this.level = 1;
        this.gameSpeed = 2; // 降低基础速度
        this.combo = 0;
        
        // 重置所有状态效果
        this.hasShield = false;
        this.shieldTime = 0;
        this.rapidFire = false;
        this.rapidFireTime = 0;
        this.slowTime = 0;
        this.shotDelay = 300;
        this.powerUps = [];
        
        this.init();
        this.updateUI();
        document.getElementById('startBtn').textContent = '重新开始';
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('pauseBtn').textContent = '继续游戏';
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            document.getElementById('pauseBtn').textContent = '暂停游戏';
        }
    }
    
    restartGame() {
        this.startGame();
    }
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        document.getElementById('soundBtn').textContent = this.soundEnabled ? '🔊 音效' : '🔇 静音';
    }
    
    shoot() {
        const currentTime = Date.now();
        
        // 根据是否快速射击调整射击延迟
        const currentShotDelay = this.rapidFire ? 100 : this.shotDelay;
        
        if (currentTime - this.lastShotTime < currentShotDelay || this.gameState !== 'playing') {
            return;
        }
        
        // 快速射击模式下可以发射2发子弹
        const bulletCount = this.rapidFire ? 2 : 1;
        
        for (let i = 0; i < bulletCount; i++) {
            let bulletX = this.player.x + this.player.width / 2 - this.bulletWidth / 2;
            
            // 如果是双发，稍微分开子弹
            if (bulletCount === 2) {
                bulletX += (i === 0 ? -10 : 10);
            }
            
            this.bullets.push({
                x: bulletX,
                y: this.player.y,
                width: this.bulletWidth,
                height: this.bulletHeight,
                speed: this.bulletSpeed
            });
        }
        
        this.lastShotTime = currentTime;
        this.sounds.shoot();
    }
    
    createAsteroid() {
        const size = this.asteroidSizes[Math.floor(Math.random() * this.asteroidSizes.length)];
        const color = this.asteroidColors[Math.floor(Math.random() * this.asteroidColors.length)];
        
        this.asteroids.push({
            x: Math.random() * (this.canvas.width - size),
            y: -size,
            width: size,
            height: size,
            speed: this.gameSpeed + Math.random() * 1, // 降低速度变化范围
            color: color,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.03 // 降低旋转速度
        });
    }
    
    createPowerUp() {
        const type = this.powerUpTypes[Math.floor(Math.random() * this.powerUpTypes.length)];
        const size = 25;
        
        this.powerUps.push({
            x: Math.random() * (this.canvas.width - size),
            y: -size,
            width: size,
            height: size,
            speed: 2, // 道具下落速度较慢
            type: type,
            color: this.powerUpColors[type],
            rotation: 0,
            rotationSpeed: 0.02
        });
    }
    
    updatePlayer() {
        if (this.player.isMovingLeft && this.player.x > 0) {
            this.player.x -= this.player.speed;
        }
        
        if (this.player.isMovingRight && this.player.x < this.canvas.width - this.player.width) {
            this.player.x += this.player.speed;
        }
    }
    
    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.y -= bullet.speed;
            
            // 移除超出屏幕的子弹
            if (bullet.y + bullet.height < 0) {
                this.bullets.splice(i, 1);
            }
        }
    }
    
    updateAsteroids() {
        const currentTime = Date.now();
        
        // 创建新陨石
        if (currentTime - this.lastAsteroidTime > this.asteroidDelay && this.gameState === 'playing') {
            this.createAsteroid();
            this.lastAsteroidTime = currentTime;
            
            // 随着等级提高，陨石出现更快（但更平缓）
            this.asteroidDelay = Math.max(500, 1500 - (this.level - 1) * 40);
        }
        
        // 创建新道具
        if (currentTime - this.lastPowerUpTime > this.powerUpDelay && this.gameState === 'playing') {
            this.createPowerUp();
            this.lastPowerUpTime = currentTime;
        }
        
        // 更新陨石位置
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const asteroid = this.asteroids[i];
            
            // 应用减速效果
            let actualSpeed = asteroid.speed;
            if (this.slowTime > 0) {
                actualSpeed *= 0.5; // 减速50%
            }
            
            asteroid.y += actualSpeed;
            asteroid.rotation += asteroid.rotationSpeed;
            
            // 移除超出屏幕的陨石
            if (asteroid.y > this.canvas.height) {
                this.asteroids.splice(i, 1);
                this.combo = 0; // 重置连击
            }
        }
        
        // 更新道具位置
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            powerUp.y += powerUp.speed;
            powerUp.rotation += powerUp.rotationSpeed;
            
            // 移除超出屏幕的道具
            if (powerUp.y > this.canvas.height) {
                this.powerUps.splice(i, 1);
            }
        }
        
        // 更新状态效果时间
        const now = Date.now();
        if (this.shieldTime > 0 && now > this.shieldTime) {
            this.hasShield = false;
            this.shieldTime = 0;
        }
        if (this.rapidFireTime > 0 && now > this.rapidFireTime) {
            this.rapidFire = false;
            this.rapidFireTime = 0;
            this.shotDelay = 300; // 恢复普通射击速度
        }
        if (this.slowTime > 0 && now > this.slowTime) {
            this.slowTime = 0;
        }
    }
    
    checkCollisions() {
        // 检查子弹和陨石碰撞
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            for (let j = this.asteroids.length - 1; j >= 0; j--) {
                const asteroid = this.asteroids[j];
                
                if (this.isColliding(bullet, asteroid)) {
                    // 碰撞发生
                    this.bullets.splice(i, 1);
                    this.asteroids.splice(j, 1);
                    
                    // 增加分数
                    this.combo++;
                    const comboBonus = Math.min(this.combo, 5) * 2; // 最多5连击奖励
                    this.score += 10 + comboBonus;
                    
                    // 更新连击时间
                    this.lastComboTime = Date.now();
                    
                    // 检查等级提升
                    const newLevel = Math.floor(this.score / 100) + 1;
                    if (newLevel > this.level) {
                        this.level = newLevel;
                        this.gameSpeed = 3 + (this.level - 1) * 0.5;
                    }
                    
                    // 播放音效
                    this.sounds.explosion();
                    
                    // 更新UI
                    this.updateUI();
                    break;
                }
            }
        }
        
        // 检查玩家和陨石碰撞
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const asteroid = this.asteroids[i];
            
            if (this.isColliding(this.player, asteroid)) {
                // 如果有护盾，不扣血
                if (this.hasShield) {
                    this.asteroids.splice(i, 1);
                    this.sounds.shield();
                    // 护盾吸收伤害后消失
                    this.hasShield = false;
                    this.shieldTime = 0;
                } else {
                    this.asteroids.splice(i, 1);
                    this.lives--;
                    this.combo = 0;
                    
                    this.sounds.hit();
                    this.updateUI();
                    
                    if (this.lives <= 0) {
                        this.gameOver();
                    }
                }
                break;
            }
        }
        
        // 检查玩家和道具碰撞
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            
            if (this.isColliding(this.player, powerUp)) {
                this.powerUps.splice(i, 1);
                this.applyPowerUp(powerUp.type);
                break;
            }
        }
    }
    
    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    applyPowerUp(type) {
        const now = Date.now();
        const duration = 10000; // 10秒效果
        
        switch(type) {
            case 'health':
                this.lives = Math.min(this.lives + 1, 10); // 最多10条命
                break;
            case 'slow':
                this.slowTime = now + duration;
                break;
            case 'rapid':
                this.rapidFire = true;
                this.rapidFireTime = now + duration;
                this.shotDelay = 100; // 快速射击
                break;
            case 'shield':
                this.hasShield = true;
                this.shieldTime = now + duration;
                break;
        }
        
        this.sounds.powerUp();
        this.updateUI();
    }
    
    gameOver() {
        this.gameState = 'gameover';
        
        // 更新最高分
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('spaceShooterHighScore', this.highScore);
        }
        
        // 重置所有状态效果
        this.hasShield = false;
        this.shieldTime = 0;
        this.rapidFire = false;
        this.rapidFireTime = 0;
        this.slowTime = 0;
        this.shotDelay = 300;
        
        this.sounds.gameOver();
        this.updateUI();
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('level').textContent = this.level;
        document.getElementById('highScore').textContent = this.highScore;
        
        // 更新连击显示
        if (this.combo > 1 && Date.now() - this.lastComboTime < 2000) {
            document.getElementById('score').style.color = '#ffcc00';
            document.getElementById('score').textContent = `${this.score} (${this.combo}连击!)`;
        } else {
            document.getElementById('score').style.color = '#00ff88';
            if (this.combo > 1) this.combo = 0;
        }
    }
    
    drawPlayer() {
        this.ctx.save();
        this.ctx.translate(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
        
        // 绘制护盾（如果有）
        if (this.hasShield) {
            this.ctx.strokeStyle = '#33ccff';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.player.width / 2 + 10, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // 护盾光晕
            this.ctx.strokeStyle = 'rgba(51, 204, 255, 0.3)';
            this.ctx.lineWidth = 8;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.player.width / 2 + 10, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        // 绘制飞船主体
        this.ctx.fillStyle = this.player.color;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -this.player.height / 2);
        this.ctx.lineTo(-this.player.width / 2, this.player.height / 2);
        this.ctx.lineTo(this.player.width / 2, this.player.height / 2);
        this.ctx.closePath();
        this.ctx.fill();
        
        // 绘制飞船细节
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(-5, 10, 10, 15);
        
        // 快速射击效果
        if (this.rapidFire) {
            this.ctx.fillStyle = '#ffcc00';
            this.ctx.fillRect(-8, -15, 16, 5);
        }
        
        this.ctx.restore();
    }
    
    drawBullets() {
        this.ctx.fillStyle = this.bulletColor;
        for (const bullet of this.bullets) {
            // 子弹尾焰效果
            const gradient = this.ctx.createLinearGradient(
                bullet.x, bullet.y,
                bullet.x, bullet.y + bullet.height
            );
            gradient.addColorStop(0, '#ff6600');
            gradient.addColorStop(1, '#ff3300');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            
            // 子弹光晕
            this.ctx.shadowColor = '#ff3300';
            this.ctx.shadowBlur = 10;
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            this.ctx.shadowBlur = 0;
        }
    }
    
    drawAsteroids() {
        for (const asteroid of this.asteroids) {
            this.ctx.save();
            this.ctx.translate(asteroid.x + asteroid.width / 2, asteroid.y + asteroid.height / 2);
            this.ctx.rotate(asteroid.rotation);
            
            // 绘制陨石
            this.ctx.fillStyle = asteroid.color;
            this.ctx.beginPath();
            
            // 创建不规则形状
            const sides = 8;
            const radius = asteroid.width / 2;
            
            for (let i = 0; i < sides; i++) {
                const angle = (i * 2 * Math.PI / sides) + Math.random() * 0.5;
                const r = radius * (0.7 + Math.random() * 0.3);
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            
            this.ctx.closePath();
            this.ctx.fill();
            
            // 陨石阴影
            this.ctx.strokeStyle = '#333333';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            this.ctx.restore();
        }
    }
    
    drawPowerUps() {
        for (const powerUp of this.powerUps) {
            this.ctx.save();
            this.ctx.translate(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2);
            this.ctx.rotate(powerUp.rotation);
            
            // 绘制道具（菱形）
            this.ctx.fillStyle = powerUp.color;
            this.ctx.beginPath();
            
            const size = powerUp.width / 2;
            this.ctx.moveTo(0, -size);
            this.ctx.lineTo(size, 0);
            this.ctx.lineTo(0, size);
            this.ctx.lineTo(-size, 0);
            this.ctx.closePath();
            this.ctx.fill();
            
            // 道具光晕
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // 道具图标
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            let symbol = '?';
            switch(powerUp.type) {
                case 'health': symbol = '❤️'; break;
                case 'slow': symbol = '🐌'; break;
                case 'rapid': symbol = '⚡'; break;
                case 'shield': symbol = '🛡️'; break;
            }
            
            this.ctx.fillText(symbol, 0, 0);
            
            this.ctx.restore();
        }
    }
    
    drawBackground() {
        // 星空背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制静态星星（简化版）
        if (!this.stars) {
            this.stars = [];
            for (let i = 0; i < 50; i++) {
                this.stars.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    size: Math.random() * 2 + 0.5,
                    brightness: Math.random() * 0.5 + 0.5
                });
            }
        }
        
        this.ctx.fillStyle = 'white';
        for (const star of this.stars) {
            this.ctx.globalAlpha = star.brightness;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
    }
    
    drawGameState() {
        if (this.gameState === 'menu') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('太空射击游戏', this.canvas.width / 2, this.canvas.height / 2 - 50);
            
            this.ctx.font = '24px Arial';
            this.ctx.fillText('按 Enter 或点击"开始游戏"开始', this.canvas.width / 2, this.canvas.height / 2 + 20);
            this.ctx.fillText('使用 ← → 键移动，空格键射击', this.canvas.width / 2, this.canvas.height / 2 + 60);
            
            this.ctx.font = '20px Arial';
            this.ctx.fillStyle = '#00ff88';
            this.ctx.fillText(`最高分: ${this.highScore}`, this.canvas.width / 2, this.canvas.height / 2 + 120);
        } else if (this.gameState === 'paused') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('游戏暂停', this.canvas.width / 2, this.canvas.height / 2);
            
            this.ctx.font = '24px Arial';
            this.ctx.fillText('按 P 或点击"继续游戏"继续', this.canvas.width / 2, this.canvas.height / 2 + 60);
        } else if (this.gameState === 'gameover') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#ff3333';
            this.ctx.font = 'bold 50px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('游戏结束', this.canvas.width / 2, this.canvas.height / 2 - 50);
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '30px Arial';
            this.ctx.fillText(`最终分数: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
            
            if (this.score > this.highScore) {
                this.ctx.fillStyle = '#ffcc00';
                this.ctx.font = 'bold 26px Arial';
                this.ctx.fillText('🎉 新纪录! 🎉', this.canvas.width / 2, this.canvas.height / 2 + 70);
            }
            
            this.ctx.fillStyle = '#00ff88';
            this.ctx.font = '24px Arial';
            this.ctx.fillText('按 Enter 或点击"重新开始"再玩一次', this.canvas.width / 2, this.canvas.height / 2 + 120);
        }
    }
    
    draw() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制背景
        this.drawBackground();
        
        // 绘制游戏元素
        this.drawBullets();
        this.drawAsteroids();
        this.drawPowerUps();
        this.drawPlayer();
        
        // 绘制游戏状态（菜单、暂停、游戏结束）
        if (this.gameState !== 'playing') {
            this.drawGameState();
        }
        
        // 绘制连击提示
        if (this.combo > 1 && Date.now() - this.lastComboTime < 2000) {
            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${this.combo} 连击!`, this.canvas.width / 2, 40);
        }
        
        // 绘制状态效果提示
        this.drawStatusEffects();
    }
    
    drawStatusEffects() {
        const now = Date.now();
        let yPos = 70;
        
        // 护盾状态
        if (this.hasShield && this.shieldTime > 0) {
            const timeLeft = Math.ceil((this.shieldTime - now) / 1000);
            this.ctx.fillStyle = '#33ccff';
            this.ctx.font = 'bold 18px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`🛡️ 护盾: ${timeLeft}s`, this.canvas.width / 2, yPos);
            yPos += 25;
        }
        
        // 快速射击状态
        if (this.rapidFire && this.rapidFireTime > 0) {
            const timeLeft = Math.ceil((this.rapidFireTime - now) / 1000);
            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = 'bold 18px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`⚡ 快速射击: ${timeLeft}s`, this.canvas.width / 2, yPos);
            yPos += 25;
        }
        
        // 减速状态
        if (this.slowTime > 0 && now < this.slowTime) {
            const timeLeft = Math.ceil((this.slowTime - now) / 1000);
            this.ctx.fillStyle = '#33ccff';
            this.ctx.font = 'bold 18px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`🐌 减速: ${timeLeft}s`, this.canvas.width / 2, yPos);
        }
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.updatePlayer();
        this.updateBullets();
        this.updateAsteroids();
        this.checkCollisions();
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// 初始化游戏
window.addEventListener('load', () => {
    const game = new SpaceShooterGame();
    game.adjustCanvasSize();
    
    // 全局访问（用于调试）
    window.game = game;
});