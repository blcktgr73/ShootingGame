// 총알 클래스
class Bullet {
    constructor(x, y, vx, vy, owner, piercing = false) {
        // 위치 및 크기
        this.x = x;
        this.y = y;
        this.width = owner === 'player' ? 
            GAME_CONFIG.bullet.player.width : 
            GAME_CONFIG.bullet.enemy.width;
        this.height = owner === 'player' ? 
            GAME_CONFIG.bullet.player.height : 
            GAME_CONFIG.bullet.enemy.height;
        
        // 이동
        this.vx = vx;
        this.vy = vy;
        
        // 속성
        this.owner = owner; // 'player' 또는 'enemy'
        this.damage = owner === 'player' ? 
            GAME_CONFIG.bullet.player.damage : 
            GAME_CONFIG.bullet.enemy.damage;
        this.piercing = piercing;
        this.hitTargets = new Set(); // 관통 총알이 이미 맞춘 대상들
        
        // 시각 효과
        this.color = owner === 'player' ? 
            GAME_CONFIG.bullet.player.color : 
            GAME_CONFIG.bullet.enemy.color;
        this.trail = []; // 궤적 효과
        this.maxTrailLength = GAME_CONFIG.effects.trail.length;
        
        // 상태
        this.active = true;
        this.age = 0; // 총알이 존재한 시간
        this.maxAge = 5000; // 5초 후 자동 제거
        
        // 애니메이션
        this.glowPhase = Math.random() * Math.PI * 2; // 랜덤 시작 위상
    }

    update(deltaTime) {
        if (!this.active) return;
        
        // 궤적 업데이트 (현재 위치를 궤적에 추가)
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        
        // 위치 업데이트
        this.x += this.vx * deltaTime / 16; // 60fps 기준 정규화
        this.y += this.vy * deltaTime / 16;
        
        // 수명 업데이트
        this.age += deltaTime;
        
        // 애니메이션 업데이트
        this.glowPhase += deltaTime * 0.01;
        
        // 화면 밖 체크
        this.checkBounds();
        
        // 수명 체크
        if (this.age > this.maxAge) {
            this.active = false;
        }
    }

    checkBounds() {
        const margin = GAME_CONFIG.performance.cullDistance;
        
        // 화면 밖으로 나간 총알 제거
        if (this.x < -margin || 
            this.x > GAME_CONFIG.canvas.width + margin ||
            this.y < -margin || 
            this.y > GAME_CONFIG.canvas.height + margin) {
            this.active = false;
        }
    }

