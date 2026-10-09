import {probeDevice} from './device-readiness.js';
const button=document.querySelector('#probe');
const output=document.querySelector('#result');
button.addEventListener('click',async()=>{
  button.disabled=true;
  output.textContent='Verificando recursos locais…';
  try{
    const result=await probeDevice();
    output.textContent=JSON.stringify(result,null,2)+'\n\nIsso não mede velocidade ou qualidade de nenhum modelo.';
  }catch{
    output.textContent='A verificação falhou neste navegador. A síntese extrativa segue sendo a alternativa segura.';
  }finally{button.disabled=false;}
});