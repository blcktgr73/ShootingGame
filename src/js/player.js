// 플레이어 클래스
class Player {
    constructor(x, y) {
        // 위치 및 크기
        this.x = x;
        this.y = y;
        this.width = GAME_CONFIG.player.width;
        this.height = GAME_CONFIG.player.height;
        
        // 이동 관련
        this.speed = GAME_CONFIG.player.speed;
        this.vx = 0; // 속도
        
        // 체력 및 상태
        this.maxLives = GAME_CONFIG.player.maxLives;
        this.lives = GAME_CONFIG.player.defaultLives;
        this.invulnerable = false;
        this.invulnerabilityTimer = 0;
        
        // 총알 발사 관련
        this.fireRate = GAME_CONFIG.player.fireRate;
        this.lastFireTime = 0;
        this.bulletCount = 1; // 동시 발사 총알 수
        this.bulletSpeed = GAME_CONFIG.bullet.player.speed;
        this.piercing = false; // 관통 총알 여부
        
        // 파워업 상태
        this.powerups = {
            rapidFire: { active: false, endTime: 0 },
            multiShot: { active: false, endTime: 0 },
            piercing: { active: false, endTime: 0 },
            shield: { active: false, charges: 0 },
            scoreMultiplier: { active: false, endTime: 0, multiplier: 1 }
        };
        
        // 시각 효과
        this.color = GAME_CONFIG.player.color;
        this.blinkTimer = 0;
        this.visible = true;
        
        // 애니메이션 (간단한 스프라이트)
        this.animFrame = 0;
        this.animSpeed = 10;
        this.animTimer = 0;
    }

    update(deltaTime, keys) {
        // 입력 처리
        this.handleInput(keys);
        
        // 위치 업데이트
        this.x += this.vx * deltaTime / 16; // 60fps 기준 정규화
        
        // 화면 경계 처리
        this.constrainToBounds();
        
        // 무적 시간 처리
        this.updateInvulnerability(deltaTime);
        
        // 파워업 상태 업데이트
        this.updatePowerups(deltaTime);
        
        // 애니메이션 업데이트
        this.updateAnimation(deltaTime);
    }

    handleInput(keys) {
        this.vx = 0;
        
        // 좌우 이동
        if (keys['ArrowLeft'] || keys['KeyA']) {
            this.vx = -this.speed;
        }
        if (keys['ArrowRight'] || keys['KeyD']) {
            this.vx = this.speed;
        }
    }

    constrainToBounds() {
        // 화면 왼쪽 경계
        if (this.x < 0) {
            this.x = 0;
        }
        
        // 화면 오른쪽 경계
        if (this.x > GAME_CONFIG.canvas.width - this.width) {
            this.x = GAME_CONFIG.canvas.width - this.width;
        }
        
        // Y 위치는 고정 (화면 하단 근처)
        this.y = GAME_CONFIG.canvas.height - this.height - 20;
    }

    canFire() {
        const now = performance.now();
        const actualFireRate = this.powerups.rapidFire.active ? 
            this.fireRate * 0.5 : this.fireRate;
        
        return (now - this.lastFireTime) >= actualFireRate;
    }

    fire() {
        if (!this.canFire()) return [];
        
        this.lastFireTime = performance.now();
        const bullets = [];
        
        // 발사할 총알 수 결정
        const bulletCount = this.powerups.multiShot.active ? 3 : 1;
        
        if (bulletCount === 1) {
            // 단발 총알
            bullets.push(new Bullet(
                this.x + this.width / 2 - GAME_CONFIG.bullet.player.width / 2,
                this.y - GAME_CONFIG.bullet.player.height,
                0, -this.bulletSpeed,
                'player',
                this.piercing
            ));
        } else {
            // 다중 총알 (3발)
            const spread = 30; // 퍼짐 각도
            for (let i = 0; i < bulletCount; i++) {
                const angle = (i - 1) * spread; // -30, 0, 30도
                const radians = angle * Math.PI / 180;
                
                bullets.push(new Bullet(
                    this.x + this.width / 2 - GAME_CONFIG.bullet.player.width / 2,
                    this.y - GAME_CONFIG.bullet.player.height,
                    Math.sin(radians) * this.bulletSpeed,
                    -Math.cos(radians) * this.bulletSpeed,
                    'player',
                    this.piercing
                ));
            }
        }
        
        return bullets;
    }

    takeDamage() {
        if (this.invulnerable) return false;
        
        // 쉴드가 있으면 쉴드부터 소모
        if (this.powerups.shield.active && this.powerups.shield.charges > 0) {
            this.powerups.shield.charges--;
            if (this.powerups.shield.charges <= 0) {
                this.powerups.shield.active = false;
            }
            return false; // 실제 피해는 없음
        }
        
        this.lives--;
        this.invulnerable = true;
        this.invulnerabilityTimer = GAME_CONFIG.player.invulnerabilityTime;
        
        return true; // 피해를 입음
    }

