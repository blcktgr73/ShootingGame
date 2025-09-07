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
        const radians = (angleDegrees + 90) * Math.PI / 180; // +90도로 아래쪽을 0도로 설정
        const vx = Math.sin(radians) * speed;
        const vy = Math.cos(radians) * speed;
        
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