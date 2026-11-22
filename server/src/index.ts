import { config } from "./config.js";
import { openDb } from "./db/index.js";
import { createProvider } from "./llm/index.js";
import { createApp } from "./app.js";

const db = openDb(config.databasePath);
const provider = createProvider(config);
createApp({ db, provider, cfg: config }).listen(config.port, () => {
  console.log(`API on http://localhost:${config.port}  (LLM: ${provider.name})`);
});
