import { mkdir, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
const dir = new URL('./fixtures/import/', import.meta.url);
await mkdir(dir, { recursive:true });
for(let n=1;n<=8;n++) {
  const image = new PNG({width:64,height:64});
  for(let i=0;i<image.data.length;i+=4) {image.data[i]=n*25;image.data[i+1]=130;image.data[i+2]=210;image.data[i+3]=255;}
  await writeFile(new URL(`own-page-${n}.png`,dir),PNG.sync.write(image));
}
await writeFile(new URL('empty.png',dir),Buffer.alloc(0));
await writeFile(new URL('mismatch.pdf',dir),'this is not a PDF');
const content = 'BT /F1 18 Tf 50 750 Td (Own test: potato is a stem tuber.) Tj ET';
const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
let pdf='%PDF-1.4\n',offsets=[0];
for(let i=0;i<objects.length;i++) {offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
await writeFile(new URL('own-potato.pdf',dir),pdf);
const samples=8000, wav=Buffer.alloc(44+samples*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples*2,40);
for(let i=0;i<samples;i++) wav.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/8000)*8000),44+i*2);
await writeFile(new URL('own-tone.wav',dir),wav);
