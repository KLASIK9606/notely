import vm from 'node:vm';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';
import {readSequentially,checkOcrCancelled} from '../src/ocrPipeline.ts';
import {readableSourceBlob,uploadFilename} from '../src/sourceRead.ts';
import {sourceLimit} from '../src/sourcePolicy.ts';
let uploads=0;
const code=ts.transpileModule(await readFile(new URL('../src/api.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const sandbox={exports:{},__DEV__:true,AbortController,setTimeout,clearTimeout,
  require(name) { if(name==='react-native') return {Platform:{OS:'web'}}; if(name==='expo-file-system')return {}; if(name==='./ocrPipeline')return {readSequentially,checkOcrCancelled}; if(name==='./sourceRead')return {readableSourceBlob,uploadFilename}; if(name==='./sourcePolicy')return {sourceLimit}; return {}; },
  URL,fetch:async (url) => url.startsWith('blob:') ? {ok:false,status:404,blob:async()=>new Blob(['404 page'])} : {ok:true,json:async()=>{uploads++;return {title:'T',subject:'S',lines:['provider fixture'],uncertainties:[]};}},
  FileReader:class {async readAsDataURL(blob) {this.result='data:text/html;base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64');this.onload();this.onloadend?.();}},
};
vm.runInNewContext(code,sandbox);
try {await sandbox.exports.transcribe({provider:'gemini',apiUrl:'http://localhost:3001',models:{gemini:'auto'}},[{id:'own-http-repro',name:'own.png',mime:'image/png',uri:'blob:missing',bytes:20}],{});}
catch(error) {console.log('source rejected:',error.message);}
console.log(JSON.stringify({uploadsDespiteSource404:uploads}));
