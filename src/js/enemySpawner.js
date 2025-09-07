// 적 스폰 관리 시스템
class EnemySpawner {
    constructor() {
        // 스폰 설정
        this.spawnTimer = 0;
        this.spawnInterval = 2000; // 2초마다 스폰
        this.lastSpawnTime = 0;
        
        // 웨이브 관리
        this.currentWave = 0;
        this.waveEnemyCount = 0;
        this.waveEnemySpawned = 0;
        this.wavePaused = false;
        this.waveCompleteCallback = null;
        
        // 스폰 패턴
        this.spawnPatterns = {
            single: this.spawnSingle.bind(this),
            line: this.spawnLine.bind(this),
            formation: this.spawnFormation.bind(this),
            wave: this.spawnWave.bind(this)
        };
        
        // 난이도 조절
        this.difficultyMultiplier = 1;
        this.maxActiveEnemies = 10;
        
        // 스테이지별 스폰 데이터
        this.stageData = this.generateStageData();
    }

    generateStageData() {
        const stages = {};
        
        for (let stage = 1; stage <= GAME_CONFIG.stages.totalStages; stage++) {
            stages[stage] = {
                waves: [],
                isBossStage: GAME_CONFIG.stages.bossStages.includes(stage)
            };
            
            if (stages[stage].isBossStage) {
                // 보스 스테이지
                stages[stage].waves = [
                    { type: 'boss', count: 1, enemyTypes: ['boss'] }
                ];
            } else {
                // 일반 스테이지 - 5개 웨이브
                const baseCount = Math.min(3 + Math.floor(stage / 2), 8);
                stages[stage].waves = [
                    { 
                        type: 'grunt_wave', 
                        count: baseCount,
                        enemyTypes: ['grunt'],
                        pattern: 'line'
                    },
                    { 
                        type: 'mixed_basic', 
                        count: Math.ceil(baseCount * 0.7),
                        enemyTypes: ['grunt', 'rusher'],
                        pattern: 'formation'
                    },
                    { 
                        type: 'shooters', 
                        count: Math.max(2, Math.floor(baseCount * 0.5)),
                        enemyTypes: ['shooter'],
                        pattern: 'line'
                    },
                    { 
                        type: 'mixed_advanced', 
                        count: baseCount,
                        enemyTypes: ['grunt', 'zigzag', 'shooter'],
                        pattern: 'wave'
                    },
                    { 
                        type: 'heavy_assault', 
                        count: Math.max(1, Math.floor(stage / 3)),
                        enemyTypes: ['heavy'],
                        pattern: 'single',
                        extraEnemies: Math.floor(baseCount * 0.3),
                        extraTypes: ['grunt', 'rusher']
                    }
                ];
            }
        }
        
        return stages;
    }

    startStage(stage, onWaveComplete = null) {
        this.currentStage = stage;
        this.currentWave = 0;
        this.waveCompleteCallback = onWaveComplete;
        this.difficultyMultiplier = 1 + (stage - 1) * 0.2;
        
        // 스폰 간격 조정
        this.spawnInterval = Math.max(800, 2000 - (stage - 1) * 100);
        
        this.startNextWave();
    }

    startNextWave() {
        const stageData = this.stageData[this.currentStage];
        if (!stageData || this.currentWave >= stageData.waves.length) {
            // 스테이지 완료
            if (this.waveCompleteCallback) {
                this.waveCompleteCallback('stage_complete');
            }
            return;
        }
        
        const waveData = stageData.waves[this.currentWave];
        this.waveEnemyCount = waveData.count;
        this.waveEnemySpawned = 0;
        this.wavePaused = false;
        
        // 추가 적이 있는 경우 총 카운트에 추가
        if (waveData.extraEnemies) {
            this.waveEnemyCount += waveData.extraEnemies;
        }
        
        console.log(`스테이지 ${this.currentStage} - 웨이브 ${this.currentWave + 1} 시작 (적 ${this.waveEnemyCount}마리)`);
        
        this.spawnTimer = 0;
        this.lastSpawnTime = 0;
    }

    update(deltaTime, activeEnemies, enemies) {
        if (this.wavePaused || !this.stageData[this.currentStage]) return;
        
        this.spawnTimer += deltaTime;
        
        // 웨이브가 완료되었는지 확인
        if (this.waveEnemySpawned >= this.waveEnemyCount && activeEnemies === 0) {
            this.currentWave++;
            this.startNextWave();
            return;
        }
        
        // 스폰 조건 확인
        if (this.canSpawn(activeEnemies)) {
            this.spawnEnemies(enemies);
        }
    }

