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
            speed: 8, // 稍微提高移动速度
            color: '#00ff88',
            isMovingLeft: false,
            isMovingRight: false,
            autoShoot: false, // 自动射击
            lastAutoShot: 0
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
        
        // BOSS系统
        this.boss = null;
        this.bossActive = false;
        this.bossHealth = 0;
        this.bossMaxHealth = 0;
        this.bossSpawnScore = 500; // 500分后出现BOSS
        this.bossPattern = 0;
        this.bossPatternTime = 0;
        this.bossBullets = [];
        
        // 音效和音乐
        this.soundEnabled = true;
        this.musicEnabled = true;
        this.sounds = {
            shoot: this.createSound(800, 0.1, 0.1),
            explosion: this.createSound(200, 0.2, 0.3),
            hit: this.createSound(300, 0.1, 0.2),
            gameOver: this.createSound(150, 0.3, 0.5),
            powerUp: this.createSound(600, 0.2, 0.2),
            shield: this.createSound(400, 0.3, 0.3),
            bossSpawn: this.createSound(100, 0.5, 0.4),
            bossHit: this.createSound(150, 0.2, 0.3),
            bossDefeat: this.createSound(80, 0.8, 0.5)
        };
        
        // 背景音乐（使用Web Audio API生成）
        this.bgMusic = null;
        this.bgMusicPlaying = false;
        
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
    
    // 创建背景音乐
    createBackgroundMusic() {
        if (!this.musicEnabled || this.bgMusicPlaying) return;
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 创建主振荡器（太空氛围音）
            const mainOsc = audioContext.createOscillator();
            const mainGain = audioContext.createGain();
            
            // 创建低音振荡器
            const bassOsc = audioContext.createOscillator();
            const bassGain = audioContext.createGain();
            
            // 创建旋律振荡器
            const melodyOsc = audioContext.createOscillator();
            const melodyGain = audioContext.createGain();
            
            // 配置主音（太空氛围）
            mainOsc.frequency.value = 110;
            mainOsc.type = 'sine';
            mainGain.gain.value = 0.02;
            
            // 配置低音
            bassOsc.frequency.value = 55;
            bassOsc.type = 'sawtooth';
            bassGain.gain.value = 0.01;
            
            // 配置旋律（随机变化）
            melodyOsc.frequency.value = 440;
            melodyOsc.type = 'triangle';
            melodyGain.gain.value = 0.015;
            
            // 连接节点
            mainOsc.connect(mainGain);
            bassOsc.connect(bassGain);
            melodyOsc.connect(melodyGain);
            
            mainGain.connect(audioContext.destination);
            bassGain.connect(audioContext.destination);
            melodyGain.connect(audioContext.destination);
            
            // 开始播放
            mainOsc.start();
            bassOsc.start();
            melodyOsc.start();
            
            // 保存引用
            this.bgMusic = {
                context: audioContext,
                oscillators: [mainOsc, bassOsc, melodyOsc],
                gains: [mainGain, bassGain, melodyGain]
            };
            
            this.bgMusicPlaying = true;
            
            // 每8秒改变一次旋律频率
            setInterval(() => {
                if (this.bgMusic && this.gameState === 'playing') {
                    const notes = [329.63, 392.00, 440.00, 493.88, 523.25, 587.33];
                    const randomNote = notes[Math.floor(Math.random() * notes.length)];
                    melodyOsc.frequency.linearRampToValueAtTime(randomNote, audioContext.currentTime + 1);
                }
            }, 8000);
            
        } catch (e) {
            console.log('背景音乐创建失败:', e);
        }
    }
    
    // 停止背景音乐
    stopBackgroundMusic() {
        if (this.bgMusic) {
            this.bgMusic.oscillators.forEach(osc => osc.stop());
            this.bgMusic = null;
            this.bgMusicPlaying = false;
        }
    }
    
    // 切换背景音乐
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled && this.gameState === 'playing') {
            this.createBackgroundMusic();
        } else {
            this.stopBackgroundMusic();
        }
        return this.musicEnabled;
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
                case 'a':
                case 'A':
                    this.player.isMovingLeft = true;
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    this.player.isMovingRight = true;
                    break;
                case ' ':
                case 'z':
                case 'Z':
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
                case 'm':
                case 'M':
                    this.toggleMusic();
                    document.getElementById('musicBtn').textContent = 
                        this.musicEnabled ? '🎵 音乐' : '🔇 静音';
                    break;
                case 's':
                case 'S':
                    this.player.autoShoot = !this.player.autoShoot;
                    document.getElementById('autoBtn').textContent = 
                        this.player.autoShoot ? '🔫 自动射击' : '🎯 手动射击';
                    break;
                case '1':
                    // 调试：增加分数
                    if (e.ctrlKey) this.score += 100;
                    break;
                case '2':
                    // 调试：生成BOSS
                    if (e.ctrlKey) this.bossSpawnScore = this.score;
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
        
        document.getElementById('musicBtn').addEventListener('click', () => {
            const enabled = this.toggleMusic();
            document.getElementById('musicBtn').textContent = 
                enabled ? '🎵 音乐' : '🔇 静音';
        });
        
        document.getElementById('autoBtn').addEventListener('click', () => {
            this.player.autoShoot = !this.player.autoShoot;
            document.getElementById('autoBtn').textContent = 
                this.player.autoShoot ? '🔫 自动射击' : '🎯 手动射击';
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
        
        // 重置BOSS系统
        this.boss = null;
        this.bossActive = false;
        this.bossHealth = 0;
        this.bossSpawnScore = 500;
        this.bossBullets = [];
        
        // 重置玩家状态
        this.player.autoShoot = false;
        
        // 开始背景音乐
        if (this.musicEnabled) {
            this.createBackgroundMusic();
        }
        
        this.init();
        this.updateUI();
        document.getElementById('startBtn').textContent = '重新开始';
        document.getElementById('autoBtn').textContent = '🎯 手动射击';
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('pauseBtn').textContent = '继续游戏';
            
            // 暂停时降低背景音乐音量
            if (this.bgMusic) {
                this.bgMusic.gains.forEach(gain => {
                    gain.gain.value = 0.01;
                });
            }
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            document.getElementById('pauseBtn').textContent = '暂停游戏';
            
            // 恢复背景音乐音量
            if (this.bgMusic) {
                this.bgMusic.gains[0].gain.value = 0.02;
                this.bgMusic.gains[1].gain.value = 0.01;
                this.bgMusic.gains[2].gain.value = 0.015;
            }
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
    
    spawnBoss() {
        if (this.bossActive || this.score < this.bossSpawnScore) return;
        
        this.bossActive = true;
        this.bossHealth = 100 + (this.level * 20);
        this.bossMaxHealth = this.bossHealth;
        
        this.boss = {
            x: this.canvas.width / 2 - 75,
            y: 50,
            width: 150,
            height: 100,
            speed: 1,
            direction: 1,
            color: '#ff3333',
            pattern: 0,
            patternTime: Date.now(),
            lastShot: Date.now()
        };
        
        // 停止生成普通陨石和道具
        this.asteroidDelay = 999999;
        this.powerUpDelay = 999999;
        
        this.sounds.bossSpawn();
        
        // 更新BOSS生成分数阈值
        this.bossSpawnScore = this.score + 300; // 每300分出现一次BOSS
    }
    
    updateBoss() {
        if (!this.bossActive || !this.boss) return;
        
        const now = Date.now();
        
        // BOSS移动模式
        this.boss.x += this.boss.speed * this.boss.direction;
        
        // 边界检测
        if (this.boss.x <= 0 || this.boss.x + this.boss.width >= this.canvas.width) {
            this.boss.direction *= -1;
            this.boss.pattern = (this.boss.pattern + 1) % 3;
            this.boss.patternTime = now;
        }
        
        // BOSS攻击模式
        if (now - this.boss.lastShot > 1000) { // 每秒攻击一次
            this.bossAttack();
            this.boss.lastShot = now;
        }
        
        // 更新BOSS子弹
        for (let i = this.bossBullets.length - 1; i >= 0; i--) {
            const bullet = this.bossBullets[i];
            
            // 追踪子弹逻辑
            if (bullet.isTracking) {
                const playerCenterX = this.player.x + this.player.width / 2;
                const playerCenterY = this.player.y + this.player.height / 2;
                
                const targetAngle = Math.atan2(
                    playerCenterY - bullet.y,
                    playerCenterX - bullet.x
                );
                
                // 平滑转向
                const turnSpeed = 0.1;
                bullet.angle += (targetAngle - bullet.angle) * turnSpeed;
                
                bullet.x += Math.cos(bullet.angle) * bullet.speed;
                bullet.y += Math.sin(bullet.angle) * bullet.speed;
            } else {
                bullet.y += bullet.speed;
            }
            
            // 移除超出屏幕的子弹
            if (bullet.y > this.canvas.height || bullet.x < 0 || bullet.x > this.canvas.width) {
                this.bossBullets.splice(i, 1);
            }
        }
        
        // 检查BOSS是否被击败
        if (this.bossHealth <= 0) {
            this.defeatBoss();
        }
    }
    
    bossAttack() {
        if (!this.boss) return;
        
        const bossCenterX = this.boss.x + this.boss.width / 2;
        const bossCenterY = this.boss.y + this.boss.height;
        
        // 根据模式选择攻击方式
        switch(this.boss.pattern) {
            case 0: // 三发散射
                for (let i = -1; i <= 1; i++) {
                    this.bossBullets.push({
                        x: bossCenterX + (i * 20),
                        y: bossCenterY,
                        width: 8,
                        height: 20,
                        speed: 4,
                        color: '#ff6666'
                    });
                }
                break;
                
            case 1: // 五发扇形
                for (let i = -2; i <= 2; i++) {
                    this.bossBullets.push({
                        x: bossCenterX + (i * 15),
                        y: bossCenterY,
                        width: 6,
                        height: 18,
                        speed: 3 + Math.abs(i) * 0.5,
                        color: '#ff9966'
                    });
                }
                break;
                
            case 2: // 追踪玩家
                const playerCenterX = this.player.x + this.player.width / 2;
                const angle = Math.atan2(
                    this.player.y - bossCenterY,
                    playerCenterX - bossCenterX
                );
                
                this.bossBullets.push({
                    x: bossCenterX,
                    y: bossCenterY,
                    width: 10,
                    height: 25,
                    speed: 3,
                    color: '#ff3333',
                    angle: angle,
                    isTracking: true
                });
                break;
        }
    }
    
    defeatBoss() {
        this.bossActive = false;
        this.boss = null;
        
        // 恢复普通陨石和道具生成
        this.asteroidDelay = 1500;
        this.powerUpDelay = 10000;
        
        // BOSS击败奖励
        this.score += 200;
        this.lives = Math.min(this.lives + 2, 10); // 奖励2条命
        
        // 生成大量道具
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                if (this.gameState === 'playing') {
                    this.createPowerUp();
                }
            }, i * 300);
        }
        
        this.sounds.bossDefeat();
        this.updateUI();
    }
    
    updatePlayer() {
        if (this.player.isMovingLeft && this.player.x > 0) {
            this.player.x -= this.player.speed;
        }
        
        if (this.player.isMovingRight && this.player.x < this.canvas.width - this.player.width) {
            this.player.x += this.player.speed;
        }
        
        // 自动射击
        if (this.player.autoShoot && this.gameState === 'playing') {
            const now = Date.now();
            const autoShotDelay = this.rapidFire ? 150 : 300;
            
            if (now - this.player.lastAutoShot > autoShotDelay) {
                this.shoot();
                this.player.lastAutoShot = now;
            }
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
        
        // 停止背景音乐
        this.stopBackgroundMusic();
        
        // 重置BOSS
        this.boss = null;
        this.bossActive = false;
        this.bossBullets = [];
        
        this.sounds.gameOver();
        this.updateUI();
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('level').textContent = this.level;
        document.getElementById('highScore').textContent = this.highScore;
        
        // 更新BOSS状态显示
        let bossStatus = '准备中';
        let bossColor = '#00ff88';
        
        if (this.bossActive) {
            bossStatus = '战斗中';
            bossColor = '#ff3333';
        } else if (this.score >= this.bossSpawnScore) {
            bossStatus = '即将出现';
            bossColor = '#ffcc00';
        } else {
            const remaining = this.bossSpawnScore - this.score;
            bossStatus = `${remaining}分后`;
        }
        
        const bossElement = document.getElementById('bossStatus');
        bossElement.textContent = bossStatus;
        bossElement.style.color = bossColor;
        
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
    
    drawBoss() {
        if (!this.bossActive || !this.boss) return;
        
        this.ctx.save();
        this.ctx.translate(this.boss.x + this.boss.width / 2, this.boss.y + this.boss.height / 2);
        
        // 绘制BOSS主体
        this.ctx.fillStyle = this.boss.color;
        this.ctx.beginPath();
        
        // BOSS形状（外星飞船）
        this.ctx.moveTo(0, -this.boss.height / 2);
        this.ctx.lineTo(-this.boss.width / 3, 0);
        this.ctx.lineTo(-this.boss.width / 2, this.boss.height / 3);
        this.ctx.lineTo(0, this.boss.height / 2);
        this.ctx.lineTo(this.boss.width / 2, this.boss.height / 3);
        this.ctx.lineTo(this.boss.width / 3, 0);
        this.ctx.closePath();
        this.ctx.fill();
        
        // BOSS细节
        this.ctx.fillStyle = '#ff6666';
        this.ctx.fillRect(-15, -10, 30, 15); // 驾驶舱
        
        this.ctx.fillStyle = '#ff9966';
        for (let i = -2; i <= 2; i++) {
            this.ctx.fillRect(i * 20 - 5, 20, 10, 15); // 推进器
        }
        
        // BOSS血条
        this.ctx.restore();
        
        const barWidth = 200;
        const barHeight = 15;
        const barX = this.canvas.width / 2 - barWidth / 2;
        const barY = 10;
        
        // 血条背景
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // 当前血量
        const healthPercent = this.bossHealth / this.bossMaxHealth;
        this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : 
                            healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        this.ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        // 血条边框
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        // BOSS标签
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('👾 BOSS', this.canvas.width / 2, barY + barHeight + 20);
    }
    
    drawBossBullets() {
        for (const bullet of this.bossBullets) {
            this.ctx.save();
            
            // 追踪子弹有特殊效果
            if (bullet.isTracking) {
                const gradient = this.ctx.createRadialGradient(
                    bullet.x, bullet.y, 0,
                    bullet.x, bullet.y, bullet.width * 2
                );
                gradient.addColorStop(0, '#ff0000');
                gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
                
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(bullet.x, bullet.y, bullet.width * 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // 子弹主体
            this.ctx.fillStyle = bullet.color;
            this.ctx.fillRect(
                bullet.x - bullet.width / 2,
                bullet.y - bullet.height / 2,
                bullet.width,
                bullet.height
            );
            
            // 子弹光晕
            this.ctx.shadowColor = bullet.color;
            this.ctx.shadowBlur = 10;
            this.ctx.fillRect(
                bullet.x - bullet.width / 2,
                bullet.y - bullet.height / 2,
                bullet.width,
                bullet.height
            );
            this.ctx.shadowBlur = 0;
            
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
        this.drawBossBullets();
        this.drawBoss();
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
        
        // 检查是否需要生成BOSS
        if (!this.bossActive && this.score >= this.bossSpawnScore) {
            this.spawnBoss();
        }
        
        this.updateBoss();
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