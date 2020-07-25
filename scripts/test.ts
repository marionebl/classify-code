#!/usr/bin/env node
import yargs from "yargs";
import Fs from "fs";
import Path from "path";
import fg from "fast-glob";
import { classifyCode } from "../src/classify-code";

const cli = yargs
  .option("cwd", { type: "string", default: process.cwd() })
  .option("training", { type: "string", default: "./training" })
  .strict().argv;

async function main() {
  const base = Path.resolve(cli.cwd, cli.training);
  const files = await fg(["**/*.json"], { cwd: base, absolute: true });

  for (const file of files) {
      const filePath = Path.resolve(base, file);
      try {
        const data = JSON.parse(await Fs.promises.readFile(file, "utf-8"));
        const result = await classifyCode(data.code);
        const sign = result === data.language ? '✅' : '🚨';
        console.log(sign, data.language, result);
      } catch (err) {
      }
  }
}

main().catch((err) =>
  setImmediate(() => {
    throw err;
  })
);
