// Bluetooth UART Service UUIDs
const UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const UART_TX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

let bluetoothDevice = null;
let txCharacteristic = null;

const connectBtn = document.getElementById('connect-btn');
const connectBtnText = document.getElementById('connect-btn-text');
const statusText = document.getElementById('status-text');
const statusPanel = document.getElementById('status');
const deviceInfo = document.getElementById('device-info');

// UI Elements
const buttons = {
    'btn-up': 'F',
    'btn-down': 'B',
    'btn-left': 'L',
    'btn-right': 'R'
};

connectBtn.addEventListener('click', async () => {
    if (bluetoothDevice && bluetoothDevice.gatt.connected) {
        disconnect();
    } else {
        await connect();
    }
});

async function connect() {
    try {
        console.log('Requesting Bluetooth Device...');
        statusText.innerText = "SCANNING...";

        bluetoothDevice = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: 'ESP32' }, { services: [UART_SERVICE_UUID] }],
            optionalServices: [UART_SERVICE_UUID]
        });

        bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);

        console.log('Connecting to GATT Server...');
        statusText.innerText = "CONNECTING...";
        const server = await bluetoothDevice.gatt.connect();

        console.log('Getting UART Service...');
        const service = await server.getPrimaryService(UART_SERVICE_UUID);

        console.log('Getting TX Characteristic...');
        txCharacteristic = await service.getCharacteristic(UART_TX_CHARACTERISTIC_UUID);

        setConnected(true);
        deviceInfo.innerText = `Connected to: ${bluetoothDevice.name}`;
        console.log('Connected!');

    } catch (error) {
        console.error('Argh! ' + error);
        statusText.innerText = "ERROR";
        setTimeout(() => {
            if (!bluetoothDevice || !bluetoothDevice.gatt.connected) {
                setConnected(false);
            }
        }, 2000);
    }
}

function disconnect() {
    if (!bluetoothDevice) return;
    if (bluetoothDevice.gatt.connected) {
        bluetoothDevice.gatt.disconnect();
    }
}

function onDisconnected() {
    console.log('Disconnected');
    setConnected(false);
    deviceInfo.innerText = '';
}

function setConnected(connected) {
    if (connected) {
        statusText.innerText = "CONNECTED";
        statusPanel.classList.add('connected');
        connectBtn.classList.add('connected');
        connectBtnText.innerText = "DISCONNECT";
    } else {
        statusText.innerText = "DISCONNECTED";
        statusPanel.classList.remove('connected');
        connectBtn.classList.remove('connected');
        connectBtnText.innerText = "SCAN DEVICES";
    }
}

async function sendCommand(command) {
    if (!txCharacteristic) return;
    try {
        const encoder = new TextEncoder();
        await txCharacteristic.writeValue(encoder.encode(command));
        console.log('Sent: ' + command);
    } catch (error) {
        console.error('Send Error: ', error);
    }
}

// Setup Control Buttons
Object.keys(buttons).forEach(id => {
    const btn = document.getElementById(id);
    const cmd = buttons[id];

    const startAction = (e) => {
        e.preventDefault();
        btn.classList.add('active');
        sendCommand(cmd);
    };

    const stopAction = (e) => {
        e.preventDefault();
        btn.classList.remove('active');
        sendCommand('S'); // Stop
    };

    // Touch events for mobile
    btn.addEventListener('touchstart', startAction);
    btn.addEventListener('touchend', stopAction);

    // Mouse events for testing on desktop
    btn.addEventListener('mousedown', startAction);
    btn.addEventListener('mouseup', stopAction);
    btn.addEventListener('mouseleave', stopAction);
});

// Prevent long-press context menu on buttons
window.oncontextmenu = function (event) {
};

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed', err));
    });
}
