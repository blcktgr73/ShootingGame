// 갤러그 스타일 슈팅 게임 메인 파일

class Game {
    constructor() {
        // 게임 상태 초기화
        this.state = GAME_CONFIG.gameStates.MENU;
        this.canvas = null;
        this.ctx = null;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        
        // 입력 상태
        this.keys = {};
        this.keyPressed = {};
        
        // 게임 데이터
        this.score = 0;
        this.stage = 1;
        this.lives = GAME_CONFIG.player.defaultLives;
        
        // 게임 객체들
        this.player = null;
        this.bulletManager = null;
        this.collisionManager = null;
        this.effectManager = null;
        this.enemyManager = null;
        this.powerups = [];
        
        // 시간 관리
        this.pausedTime = 0;
        this.gameStartTime = 0;
        
        this.init();
    }

    init() {
        // Canvas 초기화
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 화면 크기 설정
        this.canvas.width = GAME_CONFIG.canvas.width;
        this.canvas.height = GAME_CONFIG.canvas.height;
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
        
        // UI 초기화
        this.initUI();
        
        // 게임 매니저들 초기화
        this.initGameManagers();
        
        // 저장된 설정 불러오기
        this.loadSettings();
        
        // 게임 루프 시작
        this.gameLoop();
        
        console.log('게임 초기화 완료');
    }

    initGameManagers() {
        // 총알 매니저 초기화
        this.bulletManager = new BulletManager();
        
        // 적 매니저 초기화
        this.enemyManager = new EnemyManager();
        
        // 충돌 매니저 초기화
        this.collisionManager = new CollisionManager();
        this.effectManager = new CollisionEffectManager();
        
        // 충돌 이벤트 콜백 등록
        this.setupCollisionCallbacks();
    }

    setupCollisionCallbacks() {
        // 플레이어 피격 콜백
        this.collisionManager.registerCallback('playerHit', (player, bullet, damaged) => {
            this.effectManager.createHitEffect(
                player.getCenterX(), 
                player.getCenterY(), 
                'normal'
            );
            
            if (damaged) {
                this.lives = player.lives;
                this.updateLivesDisplay();
                
                if (this.lives <= 0) {
                    this.gameOver();
                }
            }
        });
        
        // 적 피격 콜백
        this.collisionManager.registerCallback('enemyHit', (enemy, bullet, destroyed) => {
            this.effectManager.createHitEffect(
                enemy.getCenterX(), 
                enemy.getCenterY(), 
                destroyed ? 'explosion' : 'normal'
            );
        });
        
        // 적 파괴 콜백
        this.collisionManager.registerCallback('enemyDestroyed', (enemy) => {
            this.score += enemy.score || 100;
            this.updateScoreDisplay();
        });
    }

    setupEventListeners() {
        // 키보드 이벤트
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // 메뉴 버튼 이벤트
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('highScoreBtn').addEventListener('click', () => this.showHighScores());
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        document.getElementById('controlsBtn').addEventListener('click', () => this.showControls());
        
        // 일시정지 메뉴 버튼
        document.getElementById('resumeBtn').addEventListener('click', () => this.resumeGame());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('mainMenuBtn').addEventListener('click', () => this.goToMainMenu());
        
        // 게임 오버 버튼
        document.getElementById('playAgainBtn').addEventListener('click', () => this.startGame());
        document.getElementById('backToMenuBtn').addEventListener('click', () => this.goToMainMenu());
        
        // 스테이지 클리어 버튼
        document.getElementById('nextStageBtn').addEventListener('click', () => this.nextStage());
        
        // 설정 버튼
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());
        document.getElementById('cancelSettingsBtn').addEventListener('click', () => this.goToMainMenu());
        
        // 조작법 버튼
        document.getElementById('closeControlsBtn').addEventListener('click', () => this.goToMainMenu());
        
