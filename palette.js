/**
 * Node CLI tool that generates a palette from text prompt, using Stable Diffusion.
 */

const path = require("path");
const fs = require("fs/promises");
const generate = require("./cli");
const { promisify } = require("util");
const getPixels = promisify(require("get-pixels"));
const { createCanvas } = require("canvas");
const Color = require("canvas-sketch-util/color");
const { quantize } = require("gifenc");

const argv = require("minimist")(process.argv.slice(2), {
  alias: {
    seed: "S",
    width: "W",
    height: "H",
  },
});

(async () => {
  const outdir = path.resolve(process.cwd(), "output");
  const outfile = `${Date.now()}.png`;
  const basename = path.basename(outfile, path.extname(outfile));

  const prompt = [
    ...argv._,
    ", photograph, hd hq 8k 4k, canon, leica, 35mm, octane render",
  ].join(" ");

  await generate({
    ...argv,
    prompt,
    outdir,
    outfile,
  });

  const pixels = await getPixels(path.resolve(outdir, outfile));

  const n = 5;
  const palette = quantize(pixels.data, n);

  const canvas = createCanvas(512, 128);
  const tileWidth = canvas.width / n;
  const context = canvas.getContext("2d");

  for (let i = 0; i < palette.length; i++) {
    const color = palette[i];
    const hex = Color.parse(color).hex;
    context.fillStyle = hex;
    context.fillRect(i * tileWidth, 0, tileWidth, canvas.height);
  }

  const buf = canvas.toBuffer();
  await fs.writeFile(path.join(outdir, `${basename}_palette.png`), buf);
})();
