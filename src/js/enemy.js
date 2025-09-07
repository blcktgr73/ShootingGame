// 기본 적 클래스
class Enemy {
    constructor(x, y, config, type = 'grunt') {
        // 위치 및 크기
        this.x = x;
        this.y = y;
        this.width = config.width;
        this.height = config.height;
        this.type = type;
        
        // 이동 관련
        this.speed = config.speed;
        this.vx = 0;
        this.vy = config.speed; // 기본적으로 아래로 이동
        
        // 체력 및 점수
        this.maxHp = config.hp;
        this.hp = config.hp;
        this.score = config.score;
        
        // 공격 관련
        this.fireRate = config.fireRate || 0;
        this.lastFireTime = 0;
        this.bulletPattern = config.bulletPattern || 'single';
        
        // 상태
        this.active = true;
        this.age = 0;
        
        // 시각 효과
        this.color = config.color;
        this.hitFlash = 0;
        this.hitFlashDuration = 200; // 피격 시 깜빡임 시간
        
        // 애니메이션
        this.animFrame = 0;
        this.animSpeed = 100;
        this.animTimer = 0;
        
        // 움직임 패턴 관련
        this.movePattern = 'straight'; // 기본 직선 이동
        this.patternTimer = 0;
        this.patternData = {}; // 패턴별 추가 데이터
        
        // 특수 속성
        this.canShoot = this.fireRate > 0;
        this.shootingCooldown = 0;
        
        this.init();
    }

    init() {
        // 타입별 초기화 (서브클래스에서 오버라이드)
    }

    update(deltaTime, player, bulletManager) {
        if (!this.active) return;
        
        this.age += deltaTime;
        
        // 이동 업데이트
        this.updateMovement(deltaTime);
        
        // 위치 업데이트
        this.x += this.vx * deltaTime / 16;
        this.y += this.vy * deltaTime / 16;
        
        // 공격 업데이트
        if (this.canShoot && player) {
            this.updateShooting(deltaTime, player, bulletManager);
        }
        
        // 애니메이션 업데이트
        this.updateAnimation(deltaTime);
        
        // 피격 효과 업데이트
        this.updateHitFlash(deltaTime);
        
        // 화면 밖 체크
        this.checkBounds();
    }

    updateMovement(deltaTime) {
        // 기본 직선 이동 (서브클래스에서 오버라이드)
        this.patternTimer += deltaTime;
        
        switch (this.movePattern) {
            case 'straight':
                // 직선 하강 (기본값 설정됨)
                break;
            case 'zigzag':
                this.updateZigzagMovement(deltaTime);
                break;
            case 'sine':
                this.updateSineMovement(deltaTime);
                break;
        }
    }

    updateZigzagMovement(deltaTime) {
        const zigzagAmplitude = this.patternData.amplitude || 50;
        const zigzagFrequency = this.patternData.frequency || 0.005;
        
        this.vx = Math.sin(this.patternTimer * zigzagFrequency) * zigzagAmplitude * 0.1;
    }

    updateSineMovement(deltaTime) {
        const amplitude = this.patternData.amplitude || 30;
        const frequency = this.patternData.frequency || 0.003;
        
        this.vx = Math.sin(this.patternTimer * frequency) * amplitude * 0.1;
    }

    updateShooting(deltaTime, player, bulletManager) {
        this.shootingCooldown -= deltaTime;
        
        if (this.shootingCooldown <= 0) {
            const bullets = this.fire(player);
            bullets.forEach(bullet => {
                bulletManager.bullets.push(bullet);
            });
            this.shootingCooldown = this.fireRate;
        }
    }

    fire(player) {
        if (!player || !this.canShoot) return [];
        
        const bullets = [];
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height;
        
        switch (this.bulletPattern) {
            case 'single':
                bullets.push(this.createBulletToPlayer(centerX, centerY, player));
                break;
                
            case 'spread3':
                for (let i = -1; i <= 1; i++) {
                    const angle = i * 30; // -30, 0, 30도
                    bullets.push(this.createBulletAtAngle(centerX, centerY, angle, 4));
                }
                break;
                
            case 'spread5':
                for (let i = -2; i <= 2; i++) {
                    const angle = i * 20; // -40, -20, 0, 20, 40도
                    bullets.push(this.createBulletAtAngle(centerX, centerY, angle, 3));
                }
                break;
                
            case 'circle':
                const bulletCount = 8;
                for (let i = 0; i < bulletCount; i++) {
                    const angle = (i / bulletCount) * 360;
                    bullets.push(this.createBulletAtAngle(centerX, centerY, angle, 2));
                }
                break;
        }
        
        return bullets;
    }

