document.addEventListener('DOMContentLoaded', () => {
    const reel1 = document.getElementById('reel1');
    const reel2 = document.getElementById('reel2');
    const reel3 = document.getElementById('reel3');
    const balanceValue = document.getElementById('balance-value');
    const betValue = document.getElementById('bet-value');
    const betDownButton = document.getElementById('bet-down');
    const betUpButton = document.getElementById('bet-up');
    const spinButton = document.getElementById('spin-button'); // ÚNICO BOTÃO GIRAR
    const messageDisplay = document.getElementById('message');
    const turboButton = document.getElementById('turbo-button');
    const autoSpinButton = document.getElementById('auto-spin-button');

    let balance = 100.00;
    let currentBet = 1.00;
    const minBet = 0.50;
    const maxBet = 10.00;
    const betStep = 0.50;

    // --- Configuração de Áudio ---
    const audioPath = './audio/';

    const spinSound = new Audio(audioPath + 'spin.mp3');
    const winSound = new Audio(audioPath + 'win.mp3');
    const loseSound = new Audio(audioPath + 'lose.mp3');
    const buttonClickSound = new Audio(audioPath + 'button.mp3');
    const bonusMusic = new Audio(audioPath + 'bonus_music.mp3');
    const mainMusic = new Audio(audioPath + 'main_music.mp3'); 

    // Configurações de volume
    spinSound.volume = 0.7;
    winSound.volume = 0.8;
    loseSound.volume = 0.7;
    buttonClickSound.volume = 0.5;
    bonusMusic.volume = 0.6;
    mainMusic.volume = 0.2;

    mainMusic.loop = true;
    bonusMusic.loop = true;

    // --- Variáveis do Bônus ---
    let inBonusRound = false;
    let bonusSpinsLeft = 0;
    const bonusChance = 0.05; 
    const bonusSymbol = { name: 'wild', display: '🐯', multiplier: 50 };
    const bonusMultiplier = 50; 

    // --- Variáveis de Turbo e Auto-Spin ---
    let isTurboMode = false;
    let isAutoSpin = false;
    let autoSpinIntervalId = null;
    let spinDuration = 3040; 
    let turboSpinDuration = 1000; 

    // Símbolos
    const symbols = [
        { name: 'cherry', display: '🍒', multiplier: 2 },
        { name: 'bell', display: '🔔', multiplier: 5 },
        { name: 'bar', display: '💲', multiplier: 10 },
        { name: 'seven', display: '7️⃣', multiplier: 20 },
        { name: 'wild', display: '🐯', multiplier: 50 }
    ];

    // Atualiza a exibição de saldo e aposta e estado dos botões
    function updateDisplay() {
        balanceValue.textContent = balance.toFixed(2);
        betValue.textContent = currentBet.toFixed(2);

        const disableAllControls = inBonusRound || isAutoSpin;

        spinButton.disabled = disableAllControls || balance < currentBet;
        betDownButton.disabled = disableAllControls;
        betUpButton.disabled = disableAllControls;

        // Botões Turbo e Auto não devem ser desabilitados pelo auto-spin ou bônus, apenas controlados
        // Eles são desabilitados apenas durante o bônus para evitar mudanças de modo no meio
        turboButton.disabled = inBonusRound;
        autoSpinButton.disabled = inBonusRound;


        // Atualiza classe 'active' e texto para botões de turbo/auto
        if (isTurboMode) {
            turboButton.classList.add('active');
            turboButton.textContent = 'TURBO ATIVO'; // Texto no botão
        } else {
            turboButton.classList.remove('active');
            turboButton.textContent = 'TURBO'; // Texto no botão
        }
        if (isAutoSpin) {
            autoSpinButton.classList.add('active');
            autoSpinButton.textContent = 'AUTO ATIVO'; // Texto no botão
        } else {
            autoSpinButton.classList.remove('active');
            autoSpinButton.textContent = 'AUTO'; // Texto no botão
        }
    }

    function renderSymbol(reelElement, symbolObj) {
        reelElement.innerHTML = `<div class="symbol symbol-${symbolObj.name}">${symbolObj.display}</div>`;
    }

    function getRandomSymbol() {
        if (inBonusRound) {
            return Math.random() < 0.9 ? bonusSymbol : { name: 'empty', display: ' ', multiplier: 0 };
        }
        return symbols[Math.floor(Math.random() * symbols.length)];
    }

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

        updateDisplay(); // Atualiza display e estado dos botões
        showMessage(inBonusRound ? `Bônus: ${bonusSpinsLeft} giros restantes...` : "Girando...");

        spinButton.disabled = true; // Desabilita o botão enquanto gira

        spinSound.currentTime = 0;
        spinSound.play();

        const results = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];

        let spinCount = 0;
        const currentSpinDuration = isTurboMode ? turboSpinDuration : spinDuration;
        const intervalStep = 80;
        const maxSpins = Math.floor(currentSpinDuration / intervalStep); 

        const spinInterval = setInterval(() => {
            renderSymbol(reel1, getRandomSymbol());
            renderSymbol(reel2, getRandomSymbol());
            renderSymbol(reel3, getRandomSymbol());
            spinCount++;

            if (spinCount > maxSpins) {
                clearInterval(spinInterval);
                renderSymbol(reel1, results[0]);
                renderSymbol(reel2, results[1]);
                renderSymbol(reel3, results[2]);

                if (inBonusRound) {
                    checkBonusWin(results);
                } else {
                    checkWin(results);
                    if (Math.random() < bonusChance) {
                        startBonusRound();
                    }
                }
                spinButton.disabled = false; 
                if (!inBonusRound && mainMusic) mainMusic.play(); 

                if (isAutoSpin && !inBonusRound) {
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

        if (s1.name === s2.name && s2.name === s3.name) {
            winAmount = s1.multiplier * currentBet;
            message = `🎉 TRIO DE ${s1.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🎉`;
        }
        else if (s1.name === 'wild' && s2.name === s3.name) {
            winAmount = s2.multiplier * currentBet * 1.5;
            message = `🎉 WILD com ${s2.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🎉`;
        }
        else if (s2.name === 'wild' && s1.name === s3.name) {
            winAmount = s1.multiplier * currentBet * 1.5;
            message = `🎉 WILD com ${s1.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🎉`;
        }
        else if (s3.name === 'wild' && s1.name === s2.name) {
            winAmount = s1.multiplier * currentBet * 1.5;
            message = `🎉 WILD com ${s1.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🎉`;
        }
        else if (s1.name === 'wild' && s2.name === 'wild') {
            winAmount = s3.multiplier * currentBet * 2;
            message = `🤩 DOIS WILDS com ${s3.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🤩`;
        }
        else if (s1.name === 'wild' && s3.name === 'wild') {
            winAmount = s2.multiplier * currentBet * 2;
            message = `🤩 DOIS WILDS com ${s2.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🤩`;
        }
        else if (s2.name === 'wild' && s3.name === 'wild') {
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
        } else {
            loseSound.currentTime = 0;
            loseSound.play();
        }
        showMessage(message);
        updateDisplay();
    }

    // --- Lógica do Bônus ---
    function startBonusRound() {
        inBonusRound = true;
        bonusSpinsLeft = 5; // 5 giros de bônus
        showMessage("🎉 BÔNUS ATIVADO! 🎉 Prepare-se para o Fortune Tiger!");

        stopAutoSpin(); // Para auto-spin ao entrar no bônus

        if (mainMusic) mainMusic.pause();
        bonusMusic.currentTime = 0;
        bonusMusic.play();

        updateDisplay();
    }

    function checkBonusWin(results) {
        let bonusWinAmount = 0;
        let message = `Bônus: ${bonusSpinsLeft} giros restantes...`;

        const s1 = results[0];
        const s2 = results[1];
        const s3 = results[2];

        if (s1.name === bonusSymbol.name && s2.name === bonusSymbol.name && s3.name === bonusSymbol.name) {
            bonusWinAmount = currentBet * bonusMultiplier;
            message = `🏆 FORTUNE TIGER COMPLETO! Você ganhou R$ ${bonusWinAmount.toFixed(2)}! 🏆`;
            balance += bonusWinAmount;
            winSound.currentTime = 0;
            winSound.play();
            endBonusRound(); // Termina o bônus imediatamente se ganhar
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

        if (inBonusRound && bonusSpinsLeft > 0) {
            setTimeout(performSpin, 500);
        }
    }

    function endBonusRound() {
        inBonusRound = false;
        bonusSpinsLeft = 0;
        showMessage("Bônus Encerrado. Boa sorte no próximo giro!");

        bonusMusic.pause();
        if (mainMusic) mainMusic.play();
        updateDisplay();
    }

    // --- Event Listeners para Botões ---
    spinButton.addEventListener('click', performSpin); // Chama a função performSpin

    betDownButton.addEventListener('click', () => {
        buttonClickSound.currentTime = 0;
        buttonClickSound.play();
        if (currentBet > minBet) {
            currentBet = Math.max(minBet, currentBet - betStep);
            updateDisplay();
        }
    });

    betUpButton.addEventListener('click', () => {
        buttonClickSound.currentTime = 0;
        buttonClickSound.play();
        if (currentBet < maxBet) {
            currentBet = Math.min(maxBet, currentBet + betStep);
            updateDisplay();
        }
    });

    // --- Lógica de Turbo Mode ---
    turboButton.addEventListener('click', () => {
        buttonClickSound.currentTime = 0;
        buttonClickSound.play();
        isTurboMode = !isTurboMode; // Alterna o modo turbo
        // A mensagem "Modo TURBO ativado/desativado" agora será exibida no próprio botão via updateDisplay()
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
        // A mensagem "Auto Spin ativado" agora será exibida no próprio botão via updateDisplay()
        updateDisplay();
        performSpin(); // Inicia o primeiro giro automático
    }

    function stopAutoSpin() {
        isAutoSpin = false;
        // A mensagem "Auto Spin desativado" agora será exibida no próprio botão via updateDisplay()
        updateDisplay();
    }

    // Exibe mensagens temporárias (agora mais para mensagens de jogo, não status de modo)
    function showMessage(msg) {
        messageDisplay.textContent = msg;
    }

    // --- Inicialização do Jogo ---
    playMainMusic();

    renderSymbol(reel1, getRandomSymbol());
    renderSymbol(reel2, getRandomSymbol());
    renderSymbol(reel3, getRandomSymbol());
    updateDisplay(); // Garante que o estado inicial dos botões esteja correto
});
