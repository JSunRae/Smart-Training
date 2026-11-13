import { pathToFileURL } from "node:url";

import { createPilotCredential, normalizePilotEmail } from "../src/lib/pilot-access";
import {
  createPilotOrganization,
  issuePilotInvitation,
  issuePilotPasswordReset,
  revokePilotInvitation,
  setPilotAccountAccess
} from "../src/lib/pilot-access-repository";
import { resetPostgresRuntime } from "../src/lib/postgres";

type Options = {
  command: string;
  values: Map<string, string>;
  flags: Set<string>;
};

class OperatorError extends Error {}

const USAGE = `Usage:
  pnpm --filter api pilot:access -- --file <synthetic-test.json> create-org --name <name>
  pnpm --filter api pilot:access -- --postgres create-org --name <name>
  pnpm --filter api pilot:access -- --file <synthetic-test.json> invite --email <email> --organization-id <id> [--role SELLER|ADMIN]
  pnpm --filter api pilot:access -- --file <synthetic-test.json> revoke-invite --email <email> --organization-id <id>
  pnpm --filter api pilot:access -- --file <synthetic-test.json> reset-password --email <email> --organization-id <id> --identity-verified
  pnpm --filter api pilot:access -- --file <synthetic-test.json> suspend --email <email> --organization-id <id>
  pnpm --filter api pilot:access -- --file <synthetic-test.json> approve --email <email> --organization-id <id>

Select exactly one backend. --file accepts only an explicitly named synthetic/test JSON file under the API data directory. No .env files are loaded.`;

function parseArgs(argv: string[]): Options {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  const positional: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    if (arg === "--identity-verified" || arg === "--help" || arg === "--postgres") {
      flags.add(arg.slice(2));
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new OperatorError("An option value is missing. Run with --help.");
    }
    const key = arg.slice(2);
    if (values.has(key)) {
      throw new OperatorError("An option was supplied more than once.");
    }
    values.set(key, value);
    index += 1;
  }

  if (flags.has("help")) {
    return { command: "", values, flags };
  }

  const backendCount = Number(flags.has("postgres")) + Number(values.has("file"));
  if (backendCount !== 1) {
    throw new OperatorError("Select exactly one backend with --postgres or --file <synthetic-test.json>.");
  }
  if (positional.length !== 1) {
    throw new OperatorError("Exactly one operator command is required.");
  }
  return { command: positional[0], values, flags };
}

function required(options: Options, name: string): string {
  const value = options.values.get(name)?.trim();
  if (!value) {
    throw new OperatorError(`Missing required --${name}.`);
  }
  return value;
}

function configureBackend(options: Options): "postgres" | "file" {
  if (options.flags.has("postgres")) {
    if (!process.env.DATABASE_URL?.trim()) {
      throw new OperatorError("--postgres requires DATABASE_URL to be set explicitly in the process environment.");
    }
    return "postgres";
  }

  if (process.env.DATABASE_URL?.trim()) {
    throw new OperatorError("--file cannot be used while DATABASE_URL is set; refusing a backend mismatch.");
  }
  if (process.env.NODE_ENV === "production") {
    throw new OperatorError("The local file backend is unavailable in production.");
  }
  const fileName = required(options, "file");
  if (
    fileName.toLowerCase() === "store.json" ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.json$/.test(fileName)
  ) {
    throw new OperatorError("--file must be an explicit non-default synthetic/test JSON filename, such as pilot-test.json.");
  }
  process.env.SMART_TRAINING_DB_PATH = fileName;
  return "file";
}

function assertNoUnknownOptions(options: Options, permitted: string[]): void {
  const allowed = new Set(["file", ...permitted]);
  if ([...options.values.keys()].some((key) => !allowed.has(key))) {
    throw new OperatorError("Unknown option. Run with --help.");
  }
}

