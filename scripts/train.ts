#!/usr/bin/env node
import yargs from "yargs";
import Fs from "fs";
import Path from "path";
import fg from "fast-glob";

// @ts-ignore
import Bayes from "bayes";

const cli = yargs
  .option("cwd", { type: "string", default: process.cwd() })
  .option("training", { type: "string", default: "./training" })
  .option("out", { type: "string", default: "./src/state.json" })
  .strict().argv;

async function main() {
  const base = Path.resolve(cli.cwd, cli.training);
  const outFile = Path.resolve(cli.cwd, cli.out);

  const files = await fg(["**/*.json"], { cwd: base, absolute: true });
  const classifier = Bayes({
    tokenizer: (text: string) => text.split(/\s+/)
  });

  for (const file of files) {
    try {
      const data = JSON.parse(await Fs.promises.readFile(file, "utf-8"));
      await classifier.learn(data.code, data.language);
    } catch (err) {
      console.error(file, err);
    }
  }

  await Fs.promises.writeFile(outFile, classifier.toJson());
}

main().catch((err) =>
  setImmediate(() => {
    throw err;
  })
);
