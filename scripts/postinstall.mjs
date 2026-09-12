import { spawnSync } from "node:child_process";

if (process.env.SKIP_APP_POSTINSTALL === "1") {
  console.log("Skipping app postinstall tasks");
  process.exit(0);
}

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
run("pnpm", ["run", "assets:sync"]);
