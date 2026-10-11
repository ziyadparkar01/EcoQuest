import fs from 'fs';

function getNodes(glbPath: string) {
  const buf = fs.readFileSync(glbPath);
  const jsonLen = buf.readUInt32LE(12);
  const jsonChunk = buf.subarray(20, 20 + jsonLen).toString('utf8');
  const gltf = JSON.parse(jsonChunk);
  return gltf.nodes.map((n: any) => n.name).filter(Boolean);
}

const michelleNodes = getNodes('./public/models/michelle.glb');
const nicoNodes = getNodes('./public/models/nico.glb');

console.log('michelle nodes count:', michelleNodes.length, michelleNodes.slice(0, 10));
console.log('nico nodes count:', nicoNodes.length, nicoNodes.slice(0, 10));

// Check overlap
const overlap = michelleNodes.filter((n: string) => nicoNodes.includes(n));
console.log(`Overlap: ${overlap.length} / ${michelleNodes.length} nodes match nico.`);
