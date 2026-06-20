/**
 * Web Bluetooth API ESC/POS Thermal Printer Utility
 * Resolves connection and outputs raw text buffers to generic Bluetooth LE printers.
 */

// Declare Web Bluetooth interfaces for TypeScript compilation
declare global {
  interface BluetoothDevice {
    id: string;
    name?: string;
    gatt?: BluetoothRemoteGATTServer;
  }

  interface BluetoothRemoteGATTServer {
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: string | number): Promise<BluetoothRemoteGATTService>;
    getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
  }

  interface BluetoothRemoteGATTService {
    getCharacteristic(characteristic: string | number): Promise<BluetoothRemoteGATTCharacteristic>;
    getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
  }

  interface BluetoothRemoteGATTCharacteristic {
    uuid: string;
    properties: {
      write: boolean;
      writeWithoutResponse: boolean;
      notify: boolean;
      read: boolean;
    };
    writeValueWithResponse(value: ArrayBuffer | ArrayBufferView): Promise<void>;
    writeValueWithoutResponse(value: ArrayBuffer | ArrayBufferView): Promise<void>;
  }

  interface Navigator {
    bluetooth?: {
      requestDevice(options: any): Promise<BluetoothDevice>;
    };
  }
}

// Popular BLE Printer GATT Service & Characteristic UUIDs
const BLE_PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // General BLE Printer Service
  '0000e7e1-0000-1000-8000-00805f9b34fb', // custom printer service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // ISSC custom profile
];

const BLE_PRINTER_CHARACTERISTIC_UUIDS = [
  '00002af1-0000-1000-8000-00805f9b34fb', // General BLE Printer Write Char
  '0000af30-0000-1000-8000-00805f9b34fb', // custom write char
  '49535343-5b35-4d05-9e77-90f6580f088a'  // ISSC write char
];

// Reference to keep connection active
let activeGattServer: BluetoothRemoteGATTServer | null = null;
let activeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
let activeDevice: BluetoothDevice | null = null;

export interface PrinterConnectionStatus {
  step: 'idle' | 'scanning' | 'connecting' | 'finding_service' | 'sending' | 'success' | 'error';
  message: string;
}

/**
 * Scan, pair, and connect to a Web Bluetooth ESC/POS printer.
 */
export async function connectBluetoothPrinter(
  onStatusChange?: (status: PrinterConnectionStatus) => void
): Promise<BluetoothRemoteGATTCharacteristic> {
  const updateStatus = (step: PrinterConnectionStatus['step'], message: string) => {
    console.log(`[BluetoothPrinter] ${step}: ${message}`);
    if (onStatusChange) onStatusChange({ step, message });
  };

  // Check Web Bluetooth API availability
  if (typeof window !== 'undefined' && !navigator.bluetooth) {
    throw new Error('Web Bluetooth is not supported on this browser/device. Ensure you are using Chrome/Edge/Bluefy and running over HTTPS.');
  }

  try {
    updateStatus('scanning', 'Requesting Bluetooth printer devices...');
    
    // Request Bluetooth Device
    const device = await navigator.bluetooth!.requestDevice({
      filters: [
        { namePrefix: 'Printer' },
        { namePrefix: 'MTP' },
        { namePrefix: 'RP' },
        { namePrefix: 'XP' },
        { namePrefix: 'PT' },
        { namePrefix: 'EP' },
        { namePrefix: 'QS' },
        { namePrefix: 'SP' }
      ],
      optionalServices: [
        ...BLE_PRINTER_SERVICE_UUIDS,
        '000018f0-0000-1000-8000-00805f9b34fb',
        '00001101-0000-1000-8000-00805f9b34fb' // SPP UUID
      ]
    });

    activeDevice = device;
    updateStatus('connecting', `Connecting to GATT server on ${device.name || 'Printer'}...`);

    const server = await device.gatt?.connect();
    if (!server) throw new Error('Failed to establish GATT server connection.');
    activeGattServer = server;

    updateStatus('finding_service', 'Locating primary printing service...');
    
    // Find service and characteristic
    let characteristic: BluetoothRemoteGATTCharacteristic | null = null;

    // Try popular service UUIDs
    for (const serviceUuid of BLE_PRINTER_SERVICE_UUIDS) {
      try {
        const service = await server.getPrimaryService(serviceUuid);
        const characteristics = await service.getCharacteristics();
        
        // Find write characteristic
        const writeChar = characteristics.find(
          c => c.properties.write || c.properties.writeWithoutResponse
        );
        if (writeChar) {
          characteristic = writeChar;
          break;
        }
      } catch (e) {
        // Continue to next UUID fallback
        console.warn(`Service ${serviceUuid} not found on printer, checking fallback...`);
      }
    }

    // Ultimate fallback: Query all services and find any writable characteristic
    if (!characteristic) {
      updateStatus('finding_service', 'Checking generic services fallback...');
      const services = await server.getPrimaryServices();
      for (const service of services) {
        const chars = await service.getCharacteristics();
        const writeChar = chars.find(
          c => c.properties.write || c.properties.writeWithoutResponse
        );
        if (writeChar) {
          characteristic = writeChar;
          break;
        }
      }
    }

    if (!characteristic) {
      throw new Error('Primary printing write characteristic could not be located.');
    }

    activeCharacteristic = characteristic;
    updateStatus('success', 'Connected to printer successfully!');
    return characteristic;
  } catch (err: any) {
    updateStatus('error', err.message || 'Bluetooth connection failed.');
    throw err;
  }
}

