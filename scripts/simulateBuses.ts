/**
 * Multiple Bus Simulation Script
 * Simulates 18 buses pushing GPS data to the API concurrently.
 */

const SERVER_URL = 'http://localhost:3000';
const UPDATE_INTERVAL = 5000; // 5 seconds

/**
 * Replace the values in this object with your actual bus credentials.
 */
const BUS_CREDENTIALS = [
  {
    "busId": "wbx_bus_f5f4ee241d17",
    "apiKey": "wbx_sk_8ae2ab085eb76ec4babfca4937ff144cc3509841e8493779de65abde866af82f"
  },
  {
    "busId": "wbx_bus_952de936db9c",
    "apiKey": "wbx_sk_51b11dc4b48771493657176f97d0fb5c6f736fcfba8189d213042d51d9d663b2"
  },
  {
    "busId": "wbx_bus_78fa1dd3c53f",
    "apiKey": "wbx_sk_b8bcb52e57f0243683f1c04e5723eeb6ba57961125f748086b314e6a1d7a605b"
  },
  {
    "busId": "wbx_bus_d590a8979cac",
    "apiKey": "wbx_sk_d4c705a4ba88545037ac719c6aedc2c302889c50de2604074bb815b33baeb1e2"
  },
  {
    "busId": "wbx_bus_cb09ed25732b",
    "apiKey": "wbx_sk_87f78c5e741ab380b426fa483b8e4e89835bca4f0c55cf6cf14467e95d117063"
  },
  {
    "busId": "wbx_bus_c0225acb0aef",
    "apiKey": "wbx_sk_65fc62ba3ed8af4f9d15b1bce83897169b1da0c12274afbece360a8d7c5d9d9e"
  },
  {
    "busId": "wbx_bus_6ba7ae6bbd34",
    "apiKey": "wbx_sk_5eba50e5ef49b72ccc47226b4203c11d12a4f7fb4fa1fd088daaaadfd3352c07"
  },
  {
    "busId": "wbx_bus_cada6937eb01",
    "apiKey": "wbx_sk_219f6e2c684f606fe3d8c54f928e3f4b0c07f0f7444f2a60f11013300de3f08c"
  },
  {
    "busId": "wbx_bus_9120fb2ce05a",
    "apiKey": "wbx_sk_ac6b7f3524a8cb1a2dc27438b29fefc6abde06e39a6bd65d55253176a274ec60"
  },
  {
    "busId": "wbx_bus_ad6599880cb0",
    "apiKey": "wbx_sk_4c2eae5ba797e4b048002e811a35a621d2b561aca61064fe489921d83a773e33"
  },
  {
    "busId": "wbx_bus_0e2ad21b5a2b",
    "apiKey": "wbx_sk_077a94289b520ed5eeb9433f25ef81f8f0b117ca24ac77c0fd90a37a78a6140d"
  },
  {
    "busId": "wbx_bus_fd935cfd1c30",
    "apiKey": "wbx_sk_bf0aa28abad8f32c8fd5c677ddaf153c841a31ff362f9e0d401ff9962f5666a1"
  },
  {
    "busId": "wbx_bus_4ec75b5994ea",
    "apiKey": "wbx_sk_61810148f4a75c7b108ca349ac5b320337876a129b5f1d67730f23c4322ae9a5"
  },
  {
    "busId": "wbx_bus_db5bb177ad9e",
    "apiKey": "wbx_sk_af0600498cf2b0909abb5a3d8ef934bc8631b47fa32d5ff97b7c787721a173e7"
  },
  {
    "busId": "wbx_bus_310e9bbaec62",
    "apiKey": "wbx_sk_f8c7d3745626588d9325963bc2e1563d7ee6ad1157441a27c28e69085eae7651"
  },
  {
    "busId": "wbx_bus_6a3092fa4b39",
    "apiKey": "wbx_sk_00af51a54ccb50611424133999a2d69991511cfb12540cd079ad9349ab07d422"
  },
  {
    "busId": "wbx_bus_506711809de4",
    "apiKey": "wbx_sk_ee4cb973b895922651f182d4a2512fc4f271a3a2eeb987fab61c51e754aead39"
  },
  {
    "busId": "wbx_bus_1f7934a3bc83",
    "apiKey": "wbx_sk_b385a8c166438f34b280d5eb9a8ff5eefa2c2d9ea748e0a0f879c4e646dd6040"
  }
];

class BusSimulator {
  private currentLat = 23.7639 + (Math.random() - 0.5) * 0.01;
  private currentLon = 90.4066 + (Math.random() - 0.5) * 0.01;

  constructor(private busId: string, private apiKey: string) { }

  async sendReading() {
    const payload = {
      latitude: this.currentLat,
      longitude: this.currentLon,
      recordedAt: new Date().toISOString()
    };

    try {
      const res = await fetch(`${SERVER_URL}/api/readings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': this.busId,
          'x-api-key': this.apiKey
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        console.log(`[${this.busId}] OK: ${this.currentLat.toFixed(5)}, ${this.currentLon.toFixed(5)}`);
      } else {
        const data: any = await res.json();
        console.error(`[${this.busId}] ERROR: ${data.message || 'Unknown error'}`);
      }

      // Move next point slightly
      this.currentLat += (Math.random() - 0.5) * 0.0005;
      this.currentLon += (Math.random() - 0.5) * 0.0005;

    } catch (error: any) {
      console.error(`[${this.busId}] NETWORK ERROR: ${error.message}`);
    }
  }

  start() {
    console.log(`Starting simulator for bus ${this.busId}...`);
    this.sendReading();
    setInterval(() => this.sendReading(), UPDATE_INTERVAL);
  }
}

// Initialize and start all simulators
BUS_CREDENTIALS.forEach(cred => {
  const simulator = new BusSimulator(cred.busId, cred.apiKey);
  simulator.start();
});
