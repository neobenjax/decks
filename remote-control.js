(function() {
    // 1. Load Dependencies
    const loadScript = (src) => new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });

    const initRemoteControl = () => {
        // 2. Setup PeerJS
        const sessionId = Math.random().toString(36).substring(2, 9);
        const peer = new Peer(sessionId);
        let activeConnection = null;

        console.log("Remote Control: Session ID is", sessionId);

        peer.on('open', (id) => {
            console.log('Remote Control: Peer connected to server with ID:', id);
        });

        peer.on('connection', (conn) => {
            console.log("Remote Control: Client connected!");
            activeConnection = conn;
            
            // Send initial state immediately when connected
            broadcastState();

            conn.on('data', (data) => {
                if (data && data.command) {
                    if (data.command === 'next') {
                        if (window.presentation) window.presentation.nextSlide();
                    } else if (data.command === 'prev') {
                        if (window.presentation) window.presentation.prevSlide();
                    }
                }
            });

            conn.on('close', () => {
                console.log("Remote Control: Client disconnected.");
                activeConnection = null;
            });
        });

        const broadcastState = () => {
            if (activeConnection && window.presentation && window.presentation.slides) {
                const current = window.presentation.currentSlide + 1;
                const total = window.presentation.slides.length;
                activeConnection.send({ type: 'state', current, total });
            }
        };

        // 3. Monkey Patch presentation object once it's available
        const patchPresentation = () => {
            if (window.presentation && window.presentation.showSlide) {
                const originalShowSlide = window.presentation.showSlide;
                window.presentation.showSlide = function(index) {
                    originalShowSlide.call(window.presentation, index);
                    broadcastState();
                };
            } else {
                // If presentation isn't loaded yet, try again in 500ms
                setTimeout(patchPresentation, 500);
            }
        };
        patchPresentation();

        // 4. Build UI
        const style = document.createElement('style');
        style.innerHTML = `
            #remote-control-btn {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #5EDCF4;
                color: #0A0E27;
                border: none;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                font-size: 24px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(94, 220, 244, 0.4);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.2s, box-shadow 0.2s;
                font-family: 'Segoe UI Emoji', sans-serif;
            }
            #remote-control-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 16px rgba(94, 220, 244, 0.6);
            }
            #remote-control-modal {
                position: fixed;
                bottom: 80px;
                right: 20px;
                background: #0F1B3D;
                border: 1px solid #5EDCF4;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 8px 32px rgba(10, 14, 39, 0.8);
                z-index: 10000;
                display: none;
                flex-direction: column;
                align-items: center;
                color: #fff;
                font-family: sans-serif;
            }
            #remote-control-modal.visible {
                display: flex;
            }
            #qrcode {
                margin: 15px 0;
                background: white;
                padding: 10px;
                border-radius: 8px;
            }
            .remote-title {
                font-size: 16px;
                font-weight: bold;
                color: #5EDCF4;
                margin: 0 0 5px 0;
            }
            .remote-instruction {
                font-size: 12px;
                color: #E2D5F2;
                margin: 0;
                text-align: center;
            }
            .remote-url {
                font-size: 10px;
                color: rgba(255, 255, 255, 0.5);
                margin: 5px 0 0 0;
                max-width: 150px;
                word-break: break-all;
                text-align: center;
            }
        `;
        document.head.appendChild(style);

        const btn = document.createElement('button');
        btn.id = 'remote-control-btn';
        btn.innerHTML = '📱';
        btn.title = "Remote Control";
        document.body.appendChild(btn);

        const modal = document.createElement('div');
        modal.id = 'remote-control-modal';
        
        const title = document.createElement('p');
        title.className = 'remote-title';
        title.innerText = 'Remote Control';
        
        const instruction = document.createElement('p');
        instruction.className = 'remote-instruction';
        instruction.innerText = 'Scan to control presentation';

        const qrContainer = document.createElement('div');
        qrContainer.id = 'qrcode';

        const remoteUrlText = document.createElement('p');
        remoteUrlText.className = 'remote-url';

        modal.appendChild(title);
        modal.appendChild(instruction);
        modal.appendChild(qrContainer);
        modal.appendChild(remoteUrlText);
        document.body.appendChild(modal);

        // Render QR Code
        // Format URL: https://decks-six-pi.vercel.app/remote.html?id=xxx
        let remoteUrl = window.location.origin;
        // Handle trailing slash if present
        if (remoteUrl.endsWith('/')) {
            remoteUrl = remoteUrl.slice(0, -1);
        }
        remoteUrl = remoteUrl + '/remote.html?id=' + sessionId;
        
        remoteUrlText.innerText = remoteUrl;

        new QRCode(qrContainer, {
            text: remoteUrl,
            width: 150,
            height: 150,
            colorDark : "#0A0E27",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });

        // Toggle Modal
        btn.addEventListener('click', () => {
            modal.classList.toggle('visible');
        });
    };

    Promise.all([
        loadScript('https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js')
    ]).then(() => {
        initRemoteControl();
    }).catch(err => {
        console.error("Failed to load remote control dependencies", err);
    });

})();
