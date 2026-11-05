import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequirementsParser } from './ai.ts';
import { ApiError } from './errors.ts';

const config={provider:'gemini' as const,model:'gemini-2.5-flash',apiKey:'private-test-key'};
const requirement={title:'MVP backend',mandatory_skills:['Node.js','TypeScript'],desired_skills:['Docker'],min_availability:50,start_month:'2026-11',duration_months:3,seniority:'Pleno'};
const result=(text:unknown,finishReason='STOP')=>({candidates:[{finishReason,content:{parts:[{text:JSON.stringify(text)}]}}]});

test('Gemini: usa schema JSON, chave somente no cabeçalho e mantém desejáveis separadas',async()=>{
  const parse=createRequirementsParser(config,async(input,init)=>{
    assert.ok(String(input).endsWith('/gemini-2.5-flash:generateContent'));assert.ok(!String(input).includes(config.apiKey));
    assert.equal(new Headers(init?.headers).get('x-goog-api-key'),config.apiKey);
    const body=JSON.parse(init?.body as string);assert.ok(!String(init?.body).includes(config.apiKey));
    assert.equal(body.generationConfig.responseMimeType,'application/json');assert.ok(body.generationConfig.responseJsonSchema.properties.mandatory_skills);
    assert.equal(body.contents[0].parts[0].text,'Uma demanda de teste');
    return Response.json(result(requirement));
  });
  assert.deepEqual(await parse('Uma demanda de teste'),requirement);
});
test('Gemini: não inventa skill quando a extração está vazia',async()=>{
  const parse=createRequirementsParser(config,async()=>Response.json(result({...requirement,mandatory_skills:[]})));
  await assert.rejects(parse('Quero alguém'),(e:ApiError)=>e.status===422 && e.code==='AI_NEEDS_CLARIFICATION');
});
test('Gemini: rejeita JSON truncado e valores fora dos limites',async()=>{
  const truncated=createRequirementsParser(config,async()=>Response.json(result(requirement,'MAX_TOKENS')));
  await assert.rejects(truncated('teste'),(e:ApiError)=>e.code==='AI_INCOMPLETE_RESPONSE');
  const invalid=createRequirementsParser(config,async()=>Response.json(result({...requirement,min_availability:150})));
  await assert.rejects(invalid('teste'),(e:ApiError)=>e.code==='AI_INVALID_RESPONSE');
});
test('Gemini: não vaza erro do provedor nem chave ao tratar credencial inválida',async()=>{
  const parse=createRequirementsParser(config,async()=>Response.json({error:{message:'dados privados '+config.apiKey,details:[{reason:'API_KEY_INVALID'}]}},{status:400}));
  await assert.rejects(parse('teste'),(e:ApiError)=>e.code==='AI_ACCESS_DENIED' && !e.message.includes(config.apiKey));
});
test('Gemini: trata quota sem trocar silenciosamente para outro provedor',async()=>{
  let calls=0;const parse=createRequirementsParser(config,async()=>{calls++;return Response.json({error:{status:'RESOURCE_EXHAUSTED'}},{status:429});});
  await assert.rejects(parse('teste'),(e:ApiError)=>e.code==='AI_RATE_LIMITED' && e.status===429);assert.equal(calls,1);
});
test('Gemini: não faz chamada sem chave e informa erro de conexão',async()=>{
  const absent=createRequirementsParser({...config,apiKey:undefined},async()=>{assert.fail('não deve chamar provedor');});
  await assert.rejects(absent('teste'),(e:ApiError)=>e.code==='AI_NOT_CONFIGURED');
  const offline=createRequirementsParser(config,async()=>{throw new TypeError('network error');});
  await assert.rejects(offline('teste'),(e:ApiError)=>e.code==='AI_CONNECTION_FAILED');
});
test('Gemini: ignora partes de raciocínio e rejeita respostas bloqueadas',async()=>{
  const parse=createRequirementsParser(config,async()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'não é JSON'},{text:JSON.stringify(requirement)}]}}]}));
  assert.deepEqual(await parse('teste'),requirement);
  const blocked=createRequirementsParser(config,async()=>Response.json({promptFeedback:{blockReason:'SAFETY'}}));
  await assert.rejects(blocked('teste'),(e:ApiError)=>e.code==='AI_RESPONSE_BLOCKED');
});
test('OpenAI: adaptador alternativo mantém o contrato sem uso real da API',async()=>{
  const parse=createRequirementsParser({...config,provider:'openai',model:'gpt-4o-mini'},async(input,init)=>{
    assert.equal(String(input),'https://api.openai.com/v1/responses');assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer '+config.apiKey);
    assert.equal(JSON.parse(init?.body as string).store,false);
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(requirement)}]}]});
  });
  assert.deepEqual(await parse('teste'),requirement);
});