    render(ctx) {
        if (!this.active) return;
        
        ctx.save();
        
        // 궤적 렌더링
        this.renderTrail(ctx);
        
        // 총알 본체 렌더링
        this.renderBullet(ctx);
        
        ctx.restore();
        
        // 디버그: 히트박스 표시
        if (DEBUG.enabled && DEBUG.showHitboxes) {
            ctx.strokeStyle = this.owner === 'player' ? 'green' : 'red';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
    }

    renderTrail(ctx) {
        if (this.trail.length < 2) return;
        
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        
        for (let i = 1; i < this.trail.length; i++) {
            const alpha = (i / this.trail.length) * 0.5; // 점점 투명해짐
            ctx.globalAlpha = alpha;
            
            ctx.beginPath();
            ctx.moveTo(this.trail[i-1].x + this.width/2, this.trail[i-1].y + this.height/2);
            ctx.lineTo(this.trail[i].x + this.width/2, this.trail[i].y + this.height/2);
            ctx.stroke();
        }
        
        ctx.globalAlpha = 1;
    }

    renderBullet(ctx) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        // 글로우 효과
        const glowIntensity = 0.7 + Math.sin(this.glowPhase) * 0.3;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 5 * glowIntensity;
        
        if (this.owner === 'player') {
            this.renderPlayerBullet(ctx, centerX, centerY);
        } else {
            this.renderEnemyBullet(ctx, centerX, centerY);
        }
        
        // 관통 총알 효과
        if (this.piercing) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(centerX, centerY, Math.max(this.width, this.height) / 2 + 2, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    renderPlayerBullet(ctx, centerX, centerY) {
        // 플레이어 총알: 밝은 레이저 형태
        ctx.fillStyle = this.color;
        
        // 메인 사각형
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 코어 (더 밝은 중심부)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 1, this.y + 2, this.width - 2, this.height - 4);
        
        // 끝부분 포인트
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(centerX, this.y - 2);
        ctx.lineTo(centerX - 2, this.y + 2);
        ctx.lineTo(centerX + 2, this.y + 2);
        ctx.fill();
    }

    renderEnemyBullet(ctx, centerX, centerY) {
        // 적 총알: 둥근 에너지볼 형태
        const radius = Math.max(this.width, this.height) / 2;
        
        // 외곽 원
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 내부 코어
        ctx.fillStyle = '#ff8080';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // 중심 하이라이트
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(centerX - 1, centerY - 1, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    // 충돌 검사용 히트박스
    getHitbox() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    // 중심점 반환
    getCenterX() {
        return this.x + this.width / 2;
    }

    getCenterY() {
        return this.y + this.height / 2;
    }

    // 충돌 처리
    hit(target = null) {
        if (!this.active) return false;
        
        // 관통 총알의 경우
        if (this.piercing && target) {
            // 이미 맞춘 대상인지 확인
            if (this.hitTargets.has(target)) {
                return false; // 이미 맞춘 대상은 다시 맞추지 않음
            }
            this.hitTargets.add(target);
            return true; // 충돌했지만 총알은 계속 진행
        } else {
            // 일반 총알의 경우 충돌 시 즉시 비활성화
            this.active = false;
            return true;
        }
    }

    // 총알 제거
    destroy() {
        this.active = false;
    }

    // 총알 재설정 (객체 풀링용)
    reset(x, y, vx, vy, owner, piercing = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.owner = owner;
        this.piercing = piercing;
        this.active = true;
        this.age = 0;
        this.trail = [];
        this.hitTargets.clear();
        this.glowPhase = Math.random() * Math.PI * 2;
        
        // 크기 및 색상 재설정
        this.width = owner === 'player' ? 
            GAME_CONFIG.bullet.player.width : 
            GAME_CONFIG.bullet.enemy.width;
        this.height = owner === 'player' ? 
            GAME_CONFIG.bullet.player.height : 
            GAME_CONFIG.bullet.enemy.height;
        this.color = owner === 'player' ? 
            GAME_CONFIG.bullet.player.color : 
            GAME_CONFIG.bullet.enemy.color;
        this.damage = owner === 'player' ? 
            GAME_CONFIG.bullet.player.damage : 
            GAME_CONFIG.bullet.enemy.damage;
    }

    // 특수 총알 패턴들
    static createSpreadPattern(x, y, direction, count, spread, speed, owner) {
        const bullets = [];
        const angleStep = spread / (count - 1);
        const startAngle = direction - spread / 2;
        
        for (let i = 0; i < count; i++) {
            const angle = startAngle + i * angleStep;
            const radians = angle * Math.PI / 180;
            
            bullets.push(new Bullet(
                x, y,
                Math.sin(radians) * speed,
                Math.cos(radians) * speed,
                owner
            ));
        }
        
        return bullets;
    }

    static createCirclePattern(x, y, count, speed, owner, offset = 0) {
        const bullets = [];
        const angleStep = (Math.PI * 2) / count;
        
        for (let i = 0; i < count; i++) {
            const angle = i * angleStep + offset;
            
            bullets.push(new Bullet(
                x, y,
                Math.sin(angle) * speed,
                Math.cos(angle) * speed,
                owner
            ));
        }
        
        return bullets;
    }

    static createSpiralPattern(x, y, count, speed, owner, spiralTightness = 0.5) {
        const bullets = [];
        
        for (let i = 0; i < count; i++) {
            const angle = i * spiralTightness;
            const radius = i * 2;
            
            bullets.push(new Bullet(
                x + Math.cos(angle) * radius,
                y + Math.sin(angle) * radius,
                Math.sin(angle) * speed,
                Math.cos(angle) * speed,
                owner
            ));
        }
        
        return bullets;
    }
}

// 총알 매니저 (객체 풀링 구현)
class BulletManager {
    constructor() {
        this.bullets = [];
        this.pool = [];
        this.maxPoolSize = GAME_CONFIG.performance.objectPoolSize.bullets;
    }

    // 새 총알 생성 또는 풀에서 재사용
    createBullet(x, y, vx, vy, owner, piercing = false) {
        let bullet;
        
        if (this.pool.length > 0) {
            bullet = this.pool.pop();
            bullet.reset(x, y, vx, vy, owner, piercing);
        } else {
            bullet = new Bullet(x, y, vx, vy, owner, piercing);
        }
        
        this.bullets.push(bullet);
        return bullet;
    }

    // 모든 총알 업데이트
    update(deltaTime) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update(deltaTime);
            
            if (!bullet.active) {
                this.recycleBullet(bullet, i);
            }
        }
    }

    // 모든 총알 렌더링
    render(ctx) {
        this.bullets.forEach(bullet => bullet.render(ctx));
    }

    // 총알을 풀로 반환
    recycleBullet(bullet, index) {
        if (index !== undefined) {
            this.bullets.splice(index, 1);
        }
        
        if (this.pool.length < this.maxPoolSize) {
            this.pool.push(bullet);
        }
    }

    // 특정 소유자의 총알만 반환
    getBulletsByOwner(owner) {
        return this.bullets.filter(bullet => bullet.owner === owner && bullet.active);
    }

    // 모든 총알 제거
    clear() {
        this.bullets.forEach(bullet => {
            bullet.active = false;
            this.recycleBullet(bullet);
        });
        this.bullets = [];
    }

    // 활성 총알 수
    getActiveCount() {
        return this.bullets.length;
    }
}