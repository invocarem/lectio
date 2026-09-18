/**
 * Convert a work's paired latin.md / english.md into a reader JSON tree
 * (parts → chapters → passages → segments).
 *
 *   npx tsx tools/md_to_work_json.ts --work gradibus
 *   npx tsx tools/md_to_work_json.ts --work gradibus --scaffold
 *   npx tsx tools/md_to_work_json.ts --work gradibus --scaffold --force
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assembleWorkText,
  mergeWorkText,
  ScaffoldClobberError,
  verifyWorkText,
  type WorkText,
} from "../src/content/workText";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = join(ROOT, "src", "content");

type Args = {
  work: string;
  scaffold: boolean;
  verify: boolean;
  force: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { work: "gradibus", scaffold: false, verify: false, force: false };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--work") {
      args.work = argv[++i] ?? args.work;
    } else if (token === "--scaffold") {
      args.scaffold = true;
    } else if (token === "--verify") {
      args.verify = true;
    } else if (token === "--force") {
      args.force = true;
    } else if (token === "--help" || token === "-h") {
      console.log(`Usage: tsx tools/md_to_work_json.ts [--work gradibus] [--scaffold] [--verify] [--force]`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  if (!args.scaffold) args.verify = true;
  return args;
}

function workPaths(workId: string) {
  const dir = join(CONTENT, workId);
  return {
    dir,
    latin: join(dir, "latin.md"),
    english: join(dir, "english.md"),
    json: join(dir, "work.json"),
  };
}

function readJson(path: string): WorkText | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as WorkText;
}

function reportIssues(issues: ReturnType<typeof verifyWorkText>): never | void {
  if (issues.length === 0) {
    console.log("verify: ok");
    return;
  }
  for (const issue of issues) {
    console.error(`${issue.passageId} [${issue.lang}] ${issue.message}`);
  }
  process.exitCode = 1;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const paths = workPaths(args.work);
  if (!existsSync(paths.latin) || !existsSync(paths.english)) {
    throw new Error(`Expected ${paths.latin} and ${paths.english}.`);
  }
  const latinMd = readFileSync(paths.latin, "utf8");
  const englishMd = readFileSync(paths.english, "utf8");
  const scaffold = assembleWorkText(latinMd, englishMd);
  const existing = readJson(paths.json);

  let next = scaffold;
  if (existing && args.scaffold) {
    next = mergeWorkText(existing, scaffold, args.force);
  }

  if (args.scaffold) {
    writeFileSync(paths.json, `${JSON.stringify(next, null, 2)}\n`);
    console.log(`wrote ${paths.json}`);
  }

  const toCheck = args.scaffold ? next : (existing ?? scaffold);
  if (!existing && !args.scaffold) {
    console.log("no work.json yet; assembled from markdown (dry run, not written)");
  }
  reportIssues(verifyWorkText(toCheck, latinMd, englishMd));
}

try {
  main();
} catch (error) {
  if (error instanceof ScaffoldClobberError) {
    console.error(error.message);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