    heal() {
        if (this.lives < this.maxLives) {
            this.lives++;
            return true;
        }
        return false;
    }

    updateInvulnerability(deltaTime) {
        if (this.invulnerable) {
            this.invulnerabilityTimer -= deltaTime;
            
            // 깜빡임 효과
            this.blinkTimer += deltaTime;
            if (this.blinkTimer > 100) { // 100ms마다 깜빡임
                this.visible = !this.visible;
                this.blinkTimer = 0;
            }
            
            if (this.invulnerabilityTimer <= 0) {
                this.invulnerable = false;
                this.visible = true;
                this.blinkTimer = 0;
            }
        }
    }

    updatePowerups(deltaTime) {
        const now = performance.now();
        
        // 시간 기반 파워업 만료 체크
        Object.keys(this.powerups).forEach(key => {
            const powerup = this.powerups[key];
            if (powerup.active && powerup.endTime && now > powerup.endTime) {
                powerup.active = false;
                
                // 파워업별 정리 작업
                switch (key) {
                    case 'scoreMultiplier':
                        powerup.multiplier = 1;
                        break;
                    case 'piercing':
                        this.piercing = false;
                        break;
                }
            }
        });
    }

    updateAnimation(deltaTime) {
        this.animTimer += deltaTime;
        if (this.animTimer > this.animSpeed) {
            this.animFrame = (this.animFrame + 1) % 4; // 4프레임 애니메이션
            this.animTimer = 0;
        }
    }

    applyPowerup(type) {
        const now = performance.now();
        const duration = GAME_CONFIG.powerups.duration;
        
        switch (type) {
            case 'rapidFire':
                this.powerups.rapidFire.active = true;
                this.powerups.rapidFire.endTime = now + duration;
                break;
                
            case 'multiShot':
                this.powerups.multiShot.active = true;
                this.powerups.multiShot.endTime = now + duration;
                break;
                
            case 'piercing':
                this.powerups.piercing.active = true;
                this.powerups.piercing.endTime = now + duration;
                this.piercing = true;
                break;
                
            case 'shield':
                this.powerups.shield.active = true;
                this.powerups.shield.charges = 3;
                break;
                
            case 'scoreMultiplier':
                this.powerups.scoreMultiplier.active = true;
                this.powerups.scoreMultiplier.endTime = now + duration;
                this.powerups.scoreMultiplier.multiplier = 2;
                break;
                
            case 'extraLife':
                this.heal();
                break;
        }
    }

    render(ctx) {
        if (!this.visible) return;
        
        ctx.save();
        
        // 파워업 글로우 효과
        if (this.hasActivePowerups()) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
        }
        
        // 쉴드 효과
        if (this.powerups.shield.active) {
            ctx.strokeStyle = '#0080ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(
                this.x + this.width / 2,
                this.y + this.height / 2,
                Math.max(this.width, this.height) / 2 + 5,
                0, Math.PI * 2
            );
            ctx.stroke();
        }
        
        // 플레이어 본체 렌더링
        this.renderSprite(ctx);
        
        ctx.restore();
        
        // 디버그: 히트박스 표시
        if (DEBUG.enabled && DEBUG.showHitboxes) {
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
    }

    renderSprite(ctx) {
        // 간단한 삼각형 플레이어 스프라이트
        ctx.fillStyle = this.color;
        ctx.beginPath();
        
        // 메인 삼각형 (위쪽 포인트)
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        
        // 윙 디테일
        ctx.fillStyle = '#40ff40';
        ctx.fillRect(this.x + 5, this.y + this.height - 8, 8, 6);
        ctx.fillRect(this.x + this.width - 13, this.y + this.height - 8, 8, 6);
        
        // 엔진 글로우 (애니메이션)
        const glowIntensity = 0.5 + Math.sin(this.animFrame * 0.5) * 0.3;
        ctx.fillStyle = `rgba(0, 255, 255, ${glowIntensity})`;
        ctx.fillRect(
            this.x + this.width / 2 - 3,
            this.y + this.height - 2,
            6, 4
        );
    }

    hasActivePowerups() {
        return Object.values(this.powerups).some(p => p.active);
    }

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

    // 상태 정보 반환 (UI 업데이트용)
    getStatus() {
        return {
            lives: this.lives,
            powerups: Object.keys(this.powerups).filter(key => this.powerups[key].active),
            invulnerable: this.invulnerable,
            scoreMultiplier: this.powerups.scoreMultiplier.active ? 
                this.powerups.scoreMultiplier.multiplier : 1
        };
    }
}