/**
 * Print a receipt string using Web Bluetooth.
 */
export async function printReceiptBluetooth(
  receiptText: string,
  onStatusChange?: (status: PrinterConnectionStatus) => void
): Promise<void> {
  const updateStatus = (step: PrinterConnectionStatus['step'], message: string) => {
    if (onStatusChange) onStatusChange({ step, message });
  };

  try {
    let char = activeCharacteristic;
    
    // Re-connect if connection is dead
    if (!char || !activeGattServer?.connected) {
      char = await connectBluetoothPrinter(onStatusChange);
    }

    updateStatus('sending', 'Preparing ESC/POS print buffer...');

    // ESC/POS Initialization Commands:
    // ESC @ (Initialize printer): 0x1B, 0x40
    // ESC d 3 (Feed 3 lines): 0x1B, 0x64, 0x03
    // GS V 66 0 (Cut paper): 0x1D, 0x56, 0x42, 0x00
    const ESC_INIT = new Uint8Array([0x1B, 0x40]);
    const ESC_FEED = new Uint8Array([0x1B, 0x64, 0x03]);
    const ESC_CUT = new Uint8Array([0x1D, 0x56, 0x42, 0x00]);

    // Encode text
    const encoder = new TextEncoder();
    const textBytes = encoder.encode(receiptText);

    // Merge into single buffer
    const buffer = new Uint8Array(ESC_INIT.length + textBytes.length + ESC_FEED.length + ESC_CUT.length);
    buffer.set(ESC_INIT, 0);
    buffer.set(textBytes, ESC_INIT.length);
    buffer.set(ESC_FEED, ESC_INIT.length + textBytes.length);
    buffer.set(ESC_CUT, ESC_INIT.length + textBytes.length + ESC_FEED.length);

    // Split into chunks to prevent buffer overflow on cheap printer GATT controllers
    // Safe chunk size is 20 bytes (standard BLE MTU attribute size)
    const CHUNK_SIZE = 20;
    let offset = 0;

    while (offset < buffer.length) {
      const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
      
      // Write to characteristic
      if (char.properties.writeWithoutResponse) {
        await char.writeValueWithoutResponse(chunk);
      } else {
        await char.writeValueWithResponse(chunk);
      }

      offset += CHUNK_SIZE;
      
      // Tiny delay to allow printer UART queue to clear
      await new Promise(resolve => setTimeout(resolve, 15));
    }

    updateStatus('success', 'Print completed successfully!');
  } catch (err: any) {
    updateStatus('error', err.message || 'Printing failed.');
    throw err;
  }
}

/**
 * Disconnect current active printer.
 */
export function disconnectBluetoothPrinter(): void {
  if (activeDevice && activeDevice.gatt?.connected) {
    activeDevice.gatt.disconnect();
  }
  activeGattServer = null;
  activeCharacteristic = null;
  activeDevice = null;
}
