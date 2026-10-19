const fs = require('node:fs');
const path = require('node:path');

const project = path.resolve(__dirname, '../../..');
const store = path.join(project, 'node_modules/.pnpm');
const sharpPackage = fs.readdirSync(store).find((name) => name.startsWith('sharp@'));
if (!sharpPackage) throw new Error('Install the project dependencies before rendering.');
const sharp = require(path.join(store, sharpPackage, 'node_modules/sharp'));

(async () => {
  for (const name of ['phaino-overview', 'phaino-touchpoints']) {
    await sharp(path.join(__dirname, `${name}.svg`))
      .png()
      .toFile(path.join(__dirname, `${name}.png`));
    console.log(`${name}.png: 3200 x 2000`);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