    createBulletToPlayer(x, y, player) {
        // 플레이어 방향으로 총알 발사
        const dx = player.getCenterX() - x;
        const dy = player.getCenterY() - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const speed = 3;
        const vx = (dx / distance) * speed;
        const vy = (dy / distance) * speed;
        
        return new Bullet(x - 3, y, vx, vy, 'enemy');
    }

    createBulletAtAngle(x, y, angleDegrees, speed) {
        const radians = angleDegrees * Math.PI / 180;
        const vx = Math.sin(radians) * speed;  // 좌우 이동
        const vy = Math.cos(radians) * speed;  // 상하 이동 (0도가 아래쪽)
        
        return new Bullet(x - 3, y, vx, vy, 'enemy');
    }

    updateAnimation(deltaTime) {
        this.animTimer += deltaTime;
        if (this.animTimer > this.animSpeed) {
            this.animFrame = (this.animFrame + 1) % 4;
            this.animTimer = 0;
        }
    }

    updateHitFlash(deltaTime) {
        if (this.hitFlash > 0) {
            this.hitFlash -= deltaTime;
        }
    }

    checkBounds() {
        const margin = GAME_CONFIG.performance.cullDistance;
        
        // 화면 아래로 나간 적 제거
        if (this.y > GAME_CONFIG.canvas.height + margin ||
            this.x < -margin || this.x > GAME_CONFIG.canvas.width + margin) {
            this.active = false;
        }
    }

    takeDamage(damage) {
        this.hp -= damage;
        this.hitFlash = this.hitFlashDuration;
        
        if (this.hp <= 0) {
            this.destroy();
            return true; // 파괴됨
        }
        
        return false; // 아직 살아있음
    }

    destroy() {
        this.active = false;
    }

    render(ctx) {
        if (!this.active) return;
        
        ctx.save();
        
        // 피격 효과
        if (this.hitFlash > 0) {
            ctx.globalAlpha = 0.5 + Math.sin(this.hitFlash * 0.05) * 0.3;
        }
        
        // 적 본체 렌더링
        this.renderSprite(ctx);
        
        // 체력바 (중형 적, 보스만)
        if (this.maxHp > 2) {
            this.renderHealthBar(ctx);
        }
        
        ctx.restore();
        
        // 디버그: 히트박스 표시
        if (DEBUG.enabled && DEBUG.showHitboxes) {
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
    }

    renderSprite(ctx) {
        // 기본 적 스프라이트 (서브클래스에서 오버라이드)
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 간단한 디테일
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, 4);
    }

    renderHealthBar(ctx) {
        const barWidth = this.width;
        const barHeight = 4;
        const barY = this.y - 8;
        
        // 배경
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(this.x, barY, barWidth, barHeight);
        
        // 체력바
        const healthPercent = this.hp / this.maxHp;
        const healthColor = healthPercent > 0.5 ? '#00ff00' : 
                           healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        
        ctx.fillStyle = healthColor;
        ctx.fillRect(this.x, barY, barWidth * healthPercent, barHeight);
        
        // 테두리
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, barY, barWidth, barHeight);
    }

    // 히트박스 반환
    getHitbox() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    getCenterX() {
        return this.x + this.width / 2;
    }

    getCenterY() {
        return this.y + this.height / 2;
    }

    // 플레이어와의 거리 계산
    getDistanceToPlayer(player) {
        const dx = this.getCenterX() - player.getCenterX();
        const dy = this.getCenterY() - player.getCenterY();
        return Math.sqrt(dx * dx + dy * dy);
    }

    // 플레이어 방향 각도 계산
    getAngleToPlayer(player) {
        const dx = player.getCenterX() - this.getCenterX();
        const dy = player.getCenterY() - this.getCenterY();
        return Math.atan2(dy, dx) * 180 / Math.PI;
    }
}