        // 음량 슬라이더
        document.getElementById('masterVolume').addEventListener('input', (e) => this.updateVolume('master', e.target.value));
        document.getElementById('sfxVolume').addEventListener('input', (e) => this.updateVolume('sfx', e.target.value));
        document.getElementById('musicVolume').addEventListener('input', (e) => this.updateVolume('music', e.target.value));
    }

    initUI() {
        // 생명력 하트 초기화
        this.updateLivesDisplay();
        
        // 점수 및 스테이지 표시 초기화
        this.updateScoreDisplay();
        this.updateStageDisplay();
    }

    onKeyDown(e) {
        this.keys[e.code] = true;
        
        // 한 번만 실행되어야 하는 키 이벤트
        if (!this.keyPressed[e.code]) {
            this.keyPressed[e.code] = true;
            
            // 게임 상태별 키 처리
            switch (this.state) {
                case GAME_CONFIG.gameStates.PLAYING:
                    if (GAME_CONFIG.keys.pause.includes(e.code)) {
                        this.pauseGame();
                    }
                    break;
                    
                case GAME_CONFIG.gameStates.PAUSED:
                    if (GAME_CONFIG.keys.pause.includes(e.code)) {
                        this.resumeGame();
                    }
                    break;
                    
                case GAME_CONFIG.gameStates.GAME_OVER:
                    if (GAME_CONFIG.keys.restart.includes(e.code)) {
                        this.startGame();
                    }
                    break;
            }
        }
        
        e.preventDefault();
    }

    onKeyUp(e) {
        this.keys[e.code] = false;
        this.keyPressed[e.code] = false;
        e.preventDefault();
    }

    gameLoop(currentTime = 0) {
        // 델타 타임 계산
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // FPS 계산
        this.frameCount++;
        if (this.frameCount % 60 === 0) {
            this.fps = Math.round(1000 / this.deltaTime);
        }
        
        // 게임 상태별 업데이트
        switch (this.state) {
            case GAME_CONFIG.gameStates.PLAYING:
                this.update(this.deltaTime);
                this.render();
                break;
                
            case GAME_CONFIG.gameStates.MENU:
                this.renderMenu();
                break;
                
            case GAME_CONFIG.gameStates.PAUSED:
                this.render(); // 게임 화면은 그대로 두고
                break;
        }
        
        // 디버그 정보 표시
        if (DEBUG.enabled && DEBUG.showFPS) {
            this.renderDebugInfo();
        }
        
        // 다음 프레임 요청
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    update(deltaTime) {
        if (!this.player) return;
        
        // 플레이어 업데이트
        this.player.update(deltaTime, this.keys);
        
        // 플레이어 총알 발사 처리
        if (this.keys['Space']) {
            const newBullets = this.player.fire();
            newBullets.forEach(bullet => {
                this.bulletManager.bullets.push(bullet);
            });
        }
        
        // 총알 업데이트
        this.bulletManager.update(deltaTime);
        
        // 적 업데이트
        this.enemyManager.update(deltaTime, this.player, this.bulletManager);
        
        // 파워업 업데이트 (추후 구현)
        // this.updatePowerups(deltaTime);
        
        // 충돌 감지
        this.checkCollisions();
        
        // 파티클 효과 업데이트
        this.effectManager.update(deltaTime);
        
        // UI 업데이트
        this.lives = this.player.lives;
        this.updateLivesDisplay();
    }

    checkCollisions() {
        // 플레이어와 적 총알 충돌
        const enemyBullets = this.bulletManager.getBulletsByOwner('enemy');
        this.collisionManager.checkPlayerBulletCollisions(this.player, enemyBullets);
        
        // 플레이어 총알과 적 충돌
        const playerBullets = this.bulletManager.getBulletsByOwner('player');
        const activeEnemies = this.enemyManager.getActiveEnemies();
        this.collisionManager.checkEnemyBulletCollisions(activeEnemies, playerBullets);
        
        // 플레이어와 적 직접 충돌
        this.collisionManager.checkPlayerEnemyCollisions(this.player, activeEnemies);
        
        // 플레이어와 파워업 충돌
        this.collisionManager.checkPlayerPowerupCollisions(this.player, this.powerups);
    }

    render() {
        // 화면 클리어
        this.ctx.fillStyle = GAME_CONFIG.canvas.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 배경 렌더링
        this.renderBackground();
        
        // 게임 객체 렌더링
        if (this.player) {
            this.player.render(this.ctx);
        }
        
        // 적 렌더링
        this.enemyManager.render(this.ctx);
        
        // 총알 렌더링
        this.bulletManager.render(this.ctx);
        
        // 파워업 렌더링 (추후 구현)
        this.powerups.forEach(powerup => powerup.render(this.ctx));
        
        // 파티클 효과 렌더링
        this.effectManager.render(this.ctx);
        
        // 개발 중 안내 텍스트 (플레이어가 없을 때만)
        if (!this.player) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '24px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('게임을 시작해주세요', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.fillText('메뉴에서 "게임 시작" 클릭', this.canvas.width / 2, this.canvas.height / 2 + 40);
        }
    }

    renderBackground() {
        // 간단한 별 배경 (추후 개선)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 50; i++) {
            const x = (i * 37) % this.canvas.width;
            const y = (i * 73 + this.frameCount) % this.canvas.height;
            this.ctx.fillRect(x, y, 1, 1);
        }
    }

    renderMenu() {
        // 메뉴는 HTML/CSS로 처리되므로 여기서는 특별한 렌더링 불필요
    }

    renderDebugInfo() {
        this.ctx.fillStyle = 'yellow';
        this.ctx.font = '16px Courier New';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`FPS: ${this.fps}`, 10, 30);
        this.ctx.fillText(`Objects: ${this.gameObjects.length}`, 10, 50);
        this.ctx.fillText(`State: ${this.state}`, 10, 70);
    }

    // 게임 상태 전환 메서드들
    startGame() {
        this.state = GAME_CONFIG.gameStates.PLAYING;
        this.score = 0;
        this.stage = 1;
        this.lives = GAME_CONFIG.player.defaultLives;
        this.gameStartTime = performance.now();
        
        // 플레이어 생성
        this.player = new Player(
            GAME_CONFIG.canvas.width / 2 - GAME_CONFIG.player.width / 2,
            GAME_CONFIG.canvas.height - GAME_CONFIG.player.height - 20
        );
        
        // 게임 객체들 초기화
        this.powerups = [];
        this.bulletManager.clear();
        this.effectManager.clear();
        
        // 스테이지 시작
        this.enemyManager.startStage(this.stage, (result) => {
            if (result === 'stage_complete') {
                this.stageClear();
            }
        });
        
        // 화면 전환
        this.hideAllScreens();
        document.getElementById('gameScreen').classList.remove('hidden');
        
        // UI 업데이트
        this.updateScoreDisplay();
        this.updateStageDisplay();
        this.updateLivesDisplay();
        
        console.log('게임 시작');
    }

    pauseGame() {
        if (this.state === GAME_CONFIG.gameStates.PLAYING) {
            this.state = GAME_CONFIG.gameStates.PAUSED;
            document.getElementById('pauseMenu').classList.remove('hidden');
            console.log('게임 일시정지');
        }
    }

    resumeGame() {
        if (this.state === GAME_CONFIG.gameStates.PAUSED) {
            this.state = GAME_CONFIG.gameStates.PLAYING;
            document.getElementById('pauseMenu').classList.add('hidden');
            console.log('게임 재개');
        }
    }

    restartGame() {
        this.startGame();
    }

    gameOver() {
        this.state = GAME_CONFIG.gameStates.GAME_OVER;
        
        // 최종 점수 표시
        document.getElementById('finalScoreValue').textContent = this.score.toLocaleString();
        
        // 하이스코어 확인
        if (this.checkHighScore(this.score)) {
            document.getElementById('newHighScore').classList.remove('hidden');
        } else {
            document.getElementById('newHighScore').classList.add('hidden');
        }
        
        // 화면 전환
        document.getElementById('gameOverScreen').classList.remove('hidden');
        
        console.log('게임 오버');
    }

    stageClear() {
        this.state = GAME_CONFIG.gameStates.STAGE_CLEAR;
        
        // 보너스 점수 계산
        const timeBonus = Math.max(0, Math.floor((60000 - (performance.now() - this.gameStartTime)) / 100));
        const noDamageBonus = this.player.lives === GAME_CONFIG.player.defaultLives ? 1000 : 0;
        const totalBonus = timeBonus + noDamageBonus;
        
        this.score += totalBonus;
        this.updateScoreDisplay();
        
        // 보너스 점수 표시
        document.getElementById('bonusScore').textContent = totalBonus.toLocaleString();
        
        // 스테이지 클리어 화면 표시
        document.getElementById('stageClearScreen').classList.remove('hidden');
        
        console.log(`스테이지 ${this.stage} 클리어! 보너스: ${totalBonus}점`);
    }

    nextStage() {
        this.stage++;
        this.state = GAME_CONFIG.gameStates.PLAYING;
        this.gameStartTime = performance.now();
        
        // 스테이지 클리어 화면 숨기기
        document.getElementById('stageClearScreen').classList.add('hidden');
        
        // 새로운 스테이지 시작
        this.enemyManager.startStage(this.stage, (result) => {
            if (result === 'stage_complete') {
                this.stageClear();
            }
        });
        
        // UI 업데이트
        this.updateStageDisplay();
        
        console.log(`스테이지 ${this.stage} 시작`);
    }

    goToMainMenu() {
        this.state = GAME_CONFIG.gameStates.MENU;
        this.hideAllScreens();
        document.getElementById('mainMenu').classList.remove('hidden');
        console.log('메인 메뉴로 이동');
    }

    showHighScores() {
        // 하이스코어 화면 구현 (추후)
        console.log('하이스코어 표시 (추후 구현)');
    }

    showSettings() {
        this.hideAllScreens();
        document.getElementById('settingsScreen').classList.remove('hidden');
    }

    showControls() {
        this.hideAllScreens();
        document.getElementById('controlsScreen').classList.remove('hidden');
    }

    hideAllScreens() {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => screen.classList.add('hidden'));
    }

    // UI 업데이트 메서드들
    updateScoreDisplay() {
        document.getElementById('score').textContent = this.score.toLocaleString();
    }

    updateStageDisplay() {
        document.getElementById('stage').textContent = this.stage;
    }

    updateLivesDisplay() {
        const livesContainer = document.getElementById('lives');
        livesContainer.innerHTML = '';
        
        for (let i = 0; i < this.lives; i++) {
            const heart = document.createElement('div');
            heart.className = 'life-heart';
            livesContainer.appendChild(heart);
        }
    }

    updateVolume(type, value) {
        const percentage = Math.round(value);
        document.getElementById(`${type}VolumeValue`).textContent = `${percentage}%`;
        
        // 실제 오디오 볼륨 설정 (추후 구현)
        switch (type) {
            case 'master':
                GAME_CONFIG.audio.masterVolume = value / 100;
                break;
            case 'sfx':
                GAME_CONFIG.audio.sfxVolume = value / 100;
                break;
            case 'music':
                GAME_CONFIG.audio.musicVolume = value / 100;
                break;
        }
    }

    // 데이터 저장/로드
    saveSettings() {
        const settings = {
            masterVolume: GAME_CONFIG.audio.masterVolume,
            sfxVolume: GAME_CONFIG.audio.sfxVolume,
            musicVolume: GAME_CONFIG.audio.musicVolume
        };
        
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
        this.goToMainMenu();
        console.log('설정 저장 완료');
    }

    loadSettings() {
        const saved = localStorage.getItem(STORAGE_KEYS.settings);
        if (saved) {
            const settings = JSON.parse(saved);
            GAME_CONFIG.audio.masterVolume = settings.masterVolume || 1.0;
            GAME_CONFIG.audio.sfxVolume = settings.sfxVolume || 1.0;
            GAME_CONFIG.audio.musicVolume = settings.musicVolume || 1.0;
            
            // UI 업데이트
            document.getElementById('masterVolume').value = settings.masterVolume * 100;
            document.getElementById('sfxVolume').value = settings.sfxVolume * 100;
            document.getElementById('musicVolume').value = settings.musicVolume * 100;
            
            this.updateVolume('master', settings.masterVolume * 100);
            this.updateVolume('sfx', settings.sfxVolume * 100);
            this.updateVolume('music', settings.musicVolume * 100);
        }
    }

    checkHighScore(score) {
        const highScores = JSON.parse(localStorage.getItem(STORAGE_KEYS.highScores) || '[]');
        
        // 상위 10개 점수만 저장
        highScores.push(score);
        highScores.sort((a, b) => b - a);
        highScores.splice(10);
        
        localStorage.setItem(STORAGE_KEYS.highScores, JSON.stringify(highScores));
        
        // 새 기록인지 확인 (상위 10위 안에 들면 새 기록)
        return highScores.indexOf(score) !== -1 && highScores.length <= 10;
    }

    // 유틸리티 메서드들
    isKeyPressed(keyName) {
        return GAME_CONFIG.keys[keyName].some(key => this.keys[key]);
    }

    isKeyJustPressed(keyName) {
        return GAME_CONFIG.keys[keyName].some(key => this.keyPressed[key]);
    }
}

