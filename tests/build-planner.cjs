/* Rebuild the srcdoc bundle from canonical sources; no dependencies required. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
let html=read('planner/index.html');
html=html.replace(/<link rel="stylesheet" href="([^"]+)"\s*\/?\s*>/g,(_,file)=>'<style>'+read(path.join('planner',file))+'</style>');
html=html.replace(/<script src="([^"]+)"><\/script>/g,(_,file)=>{
  const script='<script>'+read(path.join('planner',file))+'</script>';
  return file==='features.js'?script+'<script>'+read('planner/embedded-bridge.js')+'</script>':script;
});
const bundle='window.SAFE_PLANNER_DOCUMENT='+JSON.stringify(html)+';\n';
const target=path.join(root,'planner-document.js');
if(process.argv.includes('--check')){
  if(read('planner-document.js')!==bundle){console.error('planner-document.js no está actualizado. Ejecuta node tests/build-planner.cjs');process.exitCode=1}
  else console.log('PASS planner-document.js coincide con las fuentes');
}else fs.writeFileSync(target,bundle);
