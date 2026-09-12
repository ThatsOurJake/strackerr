import { spawnSync } from "node:child_process";

const run = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    throw result.error;
  }

  if ((result.status ?? 0) !== 0) {
    process.exit(result.status ?? 1);
  }
};

run("prisma", ["generate"]);

if (process.env.SKIP_APP_POSTINSTALL === "1") {
  console.log("Skipping non-essential app postinstall tasks");
  process.exit(0);
}

run("pnpm", ["run", "assets:sync"]);
