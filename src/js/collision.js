// 충돌 감지 관리 클래스
class CollisionManager {
    constructor() {
        this.collisionCallbacks = {};
    }

    // AABB (Axis-Aligned Bounding Box) 충돌 감지
    static checkAABB(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    // 원형 충돌 감지
    static checkCircular(obj1, obj2, radius1, radius2) {
        const dx = (obj1.x + obj1.width / 2) - (obj2.x + obj2.width / 2);
        const dy = (obj1.y + obj1.height / 2) - (obj2.y + obj2.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (radius1 + radius2);
    }

    // 점과 사각형 충돌
    static checkPointInRect(pointX, pointY, rect) {
        return pointX >= rect.x &&
               pointX <= rect.x + rect.width &&
               pointY >= rect.y &&
               pointY <= rect.y + rect.height;
    }

    // 선과 사각형 충돌 (레이캐스팅)
    static checkLineRect(x1, y1, x2, y2, rect) {
        // 선의 양 끝점이 사각형 안에 있는지 확인
        if (this.checkPointInRect(x1, y1, rect) || 
            this.checkPointInRect(x2, y2, rect)) {
            return true;
        }

        // 선이 사각형의 각 변과 교차하는지 확인
        return this.lineIntersect(x1, y1, x2, y2, rect.x, rect.y, rect.x + rect.width, rect.y) ||
               this.lineIntersect(x1, y1, x2, y2, rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height) ||
               this.lineIntersect(x1, y1, x2, y2, rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height) ||
               this.lineIntersect(x1, y1, x2, y2, rect.x, rect.y + rect.height, rect.x, rect.y);
    }

    // 두 선의 교차점 확인
    static lineIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (denom === 0) return false;

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }

    // 충돌 콜백 등록
    registerCallback(type, callback) {
        if (!this.collisionCallbacks[type]) {
            this.collisionCallbacks[type] = [];
        }
        this.collisionCallbacks[type].push(callback);
    }

    // 충돌 이벤트 발생
    triggerCallback(type, ...args) {
        if (this.collisionCallbacks[type]) {
            this.collisionCallbacks[type].forEach(callback => callback(...args));
        }
    }

    // 플레이어와 적 총알 충돌 검사
    checkPlayerBulletCollisions(player, enemyBullets) {
        if (player.invulnerable) return;

        const playerHitbox = player.getHitbox();

        for (let bullet of enemyBullets) {
            if (!bullet.active) continue;

            const bulletHitbox = bullet.getHitbox();

            if (CollisionManager.checkAABB(playerHitbox, bulletHitbox)) {
                const damaged = player.takeDamage();
                bullet.hit();
                
                this.triggerCallback('playerHit', player, bullet, damaged);
                
                if (damaged) {
                    // 화면 진동 효과
                    this.triggerCallback('screenShake');
                }
            }
        }
    }

    // 적과 플레이어 총알 충돌 검사
    checkEnemyBulletCollisions(enemies, playerBullets) {
        for (let enemy of enemies) {
            if (!enemy.active) continue;

            const enemyHitbox = enemy.getHitbox();

            for (let bullet of playerBullets) {
                if (!bullet.active) continue;

                const bulletHitbox = bullet.getHitbox();

                if (CollisionManager.checkAABB(enemyHitbox, bulletHitbox)) {
                    const destroyed = enemy.takeDamage(bullet.damage);
                    const bulletHit = bullet.hit(enemy);
                    
                    if (bulletHit) {
                        this.triggerCallback('enemyHit', enemy, bullet, destroyed);
                        
                        if (destroyed) {
                            this.triggerCallback('enemyDestroyed', enemy);
                        }
                    }
                }
            }
        }
    }

    // 플레이어와 적 직접 충돌 검사
    checkPlayerEnemyCollisions(player, enemies) {
        if (player.invulnerable) return;

        const playerHitbox = player.getHitbox();

        for (let enemy of enemies) {
            if (!enemy.active) continue;

            const enemyHitbox = enemy.getHitbox();

            if (CollisionManager.checkAABB(playerHitbox, enemyHitbox)) {
                const playerDamaged = player.takeDamage();
                const enemyDestroyed = enemy.takeDamage(999); // 적은 충돌 시 파괴
                
                this.triggerCallback('playerEnemyCollision', player, enemy, playerDamaged);
                
                if (playerDamaged) {
                    this.triggerCallback('screenShake');
                }
                
                if (enemyDestroyed) {
                    this.triggerCallback('enemyDestroyed', enemy);
                }
            }
        }
    }

    // 플레이어와 파워업 충돌 검사
    checkPlayerPowerupCollisions(player, powerups) {
        const playerHitbox = player.getHitbox();

        for (let powerup of powerups) {
            if (!powerup.active) continue;

            const powerupHitbox = powerup.getHitbox();

            if (CollisionManager.checkAABB(playerHitbox, powerupHitbox)) {
                player.applyPowerup(powerup.type);
                powerup.collect();
                
                this.triggerCallback('powerupCollected', player, powerup);
            }
        }
    }

    // 레이저와 객체들 충돌 검사 (보스 레이저 공격용)
    checkLaserCollisions(laserX1, laserY1, laserX2, laserY2, targets) {
        const collisions = [];

        for (let target of targets) {
            if (!target.active) continue;

            const hitbox = target.getHitbox();
            
            if (CollisionManager.checkLineRect(laserX1, laserY1, laserX2, laserY2, hitbox)) {
                collisions.push(target);
            }
        }

        return collisions;
    }

    // 스페셜 충돌: 폭발 범위 검사
    checkExplosionCollisions(centerX, centerY, radius, targets) {
        const collisions = [];

        for (let target of targets) {
            if (!target.active) continue;

            const targetCenterX = target.x + target.width / 2;
            const targetCenterY = target.y + target.height / 2;
            
            const distance = Math.sqrt(
                Math.pow(centerX - targetCenterX, 2) + 
                Math.pow(centerY - targetCenterY, 2)
            );

            if (distance <= radius) {
                collisions.push({
                    target: target,
                    distance: distance,
                    damage: Math.max(1, Math.floor((radius - distance) / radius * 5)) // 거리에 따른 데미지
                });
            }
        }

        return collisions;
    }

    // 효율적인 공간 분할 충돌 검사 (성능 최적화)
    spatialHash(objects, cellSize = 50) {
        const hash = {};
        const collisionPairs = [];

        // 객체를 그리드 셀에 배치
        objects.forEach(obj => {
            if (!obj.active) return;

            const minX = Math.floor(obj.x / cellSize);
            const minY = Math.floor(obj.y / cellSize);
            const maxX = Math.floor((obj.x + obj.width) / cellSize);
            const maxY = Math.floor((obj.y + obj.height) / cellSize);

            for (let x = minX; x <= maxX; x++) {
                for (let y = minY; y <= maxY; y++) {
                    const key = `${x},${y}`;
                    if (!hash[key]) hash[key] = [];
                    hash[key].push(obj);
                }
            }
        });

        // 같은 셀에 있는 객체들끼리만 충돌 검사
        Object.values(hash).forEach(cellObjects => {
            for (let i = 0; i < cellObjects.length; i++) {
                for (let j = i + 1; j < cellObjects.length; j++) {
                    collisionPairs.push([cellObjects[i], cellObjects[j]]);
                }
            }
        });

        return collisionPairs;
    }

    // 디버그용 충돌 영역 시각화
    renderDebugCollisions(ctx, objects) {
        if (!DEBUG.enabled || !DEBUG.showHitboxes) return;

        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 1;

        objects.forEach(obj => {
            if (!obj.active) return;
            
            const hitbox = obj.getHitbox();
            ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
        });
    }

    // 충돌 통계 (성능 모니터링용)
    getCollisionStats() {
        return {
            callbackCount: Object.keys(this.collisionCallbacks).length,
            totalCallbacks: Object.values(this.collisionCallbacks).reduce((sum, arr) => sum + arr.length, 0)
        };
    }
}

// 충돌 효과 매니저
class CollisionEffectManager {
    constructor() {
        this.effects = [];
    }

