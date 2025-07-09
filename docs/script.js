document.addEventListener('DOMContentLoaded', () => {
    console.log("Script loaded and DOM content loaded!"); // Log de verificação inicial

    const reel1 = document.getElementById('reel1');
    const reel2 = document.getElementById('reel2');
    const reel3 = document.getElementById('reel3');
    const balanceValue = document.getElementById('balance-value');
    const betValueDisplayInGameInfo = document.getElementById('bet-value');
    const spinButton = document.getElementById('spin-button');
    const messageDisplay = document.getElementById('message');
    const turboButton = document.getElementById('turbo-button');
    const autoSpinButton = document.getElementById('auto-spin-button');
    const betButtons = document.querySelectorAll('.bet-button');
    const versionNumberDisplay = document.getElementById('version-number');

    // Elementos da tela de Mega Ganho
    const megaWinScreen = document.getElementById('mega-win-screen');
    const megaWinAmountDisplay = document.getElementById('mega-win-amount');
    
    // --- Variáveis do Jogo ---
    let balance = 100.00;
    let currentBet = 1.00;
    const minBet = 1.00;
    const maxBet = 400.00;
    const VERSION = "0.0.0.1";

    // --- Configuração de Áudio ---
    const audioPath = './audio/';

    // Certifique-se de que os arquivos de áudio existem e os caminhos estão corretos
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
    const scatterSymbol = { name: 'coin', display: '💰', multiplier: 0 };
    const bonusSymbol = { name: 'wild', display: '🐯', multiplier: 50 };
    const bonusMultiplier = 50;
    let isFirstBonusSpin = false;

    // --- Variáveis de Turbo e Auto-Spin ---
    let isTurboMode = false;
    let isAutoSpin = false;
    let spinDuration = 3040;
    let turboSpinDuration = 1000;
    let isMegaWinAnimating = false;
    let megaWinTimeoutId = null;
    let currentSpinInterval = null;

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
            case 'cherry': weight = 8; break;
            case 'bell': weight = 7; break;
            case 'bar': weight = 5; break;
            case 'seven': weight = 3; break;
            case 'wild': weight = 2; break;
            case 'coin': weight = 4; break;
            default: weight = 1;
        }
        for (let i = 0; i < weight; i++) {
            weightedSymbols.push(symbol);
        }
    });

    // Atualiza a exibição de saldo e aposta e estado dos botões
    function updateDisplay() {
        console.log("Updating display. Current Balance:", balance.toFixed(2), "Current Bet:", currentBet.toFixed(2));
        balanceValue.textContent = balance.toFixed(2);
        betValueDisplayInGameInfo.textContent = currentBet.toFixed(2); 
        
        const disableAllControls = inBonusRound || isAutoSpin || isMegaWinAnimating;

        spinButton.disabled = disableAllControls || balance < currentBet;
        
        betButtons.forEach(button => {
            const betAmount = parseFloat(button.dataset.bet);
            button.disabled = disableAllControls || betAmount > balance;
            if (betAmount === currentBet) {
                button.classList.add('active-bet');
            } else {
                button.classList.remove('active-bet');
            }
        });
        
        turboButton.disabled = disableAllControls;
        autoSpinButton.disabled = disableAllControls;

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

        versionNumberDisplay.textContent = VERSION;
    }

    // Renderiza um símbolo na bobina
    function renderSymbol(reelElement, symbolObj, animating = false) {
        reelElement.innerHTML = `<div class="symbol symbol-${symbolObj.name}">${symbolObj.display}</div>`;
        const symbolDiv = reelElement.querySelector('.symbol');
        if (animating) {
            symbolDiv.classList.add('animating');
        } else {
            symbolDiv.classList.remove('animating');
        }
    }

    // Seleciona um símbolo aleatório
    function getRandomSymbol(isBonusRoundSpin = false) {
        if (isBonusRoundSpin) {
            if (isFirstBonusSpin) {
                return Math.random() < 0.1 ? bonusSymbol : { name: 'empty', display: ' ', multiplier: 0 };
            } else {
                return Math.random() < 0.9 ? bonusSymbol : { name: 'empty', display: ' ', multiplier: 0 };
            }
        }
        return weightedSymbols[Math.floor(Math.random() * weightedSymbols.length)];
    }

    // Toca a música principal
    function playMainMusic() {
        mainMusic.currentTime = 0;
        mainMusic.play().catch(e => console.log("Música principal não pôde tocar automaticamente:", e));
    }

    // Função principal de giro
    function performSpin() {
        console.log("Performing spin. In bonus round:", inBonusRound, "Balance:", balance);
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
            getRandomSymbol(inBonusRound),
            getRandomSymbol(inBonusRound),
            getRandomSymbol(inBonusRound)
        ];

        let spinCount = 0;
        const currentSpinDuration = isTurboMode ? turboSpinDuration : spinDuration;
        const intervalStep = 80;
        const maxSpins = Math.floor(currentSpinDuration / intervalStep); 

        currentSpinInterval = setInterval(() => {
            renderSymbol(reel1, getRandomSymbol(inBonusRound), true);
            renderSymbol(reel2, getRandomSymbol(inBonusRound), true);
            renderSymbol(reel3, getRandomSymbol(inBonusRound), true);
            spinCount++;

            if (spinCount > maxSpins) {
                clearInterval(currentSpinInterval);
                currentSpinInterval = null;
                renderSymbol(reel1, results[0], false);
                renderSymbol(reel2, results[1], false);
                renderSymbol(reel3, results[2], false);
                
                if (inBonusRound) {
                    checkBonusWin(results);
                } else {
                    checkWin(results);
                }

                if (!isMegaWinAnimating) { 
                    spinButton.disabled = false; 
                }
                if (!inBonusRound && mainMusic) mainMusic.play(); 

                if (isAutoSpin && !inBonusRound && !isMegaWinAnimating) {
                    setTimeout(performSpin, 500); 
                }
            }
        }, intervalStep);
    }

    // Lógica de verificação de vitória (giro normal)
    function checkWin(results) {
        console.log("Checking win. Results:", results.map(s => s.display).join(' '));
        let winAmount = 0;
        let message = "Não foi desta vez!";

        const s1 = results[0];
        const s2 = results[1];
        const s3 = results[2];

        const scatterCount = results.filter(s => s.name === scatterSymbol.name).length;
        if (scatterCount === 3) {
            startBonusRound();
            return;
        }

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
                console.log("Condições para Mega Ganho atendidas! Ganho:", winAmount.toFixed(2));
                showMegaWin(winAmount);
            } else {
                console.log("Condições para Mega Ganho NÃO atendidas. Ganho:", winAmount.toFixed(2));
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
        console.log("Starting bonus round!");
        inBonusRound = true;
        bonusSpinsLeft = 5;
        isFirstBonusSpin = true;
        showMessage("🎉 BÔNUS ATIVADO! 🎉 Prepare-se para o Fortune Tiger!");

        stopAutoSpin();
        isTurboMode = false;
        turboButton.classList.remove('active');
        turboButton.textContent = 'TURBO';

        if (mainMusic) mainMusic.pause();
        bonusMusic.currentTime = 0;
        bonusMusic.play();

        updateDisplay();
    }

    function checkBonusWin(results) {
        console.log("Checking bonus win. Spins left:", bonusSpinsLeft, "Results:", results.map(s => s.display).join(' '));
        let bonusWinAmount = 0;
        let message = `Bônus: ${bonusSpinsLeft} giros restantes...`;

        const s1 = results[0];
        const s2 = results[1];
        const s3 = results[2];

        if (isFirstBonusSpin) {
            isFirstBonusSpin = false;
        }

        if (s1.name === bonusSymbol.name && s2.name === bonusSymbol.name && s3.name === bonusSymbol.name) {
            bonusWinAmount = currentBet * bonusMultiplier;
            message = `🏆 FORTUNE TIGER COMPLETO! Você ganhou R$ ${bonusWinAmount.toFixed(2)}! 🏆`;
            balance += bonusWinAmount;
            winSound.currentTime = 0;
            winSound.play();
            
            if (bonusWinAmount >= (currentBet * 8) && bonusWinAmount >= 50) {
                console.log("Condições para Mega Ganho (Bônus) atendidas! Ganho:", bonusWinAmount.toFixed(2));
                showMegaWin(bonusWinAmount, true);
            } else {
                console.log("Condições para Mega Ganho (Bônus) NÃO atendidas. Ganho:", bonusWinAmount.toFixed(2));
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
    }

    function endBonusRound() {
        console.log("Ending bonus round.");
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
        console.log("Showing Mega Win screen. Amount:", amount);
        isMegaWinAnimating = true;
        targetMegaWinAmount = amount;
        currentCountedAmount = 0;
        megaWinAmountDisplay.textContent = `R$ 0.00`;
        megaWinScreen.classList.add('active'); // Ativa a tela de Mega Ganho

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
        console.log("Skipping Mega Win animation.");
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
        console.log("Hiding Mega Win screen.");
        megaWinScreen.classList.remove('active'); // Desativa a tela de Mega Ganho
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
    spinButton.addEventListener('click', () => {
        console.log("Spin button clicked.");
        performSpin();
    });

    betButtons.forEach(button => {
        button.addEventListener('click', () => {
            console.log("Bet button clicked:", button.dataset.bet);
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

    turboButton.addEventListener('click', () => {
        console.log("Turbo button clicked. Current turbo mode:", isTurboMode);
        buttonClickSound.currentTime = 0;
        buttonClickSound.play();
        isTurboMode = !isTurboMode;
        updateDisplay();
    });

    autoSpinButton.addEventListener('click', () => {
        console.log("Auto Spin button clicked. Current auto spin mode:", isAutoSpin);
        buttonClickSound.currentTime = 0;
        buttonClickSound.play();
        if (isAutoSpin) {
            stopAutoSpin();
        } else {
            startAutoSpin();
        }
    });

    function startAutoSpin() {
        console.log("Starting Auto Spin.");
        if (balance < currentBet) {
            showMessage("Saldo insuficiente para iniciar Auto Spin!");
            return;
        }
        isAutoSpin = true;
        updateDisplay();
        performSpin();
    }

    function stopAutoSpin() {
        console.log("Stopping Auto Spin.");
        isAutoSpin = false;
        updateDisplay();
    }

    // Acelerar giro ao tocar na tela (fora do modo turbo)
    document.querySelector('.game-container').addEventListener('click', (event) => {
        const clickedElement = event.target;
        const isControlButton = clickedElement.closest('.controls') || clickedElement.closest('#mega-win-screen');
        
        if (currentSpinInterval && !isTurboMode && !isControlButton) {
            console.log("Screen clicked to accelerate spin.");
            clearInterval(currentSpinInterval);
            currentSpinInterval = null;
            
            const reels = [reel1, reel2, reel3];
            const finalResults = reels.map(() => {
                return getRandomSymbol(inBonusRound);
            });
            
            renderSymbol(reel1, finalResults[0], false);
            renderSymbol(reel2, finalResults[1], false);
            renderSymbol(reel3, finalResults[2], false);

            if (inBonusRound) {
                checkBonusWin(finalResults);
            } else {
                checkWin(finalResults);
            }

            if (!isMegaWinAnimating) { 
                spinButton.disabled = false; 
            }
            if (!inBo
