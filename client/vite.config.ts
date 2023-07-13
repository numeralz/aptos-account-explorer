import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
// import devtools from 'solid-devtools/vite';

export default defineConfig({
  plugins: [
    /* 
    Uncomment the following line to enable solid-devtools.
    For more info see https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme
    */
    // devtools(),
    solidPlugin(),
  ],
  server: {
    port: 3001,
    proxy: {
      "/api": {
        target: "http://0.0.0.0:3000", /* docker */
        changeOrigin: true,
      }
    },
  },
  build: {
    target: 'esnext',
  },
  
  
});
