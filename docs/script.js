document.addEventListener('DOMContentLoaded', () => {
    const reel1 = document.getElementById('reel1');
    const reel2 = document.getElementById('reel2');
    const reel3 = document.getElementById('reel3');
    const balanceValue = document.getElementById('balance-value');
    const betValueDisplayInGameInfo = document.getElementById('bet-value');
    // const betValueDisplayInControls = document.querySelector('.current-bet-display'); // Removido: Este elemento não existe mais no HTML
    const spinButton = document.getElementById('spin-button');
    const messageDisplay = document.getElementById('message');
    const turboButton = document.getElementById('turbo-button');
    const autoSpinButton = document.getElementById('auto-spin-button');
    const betButtons = document.querySelectorAll('.bet-button'); // Seleciona todos os botões de aposta
    const versionNumberDisplay = document.getElementById('version-number'); // Elemento da versão

    // Elementos da tela de Mega Ganho
    const megaWinScreen = document.getElementById('mega-win-screen');
    const megaWinAmountDisplay = document.getElementById('mega-win-amount');
    
    // --- Variáveis do Jogo ---
    let balance = 100.00;
    let currentBet = 1.00; // Aposta inicial
    const minBet = 1.00; // Aposta mínima
    const maxBet = 400.00; // Aposta máxima
    const VERSION = "0.0.0.1"; // Número da versão

    // --- Configuração de Áudio ---
    const audioPath = './audio/';

    const spinSound = new Audio(audioPath + 'spin.mp3');
    const winSound = new Audio(audioPath + 'win.mp3');
    const loseSound = new Audio(audioPath + 'lose.mp3');
    const buttonClickSound = new Audio(audioPath + 'button.mp3');
    const bonusMusic = new Audio(audioPath + 'bonus_music.mp3');
    const mainMusic = new Audio(audioPath + 'main_music.mp3'); 
    const megaWinSound = new Audio(audioPath + 'mega_win_sound.mp3');

    // Configurações de volume
    spinSound.volume = 0.7;
    winSound.volume = 0.8;
    loseSound.volume = 0.7;
    buttonClickSound.volume = 0.5;
    bonusMusic.volume = 0.6;
    mainMusic.volume = 0.2;
    megaWinSound.volume = 0.8;

    mainMusic.loop = true;
    bonusMusic.loop = true;
    megaWinSound.loop = true;

    // --- Variáveis do Bônus ---
    let inBonusRound = false;
    let bonusSpinsLeft = 0;
    const scatterSymbol = { name: 'coin', display: '💰', multiplier: 0 }; // Símbolo Scatter para ativar o bônus
    const bonusSymbol = { name: 'wild', display: '🐯', multiplier: 50 }; // Símbolo WILD dentro do bônus
    const bonusMultiplier = 50;
    let isFirstBonusSpin = false; // Flag para o primeiro giro do bônus

    // --- Variáveis de Turbo e Auto-Spin ---
    let isTurboMode = false;
    let isAutoSpin = false;
    let spinDuration = 3040; // Duração normal do spin em ms (38 * 80)
    let turboSpinDuration = 1000; // Duração do spin em modo turbo em ms
    let isMegaWinAnimating = false;
    let megaWinTimeoutId = null;
    let currentSpinInterval = null; // Para controlar o intervalo do giro atual para aceleração

    // Símbolos e suas probabilidades (Ponderação)
    const symbols = [
        { name: 'cherry', display: '🍒', multiplier: 2 },
        { name: 'bell', display: '🔔', multiplier: 5 },
        { name: 'bar', display: '💲', multiplier: 10 },
        { name: 'seven', display: '7️⃣', multiplier: 20 },
        { name: 'wild', display: '🐯', multiplier: 50 },
        { name: 'coin', display: '💰', multiplier: 0 } // Scatter
    ];

    // Array ponderado para seleção de símbolos
    const weightedSymbols = [];
    symbols.forEach(symbol => {
        let weight;
        switch (symbol.name) {
            case 'cherry': weight = 8; break; // Mais comum
            case 'bell': weight = 7; break;
            case 'bar': weight = 5; break;
            case 'seven': weight = 3; break;
            case 'wild': weight = 2; break; // Mais raro no jogo base
            case 'coin': weight = 4; break; // Scatter
            default: weight = 1;
        }
        for (let i = 0; i < weight; i++) {
            weightedSymbols.push(symbol);
        }
    });


    // Atualiza a exibição de saldo e aposta e estado dos botões
    function updateDisplay() {
        balanceValue.textContent = balance.toFixed(2);
        betValueDisplayInGameInfo.textContent = currentBet.toFixed(2); 
        
        const disableAllControls = inBonusRound || isAutoSpin || isMegaWinAnimating;

        spinButton.disabled = disableAllControls || balance < currentBet;
        
        // Gerencia o estado dos botões de aposta pré-definidos
        betButtons.forEach(button => {
            const betAmount = parseFloat(button.dataset.bet);
            button.disabled = disableAllControls || betAmount > balance;
            if (betAmount === currentBet) {
                button.classList.add('active-bet');
            } else {
                button.classList.remove('active-bet');
            }
        });
        
        // Botões Turbo e Auto
        turboButton.disabled = disableAllControls;
        autoSpinButton.disabled = disableAllControls;

        // Atualiza classe 'active' e texto para botões de turbo/auto
        if (isTurboMode) {
            turboButton.classList.add('active');
            turboButton.textContent = 'TURBO ATIVO';
        } else {
            turboButton.classList.remove('active');
            turboButton.textContent = 'TURBO';
        }
        if (isAutoSpin) {
            autoSpinButton.classList.add('active');
            autoSpinButton.textContent = 'AUTO ATIVO';
        } else {
            autoSpinButton.classList.remove('active');
            autoSpinButton.textContent = 'AUTO';
        }

        versionNumberDisplay.textContent = VERSION; // Exibe o número da versão
    }

    // Renderiza um símbolo na bobina, controlando se deve animar
    function renderSymbol(reelElement, symbolObj, animating = false) {
        reelElement.innerHTML = `<div class="symbol symbol-${symbolObj.name}">${symbolObj.display}</div>`;
        const symbolDiv = reelElement.querySelector('.symbol');
        if (animating) {
            symbolDiv.classList.add('animating');
        } else {
            symbolDiv.classList.remove('animating');
        }
    }

    // Seleciona um símbolo aleatório com base nas probabilidades ponderadas
    function getRandomSymbol(isBonusRoundSpin = false) {
        if (isBonusRoundSpin) {
            if (isFirstBonusSpin) {
                // No primeiro giro do bônus, 10% de chance de WILD, 90% de "vazio"
                return Math.random() < 0.1 ? bonusSymbol : { name: 'empty', display: ' ', multiplier: 0 };
            } else {
                // A partir do segundo giro do bônus, 90% de chance de WILD, 10% de "vazio"
                return Math.random() < 0.9 ? bonusSymbol : { name: 'empty', display: ' ', multiplier: 0 };
            }
        }
        // Seleção ponderada para o jogo base
        return weightedSymbols[Math.floor(Math.random() * weightedSymbols.length)];
    }

    // Toca a música principal
    function playMainMusic() {
        mainMusic.currentTime = 0;
        mainMusic.play().catch(e => console.log("Música principal não pôde tocar automaticamente:", e));
    }

    // Função principal de giro
    function performSpin() {
        if (!inBonusRound && balance < currentBet) {
            showMessage("Saldo insuficiente para apostar!");
            stopAutoSpin();
            return;
        }
        if (!inBonusRound) {
            balance -= currentBet;
        }

        updateDisplay();
        showMessage(inBonusRound ? `Bônus: ${bonusSpinsLeft} giros restantes...` : "Girando...");
        
        spinButton.disabled = true;

        spinSound.currentTime = 0;
        spinSound.play();

        const results = [
            getRandomSymbol(inBonusRound), // Passa true se for giro de bônus
            getRandomSymbol(inBonusRound),
            getRandomSymbol(inBonusRound)
        ];

        let spinCount = 0;
        const currentSpinDuration = isTurboMode ? turboSpinDuration : spinDuration;
        const intervalStep = 80;
        const maxSpins = Math.floor(currentSpinDuration / intervalStep); 

        currentSpinInterval = setInterval(() => { // Armazena o ID do intervalo
            renderSymbol(reel1, getRandomSymbol(inBonusRound), true);
            renderSymbol(reel2, getRandomSymbol(inBonusRound), true);
            renderSymbol(reel3, getRandomSymbol(inBonusRound), true);
            spinCount++;

            if (spinCount > maxSpins) {
                clearInterval(currentSpinInterval);
                currentSpinInterval = null; // Limpa o ID
                renderSymbol(reel1, results[0], false);
                renderSymbol(reel2, results[1], false);
                renderSymbol(reel3, results[2], false);
                
                if (inBonusRound) {
                    checkBonusWin(results);
                } else {
                    checkWin(results);
                    // A ativação do bônus agora é feita em checkWin, procurando por 3 scatters
                }

                if (!isMegaWinAnimating) { 
                    spinButton.disabled = false; 
                }
                if (!inBonusRound && mainMusic) mainMusic.play(); 

                // Auto-spin não roda automaticamente no bônus
                if (isAutoSpin && !inBonusRound && !isMegaWinAnimating) {
                    setTimeout(performSpin, 500); 
                }
            }
        }, intervalStep);
    }

    // Lógica de verificação de vitória (giro normal)
    function checkWin(results) {
        let winAmount = 0;
        let message = "Não foi desta vez!";

        const s1 = results[0];
        const s2 = results[1];
        const s3 = results[2];

        // Verificação de 3 Scatters para ativar o bônus
        const scatterCount = results.filter(s => s.name === scatterSymbol.name).length;
        if (scatterCount === 3) {
            startBonusRound();
            return; // Sai da função para não processar como ganho normal
        }

        // Condições de vitória
        if (s1.name === s2.name && s2.name === s3.name) {
            winAmount = s1.multiplier * currentBet;
            message = `🎉 TRIO DE ${s1.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🎉`;
        }
        else if (s1.name === 'wild' && s2.name === s3.name && s2.name !== 'wild') {
            winAmount = s2.multiplier * currentBet * 1.5;
            message = `🎉 WILD com ${s2.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🎉`;
        }
        else if (s2.name === 'wild' && s1.name === s3.name && s1.name !== 'wild') {
            winAmount = s1.multiplier * currentBet * 1.5;
            message = `🎉 WILD com ${s1.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🎉`;
        }
        else if (s3.name === 'wild' && s1.name === s2.name && s1.name !== 'wild') {
            winAmount = s1.multiplier * currentBet * 1.5;
            message = `🎉 WILD com ${s1.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🎉`;
        }
        else if (s1.name === 'wild' && s2.name === 'wild' && s3.name !== 'wild') {
            winAmount = s3.multiplier * currentBet * 2;
            message = `🤩 DOIS WILDS com ${s3.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🤩`;
        }
        else if (s1.name === 'wild' && s3.name === 'wild' && s2.name !== 'wild') {
            winAmount = s2.multiplier * currentBet * 2;
            message = `🤩 DOIS WILDS com ${s2.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🤩`;
        }
        else if (s2.name === 'wild' && s3.name === 'wild' && s1.name !== 'wild') {
            winAmount = s1.multiplier * currentBet * 2;
            message = `🤩 DOIS WILDS com ${s1.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🤩`;
        }
        else if (s1.name === 'wild' && s2.name === 'wild' && s3.name === 'wild') {
            winAmount = symbols.find(s => s.name === 'wild').multiplier * currentBet * 3;
            message = `👑 FORTUNE TIGER! VOCÊ GANHOU O JACKPOT DE R$ ${winAmount.toFixed(2)}! 👑`;
        }

        if (winAmount > 0) {
            balance += winAmount;
            winSound.currentTime = 0;
            winSound.play();

            if (winAmount >= (currentBet * 8) && winAmount >= 50) {
                console.log("Condições para Mega Ganho atendidas! Chamando showMegaWin(). Ganho:", winAmount.toFixed(2), "Aposta:", currentBet.toFixed(2));
                showMegaWin(winAmount);
            } else {
                console.log("Condições para Mega Ganho NÃO atendidas. Ganho:", winAmount.toFixed(2), "Aposta:", currentBet.toFixed(2), "Multiplicador de ganho:", (winAmount / currentBet).toFixed(2));
                showMessage(message);
            }
        } else {
            loseSound.currentTime = 0;
            loseSound.play();
            showMessage(message);
        }
        updateDisplay();
    }

    // --- Lógica do Bônus ---
    function startBonusRound() {
        inBonusRound = true;
        bonusSpinsLeft = 5; // 5 giros de bônus
        isFirstBonusSpin = true; // Marca o primeiro giro do bônus
        showMessage("🎉 BÔNUS ATIVADO! 🎉 Prepare-se para o Fortune Tiger!");

        stopAutoSpin(); // Desativa o auto-spin
        isTurboMode = false; // Desativa o modo turbo
        turboButton.classList.remove('active');
        turboButton.textContent = 'TURBO';

        if (mainMusic) mainMusic.pause();
        bonusMusic.currentTime = 0;
        bonusMusic.play();

        updateDisplay();
        // NÃO CHAMA performSpin AQUI. O jogador deve clicar.
    }

    function checkBonusWin(results) {
        let bonusWinAmount = 0;
        let message = `Bônus: ${bonusSpinsLeft} giros restantes...`;

        const s1 = results[0];
        const s2 = results[1];
        const s3 = results[2];

        // Após o primeiro giro, a flag é desativada
        if (isFirstBonusSpin) {
            isFirstBonusSpin = false;
        }

        // Condição de vitória do bônus: todas as 3 bobinas com o símbolo de bônus (Tigre)
        if (s1.name === bonusSymbol.name && s2.name === bonusSymbol.name && s3.name === bonusSymbol.name) {
            bonusWinAmount = currentBet * bonusMultiplier;
            message = `🏆 FORTUNE TIGER COMPLETO! Você ganhou R$ ${bonusWinAmount.toFixed(2)}! 🏆`;
            balance += bonusWinAmount;
            winSound.currentTime = 0;
            winSound.play();
            
            if (bonusWinAmount >= (currentBet * 8) && bonusWinAmount >= 50) {
                console.log("Condições para Mega Ganho (Bônus) atendidas! Chamando showMegaWin(). Ganho:", bonusWinAmount.toFixed(2), "Aposta:", currentBet.toFixed(2));
                showMegaWin(bonusWinAmount, true);
            } else {
                console.log("Condições para Mega Ganho (Bônus) NÃO atendidas. Ganho:", bonusWinAmount.toFixed(2), "Aposta:", currentBet.toFixed(2), "Multiplicador de ganho:", (bonusWinAmount / currentBet).toFixed(2));
                endBonusRound();
            }
        } else {
            loseSound.currentTime = 0;
            loseSound.play();
            bonusSpinsLeft--;
            if (bonusSpinsLeft <= 0) {
                endBonusRound();
            }
        }
        showMessage(message);
        updateDisplay();

        // Não chama performSpin automaticamente no bônus
    }

    function endBonusRound() {
        inBonusRound = false;
        bonusSpinsLeft = 0;
        showMessage("Bônus Encerrado. Boa sorte no próximo giro!");

        bonusMusic.pause();
        bonusMusic.currentTime = 0;
        if (mainMusic) mainMusic.play();
        updateDisplay();
    }

    // --- Lógica de Mega Ganho ---
    let animationInterval;
    let currentCountedAmount = 0;
    let targetMegaWinAmount = 0;
    let finishMegaWinCallback = null;

    function showMegaWin(amount, fromBonus = false) {
        isMegaWinAnimating = true;
        targetMegaWinAmount = amount;
        currentCountedAmount = 0;
        megaWinAmountDisplay.textContent = `R$ 0.00`;
        megaWinScreen.classList.add('active');

        if (mainMusic) mainMusic.pause();
        if (bonusMusic) bonusMusic.pause();
        megaWinSound.currentTime = 0;
        megaWinSound.play();

        const duration = 3000;
        const steps = 100;
        const increment = targetMegaWinAmount / steps;
        let stepCount = 0;

        if (megaWinTimeoutId) {
            clearTimeout(megaWinTimeoutId);
            megaWinTimeoutId = null;
        }

        animationInterval = setInterval(() => {
            currentCountedAmount += increment;
            stepCount++;
            if (stepCount >= steps) {
                currentCountedAmount = targetMegaWinAmount;
                clearInterval(animationInterval);
                animationInterval = null;
            }
            megaWinAmountDisplay.textContent = `R$ ${currentCountedAmount.toFixed(2)}`;
        }, duration / steps);

        megaWinScreen.addEventListener('click', skipMegaWin, { once: true });

        if (fromBonus) {
            finishMegaWinCallback = () => {
                endBonusRound();
            };
        }
        updateDisplay();
    }

    function skipMegaWin() {
        if (megaWinTimeoutId) {
            clearTimeout(megaWinTimeoutId);
            megaWinTimeoutId = null;
        }

        if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
        }
        currentCountedAmount = targetMegaWinAmount;
        megaWinAmountDisplay.textContent = `R$ ${targetMegaWinAmount.toFixed(2)}`;
        
        hideMegaWin(finishMegaWinCallback !== null); 
    }

    function hideMegaWin(wasBonusRound) {
        megaWinScreen.classList.remove('active');
        isMegaWinAnimating = false;
        megaWinSound.pause();
        megaWinSound.currentTime = 0;

        if (megaWinTimeoutId) {
            clearTimeout(megaWinTimeoutId);
            megaWinTimeoutId = null;
        }

        if (wasBonusRound && finishMegaWinCallback) {
            finishMegaWinCallback();
            finishMegaWinCallback = null;
        } else {
            if (mainMusic) mainMusic.play();
        }
        updateDisplay();
        megaWinScreen.removeEventListener('click', skipMegaWin);
    }

    // --- Event Listeners para Botões ---
    spinButton.addEventListener('click', performSpin);

    // Event listeners para os botões de aposta pré-definidos
    betButtons.forEach(button => {
        button.addEventListener('click', () => {
            buttonClickSound.currentTime = 0;
            buttonClickSound.play();
            const newBet = parseFloat(button.dataset.bet);
            if (newBet <= balance) {
                currentBet = newBet;
                updateDisplay();
            } else {
                showMessage("Saldo insuficiente para esta aposta!");
            }
        });
    });

    // --- Lógica de Turbo Mode ---
    turboButton.addEventListener('click', () => {
        buttonClickSound.currentTime = 0;
        buttonClickSound.play();
        isTurboMode = !isTurboMode;
        updateDisplay();
    });

    // --- Lógica de Auto Spin ---
    autoSpinButton.addEventListener('click', () => {
        buttonClickSound.currentTime = 0;
        buttonClickSound.play();
        if (isAutoSpin) {
            stopAutoSpin();
        } else {
            startAutoSpin();
        }
    });

    function startAutoSpin() {
        if (balance < currentBet) {
            showMessage("Saldo insuficiente para iniciar Auto Spin!");
            return;
        }
        isAutoSpin = true;
        updateDisplay();
        performSpin();
    }

    function stopAutoSpin() {
        isAutoSpin = false;
        updateDisplay();
    }

    // Acelerar giro ao tocar na tela (fora do modo turbo)
    // Adiciona o listener ao contêiner principal para capturar cliques na área do jogo
    document.querySelector('.game-container').addEventListener('click', (event
