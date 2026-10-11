import fs from 'fs';
import path from 'path';

function inspectGlb(glbPath: string) {
  const buf = fs.readFileSync(glbPath);
  const jsonLen = buf.readUInt32LE(12);
  const jsonChunk = buf.subarray(20, 20 + jsonLen).toString('utf8');
  const gltf = JSON.parse(jsonChunk);
  console.log(`=== ${path.basename(glbPath)} ===`);
  if (gltf.animations) {
    console.log(`Animations (${gltf.animations.length}):`, gltf.animations.map((a: any) => a.name));
  } else {
    console.log('No animations found!');
  }
}

inspectGlb('./public/models/michelle.glb');
inspectGlb('./public/models/nico.glb');