// Grunt - 기본 적
class Grunt extends Enemy {
    constructor(x, y) {
        super(x, y, GAME_CONFIG.enemies.grunt, 'grunt');
    }

    init() {
        this.movePattern = 'straight';
    }

    renderSprite(ctx) {
        // 작은 삼각형 형태
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y + this.height);
        ctx.lineTo(this.x, this.y);
        ctx.lineTo(this.x + this.width, this.y);
        ctx.closePath();
        ctx.fill();
        
        // 내부 디테일
        ctx.fillStyle = '#ff8080';
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y + this.height - 5);
        ctx.lineTo(this.x + 5, this.y + 5);
        ctx.lineTo(this.x + this.width - 5, this.y + 5);
        ctx.closePath();
        ctx.fill();
    }
}

// Rusher - 돌격 적
class Rusher extends Enemy {
    constructor(x, y) {
        super(x, y, GAME_CONFIG.enemies.rusher, 'rusher');
    }

    init() {
        this.movePattern = 'straight';
        // 더 빠른 속도로 돌진
        this.vy = this.speed;
    }

    renderSprite(ctx) {
        // 날카로운 화살표 형태
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y + this.height);
        ctx.lineTo(this.x, this.y + 5);
        ctx.lineTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + 5);
        ctx.closePath();
        ctx.fill();
        
        // 엔진 글로우 효과
        const glowIntensity = 0.7 + Math.sin(this.age * 0.01) * 0.3;
        ctx.fillStyle = `rgba(255, 255, 0, ${glowIntensity})`;
        ctx.fillRect(this.x + this.width / 2 - 2, this.y + this.height - 3, 4, 3);
    }
}

// Shooter - 사격 적
class Shooter extends Enemy {
    constructor(x, y) {
        super(x, y, GAME_CONFIG.enemies.shooter, 'shooter');
    }

    init() {
        this.movePattern = 'sine';
        this.patternData.amplitude = 20;
        this.patternData.frequency = 0.003;
        this.bulletPattern = 'single';
        this.shootingCooldown = Math.random() * this.fireRate; // 랜덤 시작 딜레이
    }

    renderSprite(ctx) {
        // 사각형 본체
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 포탑
        ctx.fillStyle = '#ff60ff';
        ctx.fillRect(this.x + this.width / 2 - 3, this.y + this.height - 8, 6, 8);
        
        // 총구
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + this.width / 2 - 1, this.y + this.height - 3, 2, 3);
        
        // 측면 윙
        ctx.fillStyle = '#ff80ff';
        ctx.fillRect(this.x - 2, this.y + 10, 4, 8);
        ctx.fillRect(this.x + this.width - 2, this.y + 10, 4, 8);
    }
}

// Zigzag - 지그재그 적
class Zigzag extends Enemy {
    constructor(x, y) {
        super(x, y, GAME_CONFIG.enemies.zigzag, 'zigzag');
    }

    init() {
        this.movePattern = 'zigzag';
        this.patternData.amplitude = GAME_CONFIG.enemies.zigzag.zigzagAmplitude || 50;
        this.patternData.frequency = GAME_CONFIG.enemies.zigzag.zigzagFrequency || 0.005;
    }

    renderSprite(ctx) {
        // 다이아몬드 형태
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height / 2);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height / 2);
        ctx.closePath();
        ctx.fill();
        
        // 내부 코어
        ctx.fillStyle = '#80ff80';
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y + 5);
        ctx.lineTo(this.x + this.width - 5, this.y + this.height / 2);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height - 5);
        ctx.lineTo(this.x + 5, this.y + this.height / 2);
        ctx.closePath();
        ctx.fill();
        
        // 이동 방향 표시기
        const direction = this.vx > 0 ? 1 : -1;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(
            this.x + this.width / 2 + direction * 3,
            this.y + this.height / 2 - 1,
            2, 2
        );
    }
}

// Heavy - 중형 적
class Heavy extends Enemy {
    constructor(x, y) {
        super(x, y, GAME_CONFIG.enemies.heavy, 'heavy');
    }

    init() {
        this.movePattern = 'straight';
        this.bulletPattern = 'spread3';
        this.shootingCooldown = Math.random() * this.fireRate;
    }