    canSpawn(activeEnemies) {
        return this.spawnTimer >= this.spawnInterval &&
               this.waveEnemySpawned < this.waveEnemyCount &&
               activeEnemies < this.maxActiveEnemies;
    }

    spawnEnemies(enemies) {
        const stageData = this.stageData[this.currentStage];
        const waveData = stageData.waves[this.currentWave];
        
        if (!waveData) return;
        
        const spawnCount = Math.min(
            waveData.pattern === 'single' ? 1 : Math.min(3, this.waveEnemyCount - this.waveEnemySpawned),
            this.maxActiveEnemies - enemies.filter(e => e.active).length
        );
        
        if (spawnCount <= 0) return;
        
        // 스폰 패턴에 따라 적 생성
        const pattern = waveData.pattern || 'single';
        const enemyTypes = waveData.enemyTypes || ['grunt'];
        
        this.spawnPatterns[pattern](enemies, enemyTypes, spawnCount);
        
        this.waveEnemySpawned += spawnCount;
        this.spawnTimer = 0;
        this.lastSpawnTime = performance.now();
        
        // 추가 적 스폰 (Heavy 웨이브 등에서 사용)
        if (waveData.extraEnemies && this.waveEnemySpawned === waveData.count) {
            setTimeout(() => {
                this.spawnExtraEnemies(enemies, waveData);
            }, 1000);
        }
    }

    spawnExtraEnemies(enemies, waveData) {
        const extraCount = waveData.extraEnemies;
        const extraTypes = waveData.extraTypes || ['grunt'];
        
        this.spawnPatterns['formation'](enemies, extraTypes, extraCount);
    }

    // 스폰 패턴들
    spawnSingle(enemies, enemyTypes, count) {
        for (let i = 0; i < count; i++) {
            const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            const x = Math.random() * (GAME_CONFIG.canvas.width - 50) + 25;
            const y = -30;
            
            enemies.push(this.createEnemy(enemyType, x, y));
        }
    }

    spawnLine(enemies, enemyTypes, count) {
        const spacing = GAME_CONFIG.canvas.width / (count + 1);
        
        for (let i = 0; i < count; i++) {
            const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            const x = spacing * (i + 1) - 15;
            const y = -30;
            
            enemies.push(this.createEnemy(enemyType, x, y));
        }
    }

    spawnFormation(enemies, enemyTypes, count) {
        const formations = [
            'triangle', 'line', 'diamond', 'arrow'
        ];
        
        const formation = formations[Math.floor(Math.random() * formations.length)];
        const positions = this.getFormationPositions(formation, count);
        
        positions.forEach(pos => {
            const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            enemies.push(this.createEnemy(enemyType, pos.x, pos.y));
        });
    }

    spawnWave(enemies, enemyTypes, count) {
        // 웨이브 형태로 좌우에서 번갈아가며 스폰
        for (let i = 0; i < count; i++) {
            const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            const side = i % 2; // 0: 왼쪽, 1: 오른쪽
            const x = side === 0 ? -20 : GAME_CONFIG.canvas.width + 20;
            const y = Math.random() * 100 - 50;
            
            const enemy = this.createEnemy(enemyType, x, y);
            
            // 중앙으로 이동하도록 속도 조정
            if (side === 0) {
                enemy.vx = 2;
            } else {
                enemy.vx = -2;
            }
            
            enemies.push(enemy);
        }
    }

    getFormationPositions(formation, count) {
        const positions = [];
        const centerX = GAME_CONFIG.canvas.width / 2;
        const startY = -50;
        
        switch (formation) {
            case 'triangle':
                let row = 0;
                let posInRow = 0;
                const maxInRow = row + 1;
                
                for (let i = 0; i < count; i++) {
                    if (posInRow >= maxInRow) {
                        row++;
                        posInRow = 0;
                    }
                    
                    const rowWidth = (row + 1) * 40;
                    const startX = centerX - rowWidth / 2;
                    
                    positions.push({
                        x: startX + (posInRow * 40),
                        y: startY - (row * 40)
                    });
                    
                    posInRow++;
                }
                break;
                
            case 'diamond':
                const mid = Math.floor(count / 2);
                for (let i = 0; i < count; i++) {
                    const distFromMid = Math.abs(i - mid);
                    const x = centerX + (i - mid) * 30;
                    const y = startY - distFromMid * 20;
                    
                    positions.push({ x, y });
                }
                break;
                
            case 'arrow':
                for (let i = 0; i < count; i++) {
                    const x = centerX + (i - Math.floor(count / 2)) * 35;
                    const y = startY - Math.abs(i - Math.floor(count / 2)) * 15;
                    
                    positions.push({ x, y });
                }
                break;
                
            default: // line
                const spacing = Math.min(60, GAME_CONFIG.canvas.width / (count + 1));
                for (let i = 0; i < count; i++) {
                    positions.push({
                        x: spacing * (i + 1) - 15,
                        y: startY
                    });
                }
                break;
        }
        
        return positions;
    }

