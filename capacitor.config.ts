import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.anchorlab.vistataskscontrol",
  appName: "VISTA Task Control",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