    renderSprite(ctx) {
        // 큰 육각형 본체
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const radius = Math.min(this.width, this.height) / 2;
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * 60) * Math.PI / 180;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        
        // 내부 코어
        ctx.fillStyle = '#c080ff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // 포탑들
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 3; i++) {
            const angle = (i * 120 + 90) * Math.PI / 180;
            const turretX = centerX + Math.cos(angle) * radius * 0.8;
            const turretY = centerY + Math.sin(angle) * radius * 0.8;
            
            ctx.beginPath();
            ctx.arc(turretX, turretY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Boss - 최종 보스
class Boss extends Enemy {
    constructor(x, y) {
        super(x, y, GAME_CONFIG.enemies.boss, 'boss');
        
        // 보스 특수 속성
        this.currentPhase = 1;
        this.maxPhases = 3;
        this.phaseTransitioning = false;
        this.phaseTransitionTimer = 0;
        this.phaseTransitionDuration = 2000; // 2초간 전환
        
        // 이동 관련
        this.moveDirection = 1; // 1: 오른쪽, -1: 왼쪽
        this.moveTimer = 0;
        this.moveInterval = 3000; // 3초마다 방향 전환
        
        // 공격 패턴 관리
        this.attackTimer = 0;
        this.lastAttackTime = 0;
        this.specialAttackCharge = 0;
        this.isChargingSpecial = false;
        
        // 레이저 공격 관련
        this.laserActive = false;
        this.laserStartTime = 0;
        this.laserDuration = 3000; // 3초간 지속
        this.laserWarningTime = 1000; // 1초간 경고
        this.laserTargetY = 0;
        
        // 시각 효과
        this.glowIntensity = 0;
        this.warningFlash = 0;
        
        // 등장 효과
        this.entranceActive = true;
        this.entranceTimer = 0;
        this.entranceDuration = 3000; // 3초간 등장 연출
        this.screenShakeIntensity = 0;
        this.entranceY = -this.height; // 화면 위에서 시작
        
        this.init();
    }

    init() {
        this.movePattern = 'boss';
        this.y = this.entranceY; // 화면 위에서 시작
        this.x = (GAME_CONFIG.canvas.width - this.width) / 2; // 중앙에서 시작
        this.bulletPattern = 'spread5';
        
        // 보스는 항상 발사 가능 (등장 후)
        this.fireRate = this.getCurrentPhaseConfig().fireRate;
        this.canShoot = false; // 등장 중에는 발사 안함
        this.shootingCooldown = this.fireRate;
        
        // 이동 방향을 랜덤하게 설정
        this.moveDirection = Math.random() > 0.5 ? 1 : -1;
        
        // 보스 등장 효과 시작
        this.startBossEntrance();
        
        console.log(`Boss initialized - fireRate: ${this.fireRate}, canShoot: ${this.canShoot}, moveDirection: ${this.moveDirection}`);
    }

    getCurrentPhaseConfig() {
        return GAME_CONFIG.enemies.boss.phases[this.currentPhase] || 
               GAME_CONFIG.enemies.boss.phases[1];
    }

    update(deltaTime, player, bulletManager) {
        if (!this.active) return;
        
        // 등장 연출 업데이트
        if (this.entranceActive) {
            this.updateBossEntrance(deltaTime);
            return; // 등장 중에는 다른 업데이트 건너뛰기
        }
        
        super.update(deltaTime, player, bulletManager);
        
        // 페이즈 전환 체크
        this.checkPhaseTransition();
        
        // 페이즈별 특수 행동
        this.updatePhaseSpecifics(deltaTime, player, bulletManager);
        
        // 시각 효과 업데이트
        this.updateVisualEffects(deltaTime);
    }

    updateBossEntrance(deltaTime) {
        this.entranceTimer += deltaTime;
        
        // 화면 진동 효과 감소
        if (this.screenShakeIntensity > 0) {
            this.screenShakeIntensity -= deltaTime * 0.01;
            if (this.screenShakeIntensity < 0) this.screenShakeIntensity = 0;
        }
        
        // 보스가 천천히 아래로 내려옴
        const progress = Math.min(this.entranceTimer / this.entranceDuration, 1);
        const targetY = 50; // 최종 Y 위치
        this.y = this.entranceY + (targetY - this.entranceY) * this.easeInOut(progress);
        
        // 등장 연출 완료 체크
        if (this.entranceTimer >= this.entranceDuration) {
            this.entranceActive = false;
            this.canShoot = true; // 이제 공격 시작
            this.showBossUI(); // 체력바 표시
            
            console.log('🔥 BOSS HAS ARRIVED! 🔥');
            console.log('Boss Phase 1 시작!');
        }
    }
    
    easeInOut(t) {
        // 부드러운 등장 애니메이션을 위한 easing 함수
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    updateMovement(deltaTime) {
        // 보스 이동: 화면 상단에서 좌우로 천천히 이동
        this.moveTimer += deltaTime;
        
        if (this.moveTimer > this.moveInterval) {
            this.moveDirection *= -1;
            this.moveTimer = 0;
        }
        
        // 좌우 이동
        this.vx = this.moveDirection * this.speed;
        
        // 화면 경계에서 방향 전환
        if (this.x <= 0 || this.x >= GAME_CONFIG.canvas.width - this.width) {
            this.moveDirection *= -1;
            this.vx = this.moveDirection * this.speed;
        }
        
        // Y 위치 고정
        this.y = 50;
    }

    checkPhaseTransition() {
        const healthPercent = this.hp / this.maxHp;
        let targetPhase = 1;
        
        if (healthPercent <= 0.3) targetPhase = 3;
        else if (healthPercent <= 0.6) targetPhase = 2;
        
        if (targetPhase > this.currentPhase && !this.phaseTransitioning) {
            this.startPhaseTransition(targetPhase);
        }
    }

    startPhaseTransition(newPhase) {
        this.currentPhase = newPhase;
        this.phaseTransitioning = true;
        this.phaseTransitionTimer = 0;
        
        // 페이즈 전환시 공격 패턴 변경
        const config = this.getCurrentPhaseConfig();
        this.fireRate = config.fireRate;
        this.bulletPattern = config.pattern;
        
        console.log(`Boss Phase ${newPhase} 시작!`);
    }

    updatePhaseSpecifics(deltaTime, player, bulletManager) {
        if (this.phaseTransitioning) {
            this.phaseTransitionTimer += deltaTime;
            if (this.phaseTransitionTimer >= this.phaseTransitionDuration) {
                this.phaseTransitioning = false;
            }
            return;
        }
        
        switch (this.currentPhase) {
            case 1:
                this.updatePhase1(deltaTime, player, bulletManager);
                break;
            case 2:
                this.updatePhase2(deltaTime, player, bulletManager);
                break;
            case 3:
                this.updatePhase3(deltaTime, player, bulletManager);
                break;
        }
    }

    updatePhase1(deltaTime, player, bulletManager) {
        // 페이즈 1: 5방향 산탄 공격
        this.bulletPattern = 'spread5';
        this.fireRate = this.getCurrentPhaseConfig().fireRate;
    }

    updatePhase2(deltaTime, player, bulletManager) {
        // 페이즈 2: 원형 탄막
        this.bulletPattern = 'circle';
        this.fireRate = this.getCurrentPhaseConfig().fireRate;
    }

    updatePhase3(deltaTime, player, bulletManager) {
        // 페이즈 3: 레이저 공격
        this.updateLaserAttack(deltaTime, player, bulletManager);
    }

    updateLaserAttack(deltaTime, player, bulletManager) {
        this.attackTimer += deltaTime;
        
        if (!this.laserActive && this.attackTimer >= 5000) { // 5초마다
            this.startLaserAttack(player);
            this.attackTimer = 0;
        }
        
        if (this.laserActive) {
            const laserElapsed = performance.now() - this.laserStartTime;
            
            if (laserElapsed >= this.laserWarningTime && 
                laserElapsed <= this.laserWarningTime + this.laserDuration) {
                // 레이저 활성화 상태 - 충돌 감지는 main.js에서 처리
            } else if (laserElapsed > this.laserWarningTime + this.laserDuration) {
                this.laserActive = false;
            }
        }
    }

    startLaserAttack(player) {
        this.laserActive = true;
        this.laserStartTime = performance.now();
        this.laserTargetY = player ? player.y : GAME_CONFIG.canvas.height - 100;
        
        console.log('Boss 레이저 공격!');
    }

    fire(player) {
        if (!player || this.phaseTransitioning) return [];
        
        const bullets = [];
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height;
        
        switch (this.bulletPattern) {
            case 'spread5':
                // 5방향 산탄 (아래쪽이 0도, 좌우로 확산)
                for (let i = -2; i <= 2; i++) {
                    const angle = i * 25; // -50, -25, 0, 25, 50도 (0도가 아래쪽)
                    bullets.push(this.createBulletAtAngle(centerX, centerY, angle, 3));
                }
                break;
                
            case 'circle':
                // 원형 탄막 (12방향)
                const bulletCount = 12;
                const offset = (performance.now() * 0.001) % (Math.PI * 2); // 회전 효과
                for (let i = 0; i < bulletCount; i++) {
                    const angle = (i / bulletCount) * 360 + (offset * 180 / Math.PI);
                    bullets.push(this.createBulletAtAngle(centerX, centerY, angle, 2.5));
                }
                break;
                
            default:
                bullets.push(...super.fire(player));
        }
        
        return bullets;
    }

    updateVisualEffects(deltaTime) {
        // 글로우 효과
        this.glowIntensity = 0.5 + Math.sin(this.age * 0.003) * 0.3;
        
        // 페이즈 전환시 깜빡임
        if (this.phaseTransitioning) {
            this.warningFlash = Math.sin(this.phaseTransitionTimer * 0.01) * 0.5 + 0.5;
        } else {
            this.warningFlash = 0;
        }
        
        // 레이저 경고 효과
        if (this.laserActive) {
            const laserElapsed = performance.now() - this.laserStartTime;
            if (laserElapsed < this.laserWarningTime) {
                this.warningFlash = Math.sin(laserElapsed * 0.02) * 0.8 + 0.2;
            }
        }
    }

    renderSprite(ctx) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        // 글로우 효과
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15 + this.glowIntensity * 10;
        
        // 페이즈별 시각적 변화
        let phaseColor = this.color;
        switch (this.currentPhase) {
            case 2:
                phaseColor = '#ff8040';
                break;
            case 3:
                phaseColor = '#ff0080';
                break;
        }
        
        // 경고 효과
        if (this.warningFlash > 0) {
            ctx.globalAlpha = 0.7 + this.warningFlash * 0.3;
        }
        
        // 메인 보스 본체 (큰 육각형)
        ctx.fillStyle = phaseColor;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * 60) * Math.PI / 180;
            const x = centerX + Math.cos(angle) * (this.width / 2);
            const y = centerY + Math.sin(angle) * (this.height / 2);
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        
        // 내부 코어
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, Math.min(this.width, this.height) * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // 페이즈별 추가 디테일
        this.renderPhaseDetails(ctx, centerX, centerY);
        
        // 레이저 렌더링
        if (this.laserActive) {
            this.renderLaser(ctx);
        }
        
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    renderPhaseDetails(ctx, centerX, centerY) {
        const radius = Math.min(this.width, this.height) / 2;
        
        // 페이즈별 장식
        switch (this.currentPhase) {
            case 1:
                // 기본 포탑들
                for (let i = 0; i < 5; i++) {
                    const angle = (i * 72) * Math.PI / 180;
                    const x = centerX + Math.cos(angle) * radius * 0.7;
                    const y = centerY + Math.sin(angle) * radius * 0.7;
                    
                    ctx.fillStyle = '#ff6060';
                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            case 2:
                // 회전하는 링
                const ringPhase = this.age * 0.002;
                ctx.strokeStyle = '#ff8040';
                ctx.lineWidth = 3;
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius * (0.5 + i * 0.15), 
                           ringPhase + i, ringPhase + i + Math.PI);
                    ctx.stroke();
                }
                break;
                
            case 3:
                // 위험한 스파이크들
                for (let i = 0; i < 8; i++) {
                    const angle = (i * 45 + this.age * 0.001) * Math.PI / 180;
                    const x1 = centerX + Math.cos(angle) * radius * 0.8;
                    const y1 = centerY + Math.sin(angle) * radius * 0.8;
                    const x2 = centerX + Math.cos(angle) * radius * 1.2;
                    const y2 = centerY + Math.sin(angle) * radius * 1.2;
                    
                    ctx.strokeStyle = '#ff0080';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
                break;
        }
    }

    renderLaser(ctx) {
        const laserElapsed = performance.now() - this.laserStartTime;
        const centerX = this.x + this.width / 2;
        
        if (laserElapsed < this.laserWarningTime) {
            // 레이저 경고 표시
            ctx.strokeStyle = `rgba(255, 255, 0, ${0.3 + Math.sin(laserElapsed * 0.02) * 0.3})`;
            ctx.lineWidth = 20;
            ctx.beginPath();
            ctx.moveTo(centerX, this.y + this.height);
            ctx.lineTo(centerX, this.laserTargetY);
            ctx.stroke();
        } else if (laserElapsed <= this.laserWarningTime + this.laserDuration) {
            // 실제 레이저
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 15;
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 10;
            
            ctx.beginPath();
            ctx.moveTo(centerX, this.y + this.height);
            ctx.lineTo(centerX, GAME_CONFIG.canvas.height);
            ctx.stroke();
            
            // 레이저 코어
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(centerX, this.y + this.height);
            ctx.lineTo(centerX, GAME_CONFIG.canvas.height);
            ctx.stroke();
        }
    }

    startBossEntrance() {
        // 경고 메시지 표시
        this.showWarningMessage();
        
        // 화면 진동 시작
        this.screenShakeIntensity = 10;
        
        // 등장 사운드 재생 (구현 시)
        console.log('🚨 WARNING: BOSS APPROACHING! 🚨');
        
        // 보스 체력바는 등장 완료 후 표시
    }

    showWarningMessage() {
        // 경고 메시지를 화면에 표시
        const warningDiv = document.createElement('div');
        warningDiv.id = 'bossWarning';
        warningDiv.innerHTML = `
            <div class="boss-warning-content">
                <h2>⚠️ WARNING ⚠️</h2>
                <p>BOSS APPROACHING</p>
            </div>
        `;
        warningDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            animation: bossWarningFlash 0.5s infinite alternate;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes bossWarningFlash {
                0% { background: rgba(255, 0, 0, 0.3); }
                100% { background: rgba(255, 0, 0, 0.6); }
            }
            .boss-warning-content {
                text-align: center;
                color: white;
                text-shadow: 2px 2px 4px #000;
                font-family: 'Courier New', monospace;
            }
            .boss-warning-content h2 {
                font-size: 3em;
                margin: 0;
                animation: shake 0.2s infinite;
            }
            .boss-warning-content p {
                font-size: 1.5em;
                margin: 10px 0;
            }
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-2px); }
                75% { transform: translateX(2px); }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(warningDiv);
        
        // 2초 후 경고 메시지 제거
        setTimeout(() => {
            if (document.getElementById('bossWarning')) {
                document.body.removeChild(warningDiv);
            }
        }, 2000);
    }

    showBossUI() {
        // 보스 체력바 표시 (main.js에서 처리)
        const bossHealthBar = document.getElementById('bossHealthBar');
        if (bossHealthBar) {
            bossHealthBar.classList.remove('hidden');
        }
    }

    hideBossUI() {
        const bossHealthBar = document.getElementById('bossHealthBar');
        if (bossHealthBar) {
            bossHealthBar.classList.add('hidden');
        }
    }

    updateBossHealthBar() {
        const healthBar = document.getElementById('bossHealth');
        if (healthBar) {
            const healthPercent = (this.hp / this.maxHp) * 100;
            healthBar.style.width = `${healthPercent}%`;
        }
    }

    takeDamage(damage) {
        const destroyed = super.takeDamage(damage);
        this.updateBossHealthBar();
        
        if (destroyed) {
            this.hideBossUI();
        }
        
        return destroyed;
    }

    getLaserHitbox() {
        if (!this.laserActive) return null;
        
        const laserElapsed = performance.now() - this.laserStartTime;
        if (laserElapsed < this.laserWarningTime || 
            laserElapsed > this.laserWarningTime + this.laserDuration) {
            return null;
        }
        
        const centerX = this.x + this.width / 2;
        return {
            x: centerX - 7.5, // 레이저 폭의 절반
            y: this.y + this.height,
            width: 15,
            height: GAME_CONFIG.canvas.height - (this.y + this.height)
        };
    }
}