    createEnemy(type, x, y) {
        let enemy;
        
        switch (type) {
            case 'grunt':
                enemy = new Grunt(x, y);
                break;
            case 'rusher':
                enemy = new Rusher(x, y);
                break;
            case 'shooter':
                enemy = new Shooter(x, y);
                break;
            case 'zigzag':
                enemy = new Zigzag(x, y);
                break;
            case 'heavy':
                enemy = new Heavy(x, y);
                break;
            case 'boss':
                enemy = new Boss(x, y);
                break;
            default:
                enemy = new Grunt(x, y);
                break;
        }
        
        // 난이도에 따른 조정 (보스는 제외)
        if (type !== 'boss') {
            enemy.speed *= this.difficultyMultiplier;
            enemy.vy *= this.difficultyMultiplier;
            
            if (enemy.fireRate > 0) {
                enemy.fireRate = Math.max(500, enemy.fireRate / this.difficultyMultiplier);
            }
        }
        
        return enemy;
    }

    // 웨이브 스킵 (디버그용)
    skipWave() {
        this.waveEnemySpawned = this.waveEnemyCount;
    }

    // 현재 웨이브 정보
    getCurrentWaveInfo() {
        const stageData = this.stageData[this.currentStage];
        if (!stageData) return null;
        
        return {
            stage: this.currentStage,
            wave: this.currentWave + 1,
            totalWaves: stageData.waves.length,
            enemiesSpawned: this.waveEnemySpawned,
            totalEnemies: this.waveEnemyCount,
            isBossStage: stageData.isBossStage
        };
    }

    // 스폰 일시정지/재개
    pauseSpawn() {
        this.wavePaused = true;
    }

    resumeSpawn() {
        this.wavePaused = false;
    }

    // 강제 스폰 (테스트용)
    forceSpawn(enemies, type, count = 1) {
        for (let i = 0; i < count; i++) {
            const x = Math.random() * (GAME_CONFIG.canvas.width - 50) + 25;
            const y = -30;
            enemies.push(this.createEnemy(type, x, y));
        }
    }
}

// 적 매니저 (적 관리 통합)
class EnemyManager {
    constructor() {
        this.enemies = [];
        this.spawner = new EnemySpawner();
        this.pool = {}; // 타입별 객체 풀
        
        // 각 타입별 풀 초기화
        ['grunt', 'rusher', 'shooter', 'zigzag', 'heavy', 'boss'].forEach(type => {
            this.pool[type] = [];
        });
    }

    startStage(stage, onComplete) {
        this.clear();
        this.spawner.startStage(stage, onComplete);
    }

    update(deltaTime, player, bulletManager) {
        // 스폰 업데이트
        const activeCount = this.enemies.filter(e => e.active).length;
        this.spawner.update(deltaTime, activeCount, this.enemies);
        
        // 적들 업데이트
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(deltaTime, player, bulletManager);
            
            if (!enemy.active) {
                this.recycleEnemy(enemy, i);
            }
        }
    }

    render(ctx) {
        this.enemies.forEach(enemy => {
            if (enemy.active) {
                enemy.render(ctx);
            }
        });
    }

    recycleEnemy(enemy, index) {
        if (index !== undefined) {
            this.enemies.splice(index, 1);
        }
        
        // 객체 풀에 반환 (구현 생략 - 단순화)
    }

    getActiveEnemies() {
        return this.enemies.filter(e => e.active);
    }

    clear() {
        this.enemies.forEach(enemy => enemy.active = false);
        this.enemies = [];
    }

    // 디버그/테스트용 메서드들
    forceSpawnEnemy(type, x = null, y = null) {
        const spawnX = x !== null ? x : Math.random() * (GAME_CONFIG.canvas.width - 50) + 25;
        const spawnY = y !== null ? y : -30;
        this.enemies.push(this.spawner.createEnemy(type, spawnX, spawnY));
    }

    getCurrentWaveInfo() {
        return this.spawner.getCurrentWaveInfo();
    }

    skipCurrentWave() {
        this.spawner.skipWave();
    }
}