function getEmail(options: Options): string {
  const email = normalizePilotEmail(required(options, "email"));
  if (!email) {
    throw new OperatorError("Enter a valid email address.");
  }
  return email;
}

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args[0] === "--" ? args.slice(1) : args);
  if (options.flags.has("help")) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }

  const permittedByCommand: Record<string, string[]> = {
    "create-org": ["name"],
    invite: ["email", "organization-id", "role"],
    "revoke-invite": ["email", "organization-id"],
    "reset-password": ["email", "organization-id"],
    suspend: ["email", "organization-id"],
    approve: ["email", "organization-id"]
  };
  const permitted = permittedByCommand[options.command];
  if (!permitted) {
    throw new OperatorError("Unknown command. Run with --help.");
  }
  if (options.flags.has("identity-verified") && options.command !== "reset-password") {
    throw new OperatorError("--identity-verified is only valid for reset-password.");
  }
  assertNoUnknownOptions(options, permitted);
  const backend = configureBackend(options);

  try {
    switch (options.command) {
      case "create-org": {
        const name = required(options, "name");
        const organization = await createPilotOrganization(name);
        if (!organization) {
          throw new OperatorError("Organization name was rejected or could not be created.");
        }
        process.stdout.write(`Organization created: ${organization.name} (ID ${organization.id}).\n`);
        break;
      }
      case "invite": {
        const email = getEmail(options);
        const organizationId = required(options, "organization-id");
        const role = options.values.get("role")?.toUpperCase() ?? "SELLER";
        if (role !== "SELLER" && role !== "ADMIN") {
          throw new OperatorError("--role must be SELLER or ADMIN.");
        }
        const { token, tokenHash } = createPilotCredential();
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
        if (!await issuePilotInvitation({ tokenHash, email, organizationId, role, expiresAt })) {
          throw new OperatorError("Invitation could not be issued for that email and organisation.");
        }
        process.stdout.write(`Invitation issued for ${email} in organisation ${organizationId} as ${role}.\n`);
        process.stdout.write(`Expires: ${expiresAt.toISOString()}\nInvitation token (display once; handle as a secret): ${token}\n`);
        break;
      }
      case "revoke-invite": {
        const email = getEmail(options);
        const organizationId = required(options, "organization-id");
        if (!await revokePilotInvitation(email, organizationId)) {
          throw new OperatorError("No revocable invitation was found for that email.");
        }
        process.stdout.write(`Invitation revoked for ${email} in organisation ${organizationId}.\n`);
        break;
      }
      case "reset-password": {
        if (!options.flags.has("identity-verified")) {
          throw new OperatorError("Support-assisted reset requires --identity-verified after out-of-band identity verification.");
        }
        const email = getEmail(options);
        const organizationId = required(options, "organization-id");
        const { token, tokenHash } = createPilotCredential();
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        if (!await issuePilotPasswordReset({ tokenHash, email, organizationId, expiresAt })) {
          throw new OperatorError("Password reset could not be issued; check the verified account details.");
        }
        process.stdout.write(`Password reset issued for ${email} in organisation ${organizationId}.\n`);
        process.stdout.write(`Expires: ${expiresAt.toISOString()}\nReset token (display once; handle as a secret): ${token}\n`);
        break;
      }
      case "suspend":
      case "approve": {
        const email = getEmail(options);
        const organizationId = required(options, "organization-id");
        const accessState = options.command === "suspend" ? "suspended" : "active";
        if (!await setPilotAccountAccess({ email, organizationId, accessState })) {
          throw new OperatorError("No matching account. Check the authoritative email and organisation ID.");
        }
        process.stdout.write(`Account ${email} in organisation ${organizationId} is now ${accessState}.\n`);
        break;
      }
    }
    process.stdout.write(`Backend selected: ${backend}.\n`);
  } finally {
    if (backend === "postgres") {
      await resetPostgresRuntime();
    }
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (invokedPath === import.meta.url) {
  run().catch((error: unknown) => {
    const message = error instanceof OperatorError ? error.message : "Pilot access command failed. Verify the selected storage and credentials.";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
