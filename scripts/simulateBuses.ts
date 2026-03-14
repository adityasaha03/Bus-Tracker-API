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
  { busId: 'wbx_bus_b7fa06e0cf14', apiKey: 'wbx_sk_36247bf3380a11320d1093a4481ebfdea53a4d87f0ecb5bd4ea3d00e391c4595' },
  { busId: 'wbx_bus_7166f96665f9', apiKey: 'wbx_sk_62f2758fdeb1a0fa9824e056e49e9153711c6955f757736948268019745b58a4' },
  { busId: 'wbx_bus_f8791f5366cd', apiKey: 'wbx_sk_ea627af304198a6bdc4a9ee3c28516eecc6374410411fcb7ade68dd3b5dac4e6' },
  { busId: 'wbx_bus_18ac4626097d', apiKey: 'wbx_sk_0c8837ca81c8d3f0381ab6839fffa03c44822bfce3ac7217eb6a354404f524ba' },
  { busId: 'wbx_bus_8d2206a84446', apiKey: 'wbx_sk_22c96f8137f49a36cb07626d78303c9b342031f7bc686ef86530ca7bc972759e' },
  { busId: 'wbx_bus_d5f422ab6aa1', apiKey: 'wbx_sk_a244c043d80def7b86fefab7b924ebee12357ea70269af4c0d625d510bbbff8b' },
  { busId: 'wbx_bus_85d0e4596b3d', apiKey: 'wbx_sk_72bb37b53a5abb84ab7c5417db9f7a18abfbaf093a6244a18deacac1f2d3c0df' },
  { busId: 'wbx_bus_19dfb60c05a4', apiKey: 'wbx_sk_da1eeb937fd6752a7cd2276a68ee547edc6eed0e1c3b57ce0a0c1d7ff06cf528' },
  { busId: 'wbx_bus_a67b0ef4f0ac', apiKey: 'wbx_sk_5314433a85c330daa20be09ac3464058f1ea89f003de2589b0c6312916722f38' },
  { busId: 'wbx_bus_c565c6652822', apiKey: 'wbx_sk_1e5b5128c90b6cda31b59c00917c4218f372c908cdc1675bf2b83716f41bb0bd' },
  { busId: 'wbx_bus_488f91ed0308', apiKey: 'wbx_sk_022a24d16238d834eac052903efd19edbc544bca78ca853e162519d45cc278fd' },
  { busId: 'wbx_bus_d889fbe16d9f', apiKey: 'wbx_sk_a083b6391397706fd6a2a1bd1fc60198720f8961ec33c4f5aeb9462c4819a010' },
  { busId: 'wbx_bus_254ffe51125f', apiKey: 'wbx_sk_59960218da611bb0e509e296df911c18d21b18dd809da155bb266a189174c347' },
  { busId: 'wbx_bus_3e44f52c4f0a', apiKey: 'wbx_sk_b94418588fd1566c50edf15d5ade3f40509c983e3a67a3a7916186ac8cd736f1' },
  { busId: 'wbx_bus_c26b22ffca67', apiKey: 'wbx_sk_4b0ab473ae44f28547f0c9fdacd6ff5bbeb70fa21dfd034e832afa54d4fa8382' },
  { busId: 'wbx_bus_7b87e626f266', apiKey: 'wbx_sk_d4bef6902f108766587c0374473d7a65fd241c6f8e9dc2b0f7c272190eb6f503' },
  { busId: 'wbx_bus_ab1468eeceac', apiKey: 'wbx_sk_64ad4c1aa2531b026ecc51980d967d00b9c4b8aea4f6052d745f1a870e1500fa' },
  { busId: 'wbx_bus_a5b7e6c84f2f', apiKey: 'wbx_sk_13895e13034a496c1707817c56df788dfc23cb4843022de5baabf5df68ca5ce9' },
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
