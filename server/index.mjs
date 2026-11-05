import { createDatabase } from './database.mjs';
import { createApp } from './app.mjs';
const db = createDatabase();
const port = Number(process.env.PORT || 4000);
const server = createApp(db).listen(port, '0.0.0.0', () =>
  console.log(`Luma API ready: http://localhost:${port}/api/health`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