    // 충돌 시 파티클 효과 생성
    createHitEffect(x, y, type = 'normal') {
        const effect = {
            x: x,
            y: y,
            particles: [],
            age: 0,
            maxAge: 500, // 0.5초
            type: type
        };

        // 파티클 생성
        const particleCount = type === 'explosion' ? 20 : 8;
        const colors = type === 'explosion' ? 
            ['#ff4040', '#ff8040', '#ffff40'] : 
            ['#ffffff', '#ffff00', '#00ffff'];

        for (let i = 0; i < particleCount; i++) {
            effect.particles.push({
                x: 0,
                y: 0,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1,
                decay: 0.02 + Math.random() * 0.02
            });
        }

        this.effects.push(effect);
    }

    // 효과 업데이트
    update(deltaTime) {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.age += deltaTime;

            // 파티클 업데이트
            effect.particles.forEach(particle => {
                particle.x += particle.vx * deltaTime / 16;
                particle.y += particle.vy * deltaTime / 16;
                particle.life -= particle.decay;
                particle.vx *= 0.98; // 마찰
                particle.vy *= 0.98;
            });

            // 수명이 다한 효과 제거
            if (effect.age > effect.maxAge) {
                this.effects.splice(i, 1);
            }
        }
    }

    // 효과 렌더링
    render(ctx) {
        this.effects.forEach(effect => {
            effect.particles.forEach(particle => {
                if (particle.life <= 0) return;

                ctx.save();
                ctx.globalAlpha = particle.life;
                ctx.fillStyle = particle.color;
                ctx.fillRect(
                    effect.x + particle.x - 1,
                    effect.y + particle.y - 1,
                    3, 3
                );
                ctx.restore();
            });
        });
    }

    // 모든 효과 제거
    clear() {
        this.effects = [];
    }
}