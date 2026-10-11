import fs from 'fs';

const buf = fs.readFileSync('./public/models/michelle.glb');
const jsonLen = buf.readUInt32LE(12);
const jsonChunk = buf.subarray(20, 20 + jsonLen).toString('utf8');
const gltf = JSON.parse(jsonChunk);

console.log('Michelle animations:');
gltf.animations.forEach((a: any) => {
  const channelTargets = a.channels.slice(0, 3).map((c: any) => {
    const node = gltf.nodes[c.target.node];
    return `${node ? node.name : c.target.node}.${c.target.path}`;
  });
  console.log(` - ${a.name}: ${a.channels.length} channels, targets sample:`, channelTargets);
});
