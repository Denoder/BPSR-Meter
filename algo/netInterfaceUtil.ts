import { exec } from 'child_process';
import cap from 'cap';

// Filter virtual adapters
const VIRTUAL_KEYWORDS = ['zerotier', 'vmware', 'hyper-v', 'virtual', 'loopback', 'tap', 'bluetooth', 'wan miniport'];

function isVirtual(name: string): boolean {
    const lower = name.toLowerCase();
    return VIRTUAL_KEYWORDS.some((keyword) => lower.includes(keyword));
}

// Detect TCP traffic for 3 seconds
function detectTraffic(deviceIndex: number, devices: cap.DeviceInfo[]): Promise<number> {
    return new Promise((resolve) => {
        let count = 0;
        try {
            const c = new cap.Cap();
            const buffer = Buffer.alloc(65535);

            const cleanup = () => {
                try {
                    c.close();
                } catch (e) {
                    // Ignore cleanup errors
                }
            };

            setTimeout(() => {
                cleanup();
                resolve(count);
            }, 3000);

            const device = devices[deviceIndex];
            if (!device) {
                cleanup();
                resolve(0);
                return;
            }

            const linkType = c.open(device.name, 'ip and tcp', 1024 * 1024, buffer);
            if (linkType === 'ETHERNET') {
                if (c.setMinBytes) {
                    c.setMinBytes(0);
                }
                c.on('packet', () => count++);
            } else {
                cleanup();
                resolve(0);
            }
        } catch (e) {
            resolve(0);
        }
    });
}

async function findByRoute(devices: cap.DeviceInfo[]): Promise<number | undefined> {
    try {
        const stdout = await new Promise<string>((resolve, reject) => {
            exec('route print 0.0.0.0', (error, stdout) => {
                if (error) reject(error);
                else resolve(stdout);
            });
        });

        const defaultInterface = stdout
            .split('\n')
            .find((line) => line.trim().startsWith('0.0.0.0'))
            ?.trim()
            .split(/\s+/)[3];

        if (!defaultInterface) return undefined;

        const targetIndex = devices.findIndex((device) =>
            device.addresses.some((address) => address.addr === defaultInterface)
        );

        return targetIndex !== -1 ? targetIndex : undefined;
    } catch (error) {
        return undefined;
    }
}

async function findDefaultNetworkDevice(instancedDevices?: cap.DeviceInfo[]): Promise<number | undefined> {
    try {
        // Get all devices
        const devices = instancedDevices || cap.Cap.deviceList();

        if (!devices || devices.length === 0) {
            console.log('No network devices found');
            return undefined;
        }

        // Get physical adapters
        const physicalDevices = devices
            .map((device, index) => ({ device, index }))
            .filter(({ device }) => {
                const name = device.description || device.name || '';
                return !isVirtual(name) && device.addresses && device.addresses.length > 0;
            });

        if (physicalDevices.length === 0) {
            console.log('No physical adapters found, falling back to route table');
            return await findByRoute(devices);
        }

        // Detect traffic on physical adapters
        console.log('Detecting network traffic... (3s)');
        const results = await Promise.all(
            physicalDevices.map(async ({ device, index }) => ({
                index,
                device,
                packets: await detectTraffic(index, devices),
            }))
        );

        // Select adapter with most traffic
        const best = results
            .filter((r) => r.packets > 0)
            .sort((a, b) => b.packets - a.packets)[0];

        if (best) {
            const deviceName = best.device.description || best.device.name;
            console.log(`Using adapter with most traffic: ${best.index} - ${deviceName} (${best.packets} packets)`);
            return best.index;
        }

        // Fallback to route table
        const routeIndex = await findByRoute(devices);
        if (routeIndex !== undefined) {
            const routeDevice = devices[routeIndex];
            const routeDeviceName = routeDevice.description || routeDevice.name;

            if (isVirtual(routeDeviceName)) {
                console.log('Route table selected virtual adapter, using first physical adapter instead');
                return physicalDevices[0].index;
            }

            console.log(`Using route table selected adapter: ${routeIndex} - ${routeDeviceName}`);
            return routeIndex;
        }

        // Final fallback to first physical adapter
        console.log('No traffic detected and no route found, using first physical adapter');
        return physicalDevices[0].index;

    } catch (error) {
        console.error('Error finding default network device:', error);
        return undefined;
    }
}

export default findDefaultNetworkDevice;