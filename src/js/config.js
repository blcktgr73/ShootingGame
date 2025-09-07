// 게임 설정 파일
const GAME_CONFIG = {
    // 게임 화면 설정
    canvas: {
        width: 800,
        height: 600,
        backgroundColor: '#000011'
    },

    // 플레이어 설정
    player: {
        width: 40,
        height: 40,
        speed: 5,
        fireRate: 300, // 발사 간격 (밀리초)
        maxLives: 5,
        defaultLives: 3,
        invulnerabilityTime: 2000, // 피격 후 무적 시간 (밀리초)
        color: '#00ff00'
    },

    // 총알 설정
    bullet: {
        player: {
            width: 4,
            height: 12,
            speed: 8,
            color: '#ffff00',
            damage: 1
        },
        enemy: {
            width: 6,
            height: 8,
            speed: 4,
            color: '#ff4040',
            damage: 1
        }
    },

    // 적 설정
    enemies: {
        grunt: {
            width: 30,
            height: 30,
            hp: 1,
            speed: 2,
            score: 100,
            color: '#ff6060',
            fireRate: 0 // 공격 안함
        },
        rusher: {
            width: 25,
            height: 25,
            hp: 1,
            speed: 8,
            score: 150,
            color: '#ff8040',
            fireRate: 0
        },
        shooter: {
            width: 35,
            height: 35,
            hp: 2,
            speed: 1,
            score: 200,
            color: '#ff40ff',
            fireRate: 2000 // 2초마다 발사
        },
        zigzag: {
            width: 28,
            height: 28,
            hp: 1,
            speed: 3,
            score: 250,
            color: '#40ff40',
            fireRate: 0,
            zigzagAmplitude: 50, // 지그재그 폭
            zigzagFrequency: 0.05 // 지그재그 주기
        },
        heavy: {
            width: 50,
            height: 50,
            hp: 5,
            speed: 0.5,
            score: 500,
            color: '#8040ff',
            fireRate: 3000, // 3초마다 발사
            bulletPattern: 'spread3' // 3방향 산탄
        },
        boss: {
            width: 100,
            height: 80,
            hp: 50,
            speed: 1,
            score: 5000,
            color: '#ff0040',
            phases: {
                1: { fireRate: 2000, pattern: 'spread5' }, // 5방향 산탄
                2: { fireRate: 1500, pattern: 'circle' },   // 원형 탄막
                3: { fireRate: 5000, pattern: 'laser' }     // 레이저
            }
        }
    },

    // 파워업 설정
    powerups: {
        duration: 30000, // 30초 지속
        spawnRate: 0.1,  // 10% 확률로 드롭
        types: {
            rapidFire: {
                name: '연사력 증가',
                color: '#ffff00',
                icon: 'R',
                effect: 'fireRate',
                value: 0.5 // 발사 간격 50% 단축
            },
            multiShot: {
                name: '다중 총알',
                color: '#00ffff',
                icon: 'M',
                effect: 'bulletCount',
                value: 3 // 3발 동시 발사
            },
            piercing: {
                name: '관통 총알',
                color: '#ff8000',
                icon: 'P',
                effect: 'piercing',
                value: true
            },
            shield: {
                name: '쉴드',
                color: '#0080ff',
                icon: 'S',
                effect: 'shield',
                value: 3 // 3회 피격 무효화
            },
            scoreMultiplier: {
                name: '점수 배율',
                color: '#ff00ff',
                icon: '2X',
                effect: 'scoreMultiplier',
                value: 2
            },
            extraLife: {
                name: '생명력 회복',
                color: '#ff4040',
                icon: '♥',
                effect: 'extraLife',
                value: 1
            }
        }
    },

    // 스테이지 설정
    stages: {
        totalStages: 10,
        bossStages: [5, 10], // 보스가 나오는 스테이지
        difficultyIncrease: {
            enemySpeed: 0.2,     // 스테이지당 적 속도 증가
            spawnRate: 0.1,      // 스테이지당 적 생성 빈도 증가
            enemyHealth: 0.1     // 스테이지당 적 체력 증가
        },
        waves: {
            normal: 5,  // 일반 스테이지 웨이브 수
            boss: 1     // 보스 스테이지 웨이브 수
        }
    },

    // 점수 시스템
    scoring: {
        combo: {
            maxMultiplier: 5,    // 최대 콤보 배율
            timeWindow: 1000,    // 콤보 유지 시간 (밀리초)
            decayRate: 0.1       // 콤보 감소율
        },
        bonus: {
            noDamageStage: 1000, // 무피해 스테이지 클리어 보너스
            timeBonus: 10        // 시간당 보너스 점수
        }
    },

    // 게임 상태
    gameStates: {
        MENU: 'menu',
        PLAYING: 'playing',
        PAUSED: 'paused',
        GAME_OVER: 'gameOver',
        STAGE_CLEAR: 'stageClear',
        SETTINGS: 'settings',
        CONTROLS: 'controls'
    },

    // 키 설정
    keys: {
        left: ['ArrowLeft', 'KeyA'],
        right: ['ArrowRight', 'KeyD'],
        shoot: ['Space'],
        pause: ['Escape', 'KeyP'],
        restart: ['KeyR']
    },

    // 사운드 설정
    audio: {
        masterVolume: 1.0,
        sfxVolume: 1.0,
        musicVolume: 1.0,
        sounds: {
            playerShoot: 'laser1.wav',
            enemyHit: 'explosion1.wav',
            enemyShoot: 'laser2.wav',
            powerupPickup: 'powerup.wav',
            gameOver: 'gameover.wav',
            stageClear: 'stageclear.wav',
            bossAppear: 'bossappear.wav'
        },
        music: {
            menu: 'menu.mp3',
            stage: 'stage.mp3',
            boss: 'boss.mp3'
        }
    },

    // 시각 효과 설정
    effects: {
        explosion: {
            particleCount: 15,
            maxAge: 60,
            colors: ['#ff4040', '#ff8040', '#ffff40']
        },
        trail: {
            length: 5,
            fadeRate: 0.1
        },
        screenShake: {
            duration: 200,
            intensity: 5
        }
    },

    // 성능 설정
    performance: {
        targetFPS: 60,
        objectPoolSize: {
            bullets: 100,
            enemies: 50,
            particles: 200
        },
        cullDistance: 50 // 화면 밖 객체 제거 거리
    }
};

// 로컬 저장소 키
const STORAGE_KEYS = {
    highScores: 'gallagaShooter_highScores',
    settings: 'gallagaShooter_settings',
    stats: 'gallagaShooter_stats'
};

// 게임 통계
const GAME_STATS = {
    totalPlayTime: 0,
    enemiesKilled: 0,
    bulletsShot: 0,
    powerupsCollected: 0,
    gamesPlayed: 0
};

// 디버그 모드 (개발 중에만 사용)
const DEBUG = {
    enabled: false,
    showHitboxes: false,
    showFPS: false,
    godMode: false,
    unlimitedAmmo: false
};