// 게임 시작
let game;

document.addEventListener('DOMContentLoaded', () => {
    game = new Game();
});

// 창 포커스/블러 이벤트 처리
window.addEventListener('blur', () => {
    if (game && game.state === GAME_CONFIG.gameStates.PLAYING) {
        game.pauseGame();
    }
});

// 개발자 도구용 전역 함수들 (디버그용)
window.DEBUG_toggleGodMode = () => {
    DEBUG.godMode = !DEBUG.godMode;
    console.log('God Mode:', DEBUG.godMode);
};

window.DEBUG_toggleHitboxes = () => {
    DEBUG.showHitboxes = !DEBUG.showHitboxes;
    console.log('Show Hitboxes:', DEBUG.showHitboxes);
};

window.DEBUG_toggleFPS = () => {
    DEBUG.showFPS = !DEBUG.showFPS;
    console.log('Show FPS:', DEBUG.showFPS);
};

window.DEBUG_spawnEnemy = (type = 'grunt', count = 1) => {
    if (game && game.enemyManager) {
        for (let i = 0; i < count; i++) {
            game.enemyManager.forceSpawnEnemy(type);
        }
        console.log(`Spawned ${count} ${type}(s)`);
    }
};

window.DEBUG_skipWave = () => {
    if (game && game.enemyManager) {
        game.enemyManager.skipCurrentWave();
        console.log('Current wave skipped');
    }
};

window.DEBUG_getWaveInfo = () => {
    if (game && game.enemyManager) {
        const info = game.enemyManager.getCurrentWaveInfo();
        console.log('Wave Info:', info);
        return info;
    }
};

console.log('갤러그 슈터 게임이 로드되었습니다!');
console.log('디버그 명령어:');
console.log('- DEBUG_toggleGodMode()');
console.log('- DEBUG_toggleHitboxes()');
console.log('- DEBUG_toggleFPS()');
console.log('- DEBUG_spawnEnemy(type, count) - 적 강제 생성');
console.log('- DEBUG_skipWave() - 현재 웨이브 스킵');
console.log('- DEBUG_getWaveInfo() - 웨이브 정보 확인');