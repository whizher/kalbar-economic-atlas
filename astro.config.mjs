import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://whizher.github.io",
  base: "/kalbar-economic-atlas",
  output: "static",
  trailingSlash: "always",
  build: { inlineStylesheets: "never" },
  vite: {
    build: { rolldownOptions: { output: { assetFileNames: "_astro/style-[hash][extname]" } } },
    environments: {
      client: { build: { rolldownOptions: { output: { assetFileNames: "_astro/style-[hash][extname]" } } } }
    }
  }
});
