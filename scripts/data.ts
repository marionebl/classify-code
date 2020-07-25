#!/usr/bin/env node
import yargs from "yargs";
import Fs from "fs";
import Path from "path";
import cheerio from "cheerio";
import { kebabCase } from "lodash";

const cli = yargs
  .option("cwd", { type: "string", default: process.cwd() })
  .option("examples", { type: "string", default: "./vendors/prism/examples" })
  .option("highlight", {
    type: "string",
    default: "./vendors/highlight.js/test/detect",
  })
  .option("linguist", {
    type: "string",
    default: "./vendors/linguist/samples",
  })
  .option("out", { type: "string", default: "./training" })
  .strict().argv;

function fileToLanguage(input: string): string {
  return Path.basename(input, Path.extname(input)).replace(/^prism-/, "");
}

function htmlToItems(input: string, language: string) {
  const $ = cheerio.load(input);

  return $("h2")
    .toArray()
    .map((h) => $(h))
    .map(($h) => {
      const title = $h.text().toLowerCase().split(" ").join("-");
      const code = $h.next("pre").text();
      return {
        language,
        title,
        code,
      };
    });
}

async function main() {
  const base = Path.resolve(cli.cwd, cli.examples);
  const highlightBase = Path.resolve(cli.cwd, cli.highlight);
  const linugistBase = Path.resolve(cli.cwd, cli.linguist);

  const out = Path.resolve(cli.cwd, cli.out);
  const files = await Fs.promises.readdir(base);

  const linguistLanguages = await Fs.promises.readdir(linugistBase);

  if (!Fs.existsSync(out)) {
    await Fs.promises.mkdir(out);
  }

  await Promise.all(
    files.map(async (file) => {
      const language = fileToLanguage(file);
      const filePath = Path.join(base, file);
      const languageBase = Path.join(out, language);
      const content = await Fs.promises.readFile(filePath, "utf-8");
      const items = htmlToItems(content, language);

      if (!Fs.existsSync(languageBase)) {
        await Fs.promises.mkdir(languageBase);
      }

      const tasks = items.map(async (item) => {
        const itemPath = Path.join(languageBase, `prism-${item.title}.json`);
        await Fs.promises.writeFile(itemPath, JSON.stringify(item, null, "  "));
      });

      await Promise.all(tasks);

      const highlightFolder = Path.resolve(highlightBase, language);

      if (Fs.existsSync(highlightFolder)) {
        const highlightFiles = await Fs.promises.readdir(highlightFolder);
        const highlightTasks = highlightFiles
          .map(async (highlightFile) => {
            const highlightFilePath = Path.join(highlightFolder, highlightFile);
            return {
              language,
              title: Path.basename(highlightFile, Path.extname(highlightFile)),
              code: await Fs.promises.readFile(highlightFilePath, "utf-8"),
            };
          })
          .map(async (loading) => {
            const item = await loading;
            const itemPath = Path.join(
              languageBase,
              `highlight-${item.title}.json`
            );
            await Fs.promises.writeFile(
              itemPath,
              JSON.stringify(item, null, "  ")
            );
          });

        await Promise.all(highlightTasks);
      }

      const linguistLanguage = linguistLanguages.find(
        (l) => l.toLowerCase() === language
      );

      if (linguistLanguage) {
        const linguistFolder = Path.join(linugistBase, linguistLanguage);
        const linguistFiles = await Fs.promises.readdir(linguistFolder);

        const linugistTasks = linguistFiles
          .filter(f => f !== "filenames")
          .map(async (linguistFile) => {
            const linguistFilePath = Path.join(linguistFolder, linguistFile);
            return {
              language,
              title: kebabCase(Path.basename(linguistFile, Path.extname(linguistFile))),
              code: await Fs.promises.readFile(linguistFilePath, "utf-8"),
            };
          })
          .map(async (loading) => {
            const item = await loading;
            const itemPath = Path.join(
              languageBase,
              `linguist-${item.title}.json`
            );
            await Fs.promises.writeFile(
              itemPath,
              JSON.stringify(item, null, "  ")
            );
          });

        await Promise.all(linugistTasks);
      }
    })
  );
}

main().catch((err) =>
  setImmediate(() => {
    throw err;
  })
);
