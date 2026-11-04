import { access, writeFile, chmod } from "node:fs/promises";
import { randomBytes } from "node:crypto";
try {
  await access(".dev.vars");
  console.log("Preserved existing .dev.vars");
} catch {
  await writeFile(
    ".dev.vars",
    `LOCAL_DEV=true\nSITE_URL=http://localhost:3001\nADMIN_PASSWORD=${randomBytes(24).toString("base64url")}\nADMIN_SESSION_SECRET=${randomBytes(40).toString("base64url")}\nAI_ENABLED=false\n`,
    { flag: "wx", mode: 0o600 },
  );
  await chmod(".dev.vars", 0o600);
  console.log(
    "Created local-only random administrator credentials in .dev.vars; values are not printed.",
  );
}
