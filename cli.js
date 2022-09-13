/**
 * General-purpose NodeJS CLI/API wrapping the Stable-Diffusion python scripts.
 *
 * Note that this uses an older fork of stable-diffusion
 * with the 'txt2img.py' script, and that script was modified to
 * support the --outfile command.
 */

var { spawn, exec } = require("child_process");
var path = require("path");
const argv = require("minimist")(process.argv.slice(2), {
  alias: {
    seed: "S",
    width: "W",
    height: "H",
  },
});
const cwd = process.cwd();

// You might need to edit this
const STABLE_DIFFUSION_REPO_PATH = path.resolve(cwd, "../stable-diffusion");

function resolvePath(p) {
  if (path.isAbsolute(p)) return p;
  else return path.resolve(cwd, p);
}

module.exports = generate;
function generate(opts = {}) {
  return new Promise((resolve, reject) => {
    console.time("exec");

    const outfile = opts.outfile ? opts.outfile : Date.now() + "_x.png";
    const outdir = opts.outdir
      ? opts.outdir
      : path.join(process.cwd(), "output");
    const prompt = opts.prompt;
    console.log("Prompt:", JSON.stringify(prompt));
    const width = opts.width || 512;
    const height = opts.height || 512;
    const seed = opts.seed;
    const steps = opts.steps || 50;
    const inputImage = opts.image ? resolvePath(opts.image) : "";
    const strength = opts.strength != null ? opts.strength : 0.75;
    const scale = opts.scale != null ? opts.scale : 7;
    // const ddim_eta = opts.ddim_eta != null ? opts.ddim_eta : "0.0";

    const txt2imgArgs = [
      "scripts/txt2img.py",
      "--prompt",
      JSON.stringify(prompt),
      // "--plms",
      "--outdir",
      outdir,
      "--outfile",
      outfile,
      "--ckpt",
      "sd-v1-4.ckpt",
      "--W",
      width,
      "--H",
      height,
      // `--ddim_eta=${ddim_eta}`,
      "--skip_grid",
      `--scale=${scale}`,
      `--n_samples=1`,
      "--n_rows=1",
      "--n_iter=1",
      "--fixed_code",
      seed != null ? `--seed=${seed}` : null,
      `--ddim_steps=${steps}`,
    ].filter((d) => d != null);

    const img2imgArgs = [
      "scripts/img2img.py",
      "--prompt",
      JSON.stringify(prompt),
      "--outdir",
      outdir,
      "--outfile",
      outfile,
      "--ckpt",
      "sd-v1-4.ckpt",
      "--skip_grid",
      `--n_samples=1`,
      "--n_rows=1",
      "--n_iter=1",
      "--fixed_code",
      seed != null ? `--seed=${seed}` : null,
      `--ddim_steps=${steps}`,
      `--scale=${scale}`,
      `--strength=${strength}`,
      `--init-img=${JSON.stringify(inputImage)}`,
    ].filter((d) => d != null);

    const cliArgs = inputImage ? img2imgArgs : txt2imgArgs;
    const environmentName = "ldm";
    const command = `conda run -n ${environmentName} --no-capture-output python ${cliArgs.join(
      " "
    )}`;

    const cp = exec(
      command,
      {
        stdio: "inherit",
        cwd: STABLE_DIFFUSION_REPO_PATH,
      },
      (err, stdout, stderr) => {
        console.timeEnd("exec");
        if (err) reject(err);
        else resolve();
      }
    );
    cp.stdout.pipe(process.stdout);
    cp.stderr.pipe(process.stderr);
  });
}

if (!module.parent) {
  (async () => {
    const opts = {
      ...argv,
      prompt: argv._.join(" "),
    };
    const n_samples = argv.n || 1;
    for (let i = 0; i < n_samples; i++) {
      await generate(opts);
    }
  })();
}
