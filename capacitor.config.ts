import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.anchorlab.coreboard",
  appName: "CoreBoard",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
