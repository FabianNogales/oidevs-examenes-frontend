// Presentation QA with the real pages and simulated transport. No backend writes.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  cleanupBrowserProfile,
  createBrowserProfile,
} from '../../../shared/tests/browserProfile.mjs'
import { createServer } from 'vite'

const output = process.env.HU34_QA_OUTPUT ?? '.validation.local/hu34-fixes'
await mkdir(output, { recursive: true })
const result = { widths: [], checks: [], errors: [] }
const demo = `
import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter,Routes,Route}from'react-router';import{AxiosError}from'axios';
import '/src/assets/styles/global.css';import '@fontsource/poppins/400.css';
// Reproduce the existing unscoped input rule loaded by the full application.
import{ExamEligibilitiesPage}from'/src/features/eligibilities/pages/ExamEligibilitiesPage.tsx';
import{EligibilityAutomationPage}from'/src/features/eligibility-automation/pages/EligibilityAutomationPage.tsx';
import{AdminEligibilityPoliciesPage}from'/src/features/eligibility-automation/pages/AdminEligibilityPoliciesPage.tsx';
import styles from'/src/features/eligibility-automation/pages/EligibilityAutomation.module.css';
const e=React.createElement,root=createRoot(document.getElementById('root'));let key=0;
const keys=['FIRST_PARTIAL','SECOND_PARTIAL'];
const required={code:'SECOND_INSTANCE_PARTIAL_AVERAGE',name:'Promedio de parciales para segunda instancia',description:'Requisito institucional para evaluar la segunda instancia.',status:'ACTIVE',revision:6,parameters:[],fixed_parameters:{assessment_keys:keys,operator:'GT',threshold:25},required:true,locked:true};
const optional=[
{code:'PREVIOUS_ASSESSMENTS_TAKEN',name:'Evaluaciones previas rendidas',description:'Verifica las evaluaciones previas seleccionadas.',status:'ACTIVE',revision:3,parameters:[{key:'assessment_keys',required:true,type:'array',options:keys,min_items:1}]},
{code:'MIN_ATTENDANCE_PERCENTAGE',name:'Porcentaje mínimo de asistencia',description:'Exige un porcentaje mínimo de asistencia.',status:'ACTIVE',revision:4,parameters:[{key:'minimum_percentage',required:true,type:'number',minimum_exclusive:0,maximum:100}]},
{code:'MIN_ASSESSMENT_SCORE',name:'Nota mínima por evaluación',description:'Exige una nota mínima en una evaluación.',status:'ACTIVE',revision:5,parameters:[{key:'assessment_key',required:true,type:'string',options:keys},{key:'minimum_score',required:true,type:'number',minimum:0,maximum:100}]},
{code:'MIN_ACCUMULATED_SCORE',name:'Puntaje acumulado mínimo',description:'Exige un puntaje acumulado mínimo.',status:'ACTIVE',revision:2,parameters:[{key:'assessment_keys',required:true,type:'array',options:keys,min_items:1},{key:'minimum_total',required:true,type:'number',minimum:0,maximum:200}]},
{code:'MIN_ASSESSMENT_AVERAGE',name:'Promedio mínimo de evaluaciones',description:'Exige un promedio mínimo en las evaluaciones seleccionadas.',status:'INACTIVE',revision:7,parameters:[{key:'assessment_keys',required:true,type:'array',options:keys,min_items:1},{key:'minimum_average',required:true,type:'number',minimum:0,maximum:100}]}];
const selections=[{assessment_keys:keys},{minimum_percentage:86},{assessment_key:'FIRST_PARTIAL',minimum_score:60},{assessment_keys:keys,minimum_total:120},{assessment_keys:['FIRST_PARTIAL'],minimum_average:55}];
const selected=optional.map((c,i)=>({code:c.code,name:c.name,parameters:selections[i],required:false,locked:false}));
const configuration={exam_id:17,evaluation_type:'makeup',configured_evaluation_type:'makeup',revision:4,catalog_revision:'catalog-r7',combination:'ALL',manual_review_conditions:'Revisar documentación presentada fuera de plazo.',selected_criteria:selected,mandatory_criteria:[required],inactive_criteria:[],criteria:[required,...selected]};
const options={...configuration,criteria:[required,...optional],assessments:[{key:'FIRST_PARTIAL',label:'Primer parcial'},{key:'SECOND_PARTIAL',label:'Segundo parcial'}]};
const criteriaHistory=[{id:41,entity_type:'EligibilityCriterion',entity_id:1,action:'ELIGIBILITY_CRITERION_UPDATED',user_id:9,created_at:'2026-11-03T10:00:00-04:00',old_values:{name:'Nombre anterior',description:'Descripción anterior'},new_values:{name:'Puntaje acumulado mínimo actualizado',description:'Descripción actualizada'}}];
const catalogSeed=[required,...optional];
const catalogCriteria=structuredClone(catalogSeed);
const empty={data:[],meta:{current_page:1,per_page:10,total:0,last_page:1}};
const academicRecord={id:81,course_offering_id:8,student_id:14,sis_code:'QA-081',first_names:'Estudiante',last_names:'de prueba',assessments:{FIRST_PARTIAL:{was_taken:true,score:25},SECOND_PARTIAL:{was_taken:true,score:25}},attended_classes:5,total_classes:10,revision:7};
const academicImportPreview={preview_id:'academic-preview',can_confirm:true,total_rows:2,valid_records:[{student_id:14,sis:'202600001',assessments:{FIRST_PARTIAL:{was_taken:true,score:28},SECOND_PARTIAL:{was_taken:true,score:32}},attended_classes:18,total_classes:20}],errors:[]};
const academicHistory=[{id:201,user_id:9,action:'ACADEMIC_RECORD_CORRECTED',entity_type:'academic_record',entity_id:81,old_values:{student_id:14,assessments:{FIRST_PARTIAL:{was_taken:true,score:25},SECOND_PARTIAL:{was_taken:true,score:25}},attended_classes:17,total_classes:20,reason:'Motivo anterior'},new_values:{student_id:14,assessments:{FIRST_PARTIAL:{was_taken:true,score:30},SECOND_PARTIAL:{was_taken:true,score:30}},attended_classes:18,total_classes:20,reason:'Prueba HU34: corrección de notas y preservación de decisión manual'},created_at:'2026-11-03T21:37:33Z'},{id:202,user_id:9,action:'ACADEMIC_RECORD_IMPORTED',entity_type:'academic_record',entity_id:81,old_values:null,new_values:{student_id:14},created_at:'2026-11-03T20:00:00Z'}];
const evaluationHistory=[{id:71,preview_id:'00000000-0000-4000-a000-000000000071',exam_id:17,eligibility_policy_id:7,created_by:2,created_at:'2026-11-03T14:00:00Z',confirmed_at:'2026-11-03T14:05:00Z',confirmation:{evaluation_id:71,updated:1,unchanged:2,manual_preserved:1,pending:2}},{id:70,preview_id:'00000000-0000-4000-a000-000000000070',exam_id:17,eligibility_policy_id:7,created_by:2,created_at:'2026-11-02T14:00:00Z',confirmed_at:null,confirmation:null}];
const resultFixture={student:{id:11,display_name:'Estudiante de prueba',sis:'QA-001'},computed_status:'PENDING',current_status:'ELIGIBLE',effective_status:'PENDING',manual_override_preserved:false,will_update:false,reason:'Faltan datos académicos para resolver el criterio.',missing_fields:['assessments.FIRST_PARTIAL','assessments.SECOND_PARTIAL'],eligibility_revision:2,criteria_results:[{code:'SECOND_INSTANCE_PARTIAL_AVERAGE',name:required.name,status:'PENDING',actual_value:null,required_value:25,reason:'Razón original conservada.'}]};
const evaluationFixture={id:71,preview_id:'00000000-0000-4000-a000-000000000071',exam_id:17,expires_at:'2026-11-03T14:30:00Z',created_at:'2026-11-03T14:00:00Z',confirmed_at:null,configuration,catalog:catalogCriteria,confirmation:null,results:{data:[resultFixture,{...resultFixture,student:{...resultFixture.student,id:12}},{...resultFixture,student:{id:13,display_name:'Bruno Inscrito Demo',sis:'QA-003'},computed_status:'ELIGIBLE',current_status:'INELIGIBLE',effective_status:'INELIGIBLE',manual_override_preserved:true,will_update:false,reason:'Se conserva la decisión manual vigente.',missing_fields:[],criteria_results:[{code:'SECOND_INSTANCE_PARTIAL_AVERAGE',name:required.name,status:'PASSED',actual_value:30,required_value:25}]}],meta:{...empty.meta,total:3}},summary:{total:3,eligible:1,ineligible:0,pending:2}};
const remoteView = (view, params = {}) => {
  const all = view.results.data.map((r) => ({
    ...r,
    state_will_change:
      r.state_will_change ??
      (r.will_update && r.effective_status !== r.current_status),
    traceability_only:
      r.traceability_only ??
      (r.will_update && r.effective_status === r.current_status),
  }))
  const summary = {
    ...view.summary,
    effective_eligible: all.filter((r) => r.effective_status === 'ELIGIBLE')
      .length,
    effective_ineligible: all.filter((r) => r.effective_status === 'INELIGIBLE')
      .length,
    effective_unset: all.filter((r) => r.effective_status == null).length,
    state_changes: all.filter((r) => r.state_will_change).length,
    traceability_only: all.filter((r) => r.traceability_only).length,
    protected: all.filter((r) => r.manual_override_preserved).length,
  }
  const search = (params.search ?? '').trim().toLowerCase()
  const filter = params.filter ?? 'ALL'
  const rows = all.filter(
    (r) =>
      (!search ||
        r.student.display_name.toLowerCase().includes(search) ||
        r.student.sis.toLowerCase().includes(search)) &&
      (filter === 'CHANGES'
        ? r.state_will_change
        : filter === 'PROTECTED'
          ? r.manual_override_preserved
          : filter === 'PENDING'
            ? r.computed_status === 'PENDING'
            : filter === 'ALL' || r.effective_status === filter),
  )
  const size = params.per_page ?? 10,
    page = params.page ?? 1
  return {
    ...view,
    expires_at: new Date(
      Date.now() + (hu34Ui.expired ? -60000 : 1800000),
    ).toISOString(),
    summary,
    results: {
      data: rows.slice((page - 1) * size, page * size),
      meta: {
        current_page: page,
        per_page: size,
        total: rows.length,
        last_page: Math.max(1, Math.ceil(rows.length / size)),
      },
    },
  }
}
const error=(status,message)=>new AxiosError('QA','ERR_BAD_RESPONSE',undefined,undefined,{status,data:{message}});
const mergeValues={assessments:{FIRST_PARTIAL:{was_taken:true,score:60},SECOND_PARTIAL:{was_taken:true,score:70}},attended_classes:10,total_classes:20};
const makeMergePreview=async(file,reason)=>{
 const lines=(await file.text()).trim().split(/\\r?\\n/);const headers=lines.shift().split(',');const groups=new Map();
 for(const line of lines){const cells=line.split(',');const row=Object.fromEntries(headers.map((h,i)=>[h,cells[i]??'']));
   const before=row.sis==='NEW'?{assessments:{},attended_classes:null,total_classes:null}:structuredClone(mergeValues);
   const item=groups.get(row.sis)??{student_id:groups.size+1,sis:row.sis,record_id:row.sis==='NEW'?null:81,revision:row.sis==='NEW'?null:7,before,proposed:structuredClone(before)};
   if(row.assessment_key&&(row.was_taken||row.score)){const prior=item.proposed.assessments[row.assessment_key]??{score:null};item.proposed.assessments[row.assessment_key]={...prior,...(row.was_taken?{was_taken:row.was_taken==='true'}:{}),...(row.score!==undefined&&row.score!==''?{score:Number(row.score)}:{})};const a=item.proposed.assessments[row.assessment_key];if(a.was_taken===undefined||(!a.was_taken&&a.score!==null))throw error(422,'La evaluación nueva requiere was_taken o el cambio requiere corrección explícita.');}
   if(row.total_classes!==undefined&&row.total_classes!==''){item.proposed.attended_classes=Number(row.attended_classes);item.proposed.total_classes=Number(row.total_classes)}
   groups.set(row.sis,item);
 }
 const records=[...groups.values()].map(r=>({...r,...r.proposed,action:r.record_id===null?'CREATE':JSON.stringify(r.before)===JSON.stringify(r.proposed)?'UNCHANGED':'UPDATE'}));
 const summary={created_records:records.filter(r=>r.action==='CREATE').length,updated_records:records.filter(r=>r.action==='UPDATE').length,unchanged_records:records.filter(r=>r.action==='UNCHANGED').length};
 if(summary.updated_records&&!reason.trim())throw new AxiosError('QA','ERR_BAD_RESPONSE',undefined,undefined,{status:422,data:{message:'Justifica la actualización.',errors:{reason:['Justificación obligatoria para actualizar.']}}});
 if(reason.length>500)throw error(422,'Máximo 500 caracteres.');
 return {preview_id:'merge-preview-'+hu34Ui.calls.length,expires_at:new Date(Date.now()+(hu34Ui.mode==='merge-expired'?-60000:1800000)).toISOString(),mode:'MERGE',reason,can_confirm:true,total_rows:lines.length,valid_records:records,summary,errors:[]};
};
window.hu34Ui={styles,calls:[],mode:'normal',configuration:structuredClone(configuration),academicRecord:structuredClone(academicRecord),offeringId:8,evaluation:evaluationFixture,reset(path='/teacher/exams/17/eligibilities/automatic?view=past&search=QA&page=2',mode='normal'){
this.mode=mode;this.mergePending=null;this.mergeConfirmation=null;this.mergeFailed=false;this.calls=[];this.pages=null;this.expired=false;this.holdFilter=null;this.releaseReview=null;this.configuration=structuredClone(configuration);this.academicRecord=structuredClone(academicRecord);this.offeringId=8;catalogCriteria.splice(0,catalogCriteria.length,...structuredClone(catalogSeed));root.render(e(MemoryRouter,{key:++key,initialEntries:[path]},e(Routes,null,e(Route,{path:'/teacher/exams/:examId/eligibilities',element:e(ExamEligibilitiesPage)}),e(Route,{path:'/teacher/exams/:examId/eligibilities/automatic',element:e(EligibilityAutomationPage)}),e(Route,{path:'/admin/eligibility-policies',element:e(AdminEligibilityPoliciesPage)}))));},client:{
async get(url,config){hu34Ui.calls.push({method:'get',url,params:config?.params});
if(url.endsWith('/options')||url.endsWith('/configuration')){if(hu34Ui.mode==='loading')return new Promise(()=>{});if(hu34Ui.mode==='error')throw error(500,'No se pudo cargar el catálogo de prueba.');return {data:{data:url.endsWith('/options')?options:hu34Ui.mode==='no-criteria'?{...hu34Ui.configuration,mandatory_criteria:[],selected_criteria:[],criteria:[],inactive_criteria:[]}:hu34Ui.configuration}}}
if(url==='/admin/eligibility-criteria')return {data:{data:catalogCriteria,meta:{...empty.meta,total:catalogCriteria.length},catalog_revision:'catalog-r7'}};
if(url.startsWith('/admin/eligibility-criteria/')&&url.endsWith('/history'))return {data:{data:criteriaHistory,meta:{...empty.meta,total:criteriaHistory.length}}};
if(url.startsWith('/admin/eligibility-criteria/'))return {data:{data:catalogCriteria.find(c=>c.code===decodeURIComponent(url.split('/').at(-1)))}};
if(url.endsWith('/import-schema')){if(hu34Ui.mode==='schema-error')throw error(500,'No se pudo cargar el esquema.');if(hu34Ui.mode==='late-academic')return new Promise(resolve=>{hu34Ui.lateSchema=()=>resolve({data:{data:{columns:['OLD_OFFERING'],assessment_keys:keys}}})});return {data:{data:{columns:['sis','assessment_key','was_taken','score','attended_classes','total_classes'],assessment_keys:keys,encoding:'UTF-8',delimiter:',',max_rows:1000,max_file_kb:5120,score_min:0,score_max:100,score_decimal_places:2,was_taken_values:['true','false'],modes:['CREATE_ONLY','MERGE'],default_mode:'CREATE_ONLY',merge:{allowed_columns:['sis','assessment_key','was_taken','score','attended_classes','total_classes'],required_columns:['sis'],attendance_columns:['sis','attended_classes','total_classes'],assessment_columns:['sis','assessment_key','was_taken','score'],empty_values:'PRESERVE',reason_required_for_updates:true,reason_max_length:500,confirmation_revalidates_revisions:true}}}};}
if(url.includes('/academic-offerings/')&&url.endsWith('/academic-records/history'))return {data:{data:academicHistory,meta:{...empty.meta,total:academicHistory.length}}};
if(url.includes('/academic-offerings/')&&url.endsWith('/academic-records')){if(hu34Ui.mode==='records-error')throw new AxiosError('QA','ERR_BAD_RESPONSE',undefined,undefined,{status:422,data:{message:'The search field must be a string.',errors:{search:['The search field must be a string.']}}});if(hu34Ui.mode==='late-academic')return new Promise(resolve=>{hu34Ui.lateRecords=()=>resolve({data:{data:[{id:999,first_names:'OLD_OFFERING'}],meta:empty.meta}})});if(hu34Ui.mode==='history')return {data:{data:[{...hu34Ui.academicRecord,first_names:'Bruno',last_names:'Inscrito Demo',sis_code:'202600002'}],meta:{...empty.meta,total:1}}};if(hu34Ui.mode==='correction'||hu34Ui.mode==='correction-conflict')return {data:{data:[hu34Ui.academicRecord],meta:{...empty.meta,total:1}}};return {data:empty};}
if(url.endsWith('/evaluations'))return {data:{data:evaluationHistory,meta:{...empty.meta,total:evaluationHistory.length}}};
if(url.split('/').at(-2)==='evaluations'){
 const view=remoteView(hu34Ui.pages?hu34Ui.pages(1):evaluationFixture,config?.params);
 if(hu34Ui.holdFilter===config?.params?.filter)return new Promise(resolve=>{hu34Ui.releaseReview=()=>resolve({data:{data:view}})});
 if(hu34Ui.mode==='query-error')throw error(500,'No se pudieron cargar los resultados.');
 if(hu34Ui.mode==='query-conflict')throw error(409,'La revisión cambió.');
 if(hu34Ui.mode==='wrong-snapshot')return {data:{data:{...view,id:999,preview_id:'other'}}};
 return {data:{data:view}};
}
if(url.endsWith('/eligibilities'))return {data:{exam:{id:17,manual_review_conditions:'Revisar documentación presentada fuera de plazo.'},data:[]}};
return {data:empty};
},async put(url,payload){hu34Ui.calls.push({method:'put',url,payload});if(hu34Ui.mode==='conflict')throw error(409,'La configuración cambió en el servidor.');if(hu34Ui.mode==='criteria-conflict')throw new AxiosError('QA','ERR_BAD_RESPONSE',undefined,undefined,{status:422,data:{code:'CRITERIA_CONFLICT',message:'Revisa los criterios indicados.',errors:{'criteria.0.parameters.assessment_keys':['Conflicto identificado por el catálogo.']}}});hu34Ui.configuration={...hu34Ui.configuration,revision:5,catalog_revision:payload.catalog_revision,manual_review_conditions:payload.manual_review_conditions,selected_criteria:payload.criteria,criteria:[required,...payload.criteria]};return {data:{data:hu34Ui.configuration}}},
async patch(url,payload){hu34Ui.calls.push({method:'patch',url,payload});if(url.includes('/academic-records/')){if(hu34Ui.mode==='correction-conflict')throw error(409,'El registro académico cambió en el servidor.');hu34Ui.academicRecord={...hu34Ui.academicRecord,...payload,revision:hu34Ui.academicRecord.revision+1};return {data:{data:hu34Ui.academicRecord}}}if(hu34Ui.mode==='criterion-conflict')throw error(409,'El criterio cambió en el servidor.');const statusChange=url.endsWith('/status');const parts=url.split('/');const code=decodeURIComponent(parts[parts.length-(statusChange?2:1)]);const index=catalogCriteria.findIndex(c=>c.code===code);catalogCriteria[index]={...catalogCriteria[index],...payload,revision:catalogCriteria[index].revision+1};return {data:{data:catalogCriteria[index]}}},
async post(url,payload,config){hu34Ui.calls.push({method:'post',url,payload,params:config?.params});if(url.endsWith('/evaluations/preview')){const view=hu34Ui.pages?hu34Ui.pages(1):hu34Ui.evaluation;return {data:{data:remoteView(view,config?.params)}}}if(url.endsWith('/imports/preview')){hu34Ui.importedCsv=await payload.get('file').text();if(payload.get('mode')==='MERGE'){const view=await makeMergePreview(payload.get('file'),payload.get('reason')??'');hu34Ui.mergePending=view;return {data:{data:view}}}return {data:{data:academicImportPreview}}}if(url.includes('/imports/merge-preview-')&&url.endsWith('/confirm')){
 if(hu34Ui.mode==='merge-conflict')throw new AxiosError('QA','ERR_BAD_RESPONSE',undefined,undefined,{status:409,data:{code:'AUTOMATION_CONFLICT',message:'Los datos cambiaron.'}});
 const view=hu34Ui.mergePending;hu34Ui.mergeConfirmation??={preview_id:view.preview_id,...view.summary,record_ids:[81]};
 if(hu34Ui.mode==='merge-retry'&&!hu34Ui.mergeFailed){hu34Ui.mergeFailed=true;throw error(500,'Respuesta interrumpida; reintenta la confirmación.');}
 return {data:{data:hu34Ui.mergeConfirmation}};
}if(url.endsWith('/imports/academic-preview/confirm'))return {data:{data:{preview_id:'academic-preview',created_records:1,record_ids:[81]}}};if(url.endsWith('/confirm')&&url.includes('/evaluations/')){if(hu34Ui.mode==='confirm-conflict')throw error(409,'Conflicto de prueba al confirmar.');return {data:{data:{evaluation_id:71,updated:0,unchanged:1,manual_preserved:1,pending:2}}}}throw error(422,'No se aplican operaciones académicas en esta prueba visual.')}
}};hu34Ui.reset();`

const pause = (ms) => new Promise((done) => setTimeout(done, ms))
let vite, chrome, ws, browserProfile
try {
  // Own temporary Chrome profile, removed in `finally` (success or failure).
  browserProfile = await createBrowserProfile('hu34-ui')
  const profile = browserProfile.dir
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true },
    plugins: [
      {
        name: 'hu34-visual-qa',
        enforce: 'pre',
        resolveId(id) {
          if (id === '/__hu34-ui.js') return '\0hu34-ui'
        },
        load(id) {
          if (id === '\0hu34-ui') return demo
          const path = id.replaceAll('\\', '/')
          if (path.endsWith('/src/shared/api/httpClient.ts'))
            return 'export const httpClient={get:(...args)=>hu34Ui.client.get(...args),put:(...args)=>hu34Ui.client.put(...args),patch:(...args)=>hu34Ui.client.patch(...args),post:(...args)=>hu34Ui.client.post(...args)};'
          if (path.endsWith('/src/features/auth/hooks/useAuth.ts'))
            return 'export const useAuth=()=>({notify(){}});'
          if (path.endsWith('/src/features/exams/hooks/useExamDetail.ts'))
            // U3.3: hu34Ui.examError (unset by default) simulates a failed exam request for the page contract checks.
            return 'export const useExamDetail=()=>(hu34Ui.examError?{exam:null,detail:null,isLoading:false,errorMessage:hu34Ui.examError,reload:async()=>{}}:{exam:null,detail:{course_offering_id:hu34Ui.offeringId},isLoading:false,errorMessage:null,reload:async()=>{}});'
        },
        configureServer(s) {
          s.middlewares.use(async (req, res, next) => {
            if (req.url !== '/__hu34-ui') return next()
            res.setHeader('Content-Type', 'text/html')
            res.end(
              await s.transformIndexHtml(
                '/__hu34-ui',
                '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__hu34-ui.js"></script></html>',
              ),
            )
          })
        },
      },
    ],
  })
  await vite.listen()
  chrome = spawn(
    process.env.EIDA_QA_CHROME ??
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { windowsHide: true, stdio: 'ignore' },
  )
  let launchError, port
  chrome.on('error', (error) => {
    launchError = error
  })
  for (let i = 0; i < 80; i++) {
    if (launchError) throw launchError
    try {
      port = Number(
        (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split(
          '\n',
        )[0],
      )
      break
    } catch {
      await pause(250)
    }
  }
  assert.ok(port)
  const targets = await (
    await fetch(`http://127.0.0.1:${port}/json/list`)
  ).json()
  ws = new WebSocket(
    targets.find((t) => t.type === 'page').webSocketDebuggerUrl,
  )
  await new Promise((done, reject) => {
    ws.addEventListener('open', done, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', ({ data }) => {
    const m = JSON.parse(data)
    if (m.id) {
      const p = pending.get(m.id)
      pending.delete(m.id)
      m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result)
    }
    if (m.method === 'Runtime.exceptionThrown')
      result.errors.push(
        m.params.exceptionDetails.exception?.description ??
          m.params.exceptionDetails.text,
      )
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const next = ++id
      pending.set(next, { resolve, reject })
      ws.send(JSON.stringify({ id: next, method, params }))
    })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (r.exceptionDetails)
      throw new Error(
        r.exceptionDetails.exception?.description ?? r.exceptionDetails.text,
      )
    return r.result.value
  }
  const wait = async (expression) => {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(`Boolean(${expression})`)) return
      await pause(100)
    }
    throw new Error(
      `Timeout ${expression}: ${await evaluate('document.body.innerText')}`,
    )
  }
  const button = async (label) => {
    assert.ok(
      await evaluate(
        `(()=>{const b=[...document.querySelectorAll('button')].find(el=>el.textContent.trim()===${JSON.stringify(label)}||(el.closest('nav')&&el.textContent.trim().endsWith(${JSON.stringify(label)})));if(!b||b.disabled)return false;b.focus();b.click();return true})()`,
      ),
      label,
    )
    await pause(80)
  }
  const input = async (selector, value) => {
    await evaluate(
      `(()=>{const el=document.querySelector(${JSON.stringify(selector)});const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value').set;setter.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}))})()`,
    )
    await pause(80)
  }
  const uploadAcademicCsv = async (name, content) => {
    await evaluate(
      `(()=>{const input=document.querySelector('[aria-labelledby="academic-import-title"] input[type=file]');const transfer=new DataTransfer();transfer.items.add(new File([${JSON.stringify(content)}],${JSON.stringify(name)},{type:'text/csv'}));Object.defineProperty(input,'files',{configurable:true,value:transfer.files});input.dispatchEvent(new Event('change',{bubbles:true}))})()`,
    )
  }
  const select = async (selector, value) => {
    await evaluate(
      `(()=>{const el=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('change',{bubbles:true}))})()`,
    )
    await pause(80)
  }
  const reset = async (path, mode = 'normal') => {
    await evaluate(
      `hu34Ui.reset(${JSON.stringify(path)},${JSON.stringify(mode)})`,
    )
    await pause(140)
  }
  const noOverflow = async (label) => {
    const fits = await evaluate(
      'document.documentElement.scrollWidth<=innerWidth+1',
    )
    if (!fits) {
      const overflow = await evaluate(
        `[...document.querySelectorAll('main *')].map(el=>({tag:el.tagName,classes:el.className,width:el.getBoundingClientRect().width,right:el.getBoundingClientRect().right})).filter(r=>r.right>innerWidth+1).slice(0,12)`,
      )
      throw new Error(label + ' overflow: ' + JSON.stringify(overflow))
    }
  }
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    })
    await writeFile(join(output, name + '.png'), Buffer.from(r.data, 'base64'))
  }
  const auto =
    '/teacher/exams/17/eligibilities/automatic?view=past&search=QA&page=2'
  // «Revisar y aplicar» (HU34 E1): the results table, its filters, search and dialogs.
  const reviewSection = `document.querySelector('[aria-labelledby="review-results-title"]')`
  const reviewState = () =>
    evaluate(
      `(()=>{const s=${reviewSection};const text=el=>el.innerText.replace(/\\s+/g,' ').trim();return {rows:[...s.querySelectorAll('tbody tr')].map(tr=>[...tr.querySelectorAll('td')].map(text)),pressed:[...s.querySelectorAll('button[aria-pressed=true]')].map(text),filters:[...s.querySelectorAll('button[aria-pressed]')].map(text),footer:s.querySelector('footer')?text(s.querySelector('footer')):null,status:text(s.querySelector('[role=status]')),text:text(s)}})()`,
    )
  const reviewFilter = async (label) => {
    assert.ok(
      await evaluate(
        `(()=>{const b=[...${reviewSection}.querySelectorAll('button[aria-pressed]')].find(el=>el.textContent.trim().startsWith(${JSON.stringify(label + ' (')}));if(!b)return false;b.focus();b.click();return true})()`,
      ),
      `filtro ${label}`,
    )
    await pause(80)
  }
  const reviewSearch = async (query) => {
    await input('[aria-labelledby="review-results-title"] input[type=search]', query)
    await evaluate(`${reviewSection}.querySelector('form').requestSubmit()`)
    await pause(80)
  }
  const reviewSummary = () =>
    evaluate(
      `Object.fromEntries([...document.querySelectorAll('[aria-labelledby="review-summary-title"] dl > div')].map(item=>[item.querySelector('dt').textContent.trim(),Number(item.querySelector('dd').textContent.trim())]))`,
    )
  const openDetail = async (name) => {
    assert.ok(
      await evaluate(
        `(()=>{const b=${reviewSection}.querySelector('button[aria-label=${JSON.stringify('Ver detalle de ' + name)}]');if(!b)return false;b.focus();b.click();return true})()`,
      ),
      `detalle de ${name}`,
    )
    await wait(`document.querySelector('dialog[open]')`)
    // The panel slides in for 180ms; its geometry is read once it has settled.
    await pause(260)
  }
  const dialogState = () =>
    evaluate(
      `(()=>{const d=document.querySelector('dialog[open]');const r=d.getBoundingClientRect();return {title:document.getElementById(d.getAttribute('aria-labelledby')).textContent.trim(),modal:d.matches(':modal'),metrics:Object.fromEntries([...d.querySelectorAll('dl > div')].map(item=>[item.querySelector('dt').textContent.trim(),item.querySelector('dd').textContent.trim()])),notice:d.querySelector('.'+hu34Ui.styles.manualNotice)?.textContent.trim()??null,reason:d.querySelector('.'+hu34Ui.styles.reasonText)?.textContent.trim()??null,criteria:[...d.querySelectorAll('.'+hu34Ui.styles.criteriaResults+' > li')].map(li=>li.innerText.replace(/\\s+/g,' ').trim()),text:d.innerText.replace(/\\s+/g,' ').trim(),inside:r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,focusInside:d.contains(document.activeElement)}})()`,
    )
  const closeDialog = async () => {
    for (const type of ['keyDown', 'keyUp'])
      await send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
    await wait(`!document.querySelector('dialog[open]')`)
  }
  const confirmCalls = () =>
    evaluate(
      `hu34Ui.calls.filter(call=>call.method==='post'&&call.url.includes('/evaluations/')&&call.url.endsWith('/confirm')).map(call=>({url:call.url,payload:call.payload??null}))`,
    )
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.navigate', {
    url: `http://127.0.0.1:${vite.httpServer.address().port}/__hu34-ui`,
  })
  await wait(`document.querySelector('input[type=checkbox]')`)
  for (const width of [320, 390, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await reset('/teacher/exams/17/eligibilities?view=past&search=QA&page=2')
    await wait(`document.querySelector('a').textContent`)
    assert.ok(
      await evaluate(
        `document.body.innerText.includes('Condiciones de revisión manual')&&document.body.innerText.includes('Revisar documentación presentada fuera de plazo.')`,
      ),
    )
    const access = await evaluate(
      `(()=>{const a=[...document.querySelectorAll('a')].find(a=>a.textContent==='Habilitación automática'),b=[...document.querySelectorAll('a')].find(a=>a.textContent==='Volver al examen');return {automatic:a.getAttribute('href'),back:b.getAttribute('href'),background:getComputedStyle(a).backgroundColor,a:a.getBoundingClientRect().toJSON(),b:b.getBoundingClientRect().toJSON()}})()`,
    )
    assert.equal(access.automatic, auto)
    assert.equal(access.back, '/teacher/exams/17?view=past&search=QA&page=2')
    assert.notEqual(access.a.y, access.b.y)
    await noOverflow(`${width}: HU12 access`)
    await shot(`hu12-access-${width}`)
    await evaluate(
      `[...document.querySelectorAll('a')].find(a=>a.textContent==='Habilitación automática').click()`,
    )
    await wait(`document.getElementById('configuration-title')`)
    const checks = await evaluate(
      `(()=>{const inputs=[...document.querySelectorAll('.'+hu34Ui.styles.criterionHeading+' input[type=checkbox]')];return inputs.map(el=>({checked:el.checked,disabled:el.disabled,w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height,gap:el.parentElement.querySelector('span').getBoundingClientRect().left-el.getBoundingClientRect().right}))})()`,
    )
    assert.ok(checks[0].checked && checks[0].disabled)
    assert.ok(checks.every((c) => c.w === 18 && c.h === 18 && c.gap <= 16))
    assert.ok(
      await evaluate(
        `document.body.innerText.includes('Mayor que 25')&&document.body.innerText.includes('Segunda instancia')&&document.body.innerText.includes('Deben cumplirse todos los criterios seleccionados')`,
      ),
    )
    const columns = await evaluate(
      `getComputedStyle(document.querySelector('.'+hu34Ui.styles.optionalCriteria)).gridTemplateColumns.split(' ').length`,
    )
    assert.equal(columns, 1)
    assert.ok(
      await evaluate(
        `Array.from(document.querySelectorAll('.'+hu34Ui.styles.criterion+' .'+hu34Ui.styles.parameters)).every(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length===(innerWidth>=1024?2:1))`,
      ),
    )
    assert.ok(
      await evaluate(
        `(()=>{const cards=[...document.querySelector('.'+hu34Ui.styles.optionalCriteria).children];return cards.every((c,i)=>!i||Math.abs(c.getBoundingClientRect().top-cards[i-1].getBoundingClientRect().bottom)<=18)})()`,
      ),
      'compact stable rows',
    )
    await noOverflow(`${width}: teacher criteria`)
    await shot(`teacher-criteria-${width}`)
    assert.ok(
      await evaluate(
        `[...document.querySelectorAll('input[type=checkbox]')].every(el=>el.labels.length>0)`,
      ),
      'associated checkbox labels',
    )
    await evaluate(
      `document.querySelectorAll('input[type=checkbox]')[1].focus()`,
    )
    assert.ok(
      await evaluate(
        `parseFloat(getComputedStyle(document.activeElement.parentElement).outlineWidth)>0`,
      ),
      'visible criterion focus',
    )
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: ' ',
      code: 'Space',
      windowsVirtualKeyCode: 32,
    })
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: ' ',
      code: 'Space',
      windowsVirtualKeyCode: 32,
    })
    await wait(`!document.querySelectorAll('input[type=checkbox]')[1].checked`)
    await button('Datos académicos')
    await wait(`document.body.innerText.includes('Primero guarda')`)
    assert.equal(await evaluate(`!!document.querySelector('[aria-labelledby="academic-import-title"]')`), false)
    await reset(auto)
    await wait(`document.getElementById('configuration-title')`)
    for (const label of ['Datos académicos', 'Revisar y aplicar', 'Historial']) {
      if (label === 'Datos académicos') await evaluate(`hu34Ui.mode='history'`)
      await button(label)
      await pause(100)
      if (label === 'Datos académicos') {
        await wait(`document.body.innerText.includes('202600002')`)
        const importLayout = await evaluate(
          `(()=>{const panel=document.querySelector('[aria-labelledby="academic-import-title"]');const guide=panel.querySelector('[aria-label="Columnas de la plantilla CSV"]');const dropzone=panel.querySelector('[role="region"][aria-label="Zona para cargar datos académicos en formato CSV"]');const fileInput=panel.querySelector('input[type=file]');return {title:panel.querySelector('h3').textContent.trim(),descriptions:[...panel.querySelectorAll('h3 + p, h3 + p + p')].map(p=>p.textContent.trim()),columns:[...guide.children].map(item=>item.textContent.trim()),guideClientWidth:guide.clientWidth,guideScrollWidth:guide.scrollWidth,dropzone:!!dropzone,fileInputLabel:fileInput.getAttribute('aria-label'),templateButton:[...panel.querySelectorAll('button')].some(b=>b.textContent.includes('Descargar plantilla CSV')),panelWidth:panel.clientWidth,panelScrollWidth:panel.scrollWidth,generateButton:[...panel.querySelectorAll('button')].find(b=>b.textContent.includes('Validar y generar vista previa'))?.textContent.trim()}})()`,
        )
        assert.equal(importLayout.title, 'Importar datos académicos')
        assert.deepEqual(importLayout.columns, [
          'SIS',
          'Nombre completo',
          'Nota Primer parcial',
          'Nota Segundo parcial',
          'Asistencias',
          'Total de clases',
        ])
        assert.ok(
          importLayout.descriptions.some((text) =>
            text.includes('Carga los datos académicos'),
          ),
        )
        assert.ok(
          importLayout.descriptions.some((text) =>
            text.includes('evaluar automáticamente los criterios'),
          ),
        )
        assert.ok(importLayout.dropzone && importLayout.templateButton)
        assert.equal(
          importLayout.fileInputLabel,
          'Seleccionar archivo CSV de datos académicos',
        )
        assert.equal(
          importLayout.generateButton,
          'Validar y generar vista previa',
        )
        assert.ok(
          importLayout.panelScrollWidth <= importLayout.panelWidth + 1,
          `${width}px academic import card fits its container: ${JSON.stringify(importLayout)}`,
        )
        if (width === 320) {
          const sample =
            'sis,nombre_completo,nota_pp,nota_sp,asistencias,total_clases\n202600001,Juan Perez,28,32,18,20\n'
          await uploadAcademicCsv('datos_iniciales.csv', sample)
          await wait(
            `document.body.innerText.includes('datos_iniciales.csv')&&![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Validar y generar vista previa'))?.disabled`,
          )
          assert.ok(
            await evaluate(
              `document.body.innerText.includes('Reemplazar archivo')&&document.body.innerText.includes('Quitar archivo')`,
            ),
          )
          await uploadAcademicCsv('datos_reemplazados.csv', sample)
          await wait(
            `document.body.innerText.includes('datos_reemplazados.csv')`,
          )
          await button('Quitar archivo')
          assert.ok(
            await evaluate(
              `![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Validar y generar vista previa'))||[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Validar y generar vista previa')).disabled`,
            ),
          )
          await uploadAcademicCsv('datos_academicos.csv', sample)
          await wait(
            `document.body.innerText.includes('datos_academicos.csv')&&![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Validar y generar vista previa'))?.disabled`,
          )
          await button('Validar y generar vista previa')
          await wait(
            `document.querySelector('[aria-labelledby="academic-preview-title"] tbody tr')`,
          )
          const preparedCsv = await evaluate(
            `hu34Ui.importedCsv.trim().split(/\\r?\\n/)`,
          )
          assert.deepEqual(preparedCsv, [
            'sis,assessment_key,was_taken,score,attended_classes,total_classes',
            '202600001,FIRST_PARTIAL,true,28,18,20',
            '202600001,SECOND_PARTIAL,true,32,18,20',
          ])
          const previewText = await evaluate(
            `document.querySelector('[aria-labelledby="academic-preview-title"]').innerText`,
          )
          assert.match(previewText, /Juan Perez/)
          assert.match(previewText, /Asistencia/)
          assert.match(previewText, /90 %/)
          assert.match(previewText, /Promedio/)
          assert.doesNotMatch(previewText, /Evaluaciones rendidas/)
          assert.doesNotMatch(previewText, /assessment_key|was_taken/)
          await button('Confirmar importación')
          await wait(
            `document.body.innerText.includes('Importación confirmada: 1 registros creados.')`,
          )
        }
        const academicLayout = await evaluate(
          `(()=>{const panel=document.querySelector('.'+hu34Ui.styles.panel+ ' h3.'+hu34Ui.styles.recordsHeading).parentElement;const heading=panel.querySelector('.'+hu34Ui.styles.recordsHeading);const toolbar=panel.querySelector('.'+hu34Ui.styles.recordsToolbar);const form=toolbar.querySelector('form');const input=form.querySelector('input');const button=form.querySelector('button');const table=panel.querySelector('.'+hu34Ui.styles.tableWrap);const rect=el=>el.getBoundingClientRect();return {headingBottom:rect(heading).bottom,toolbarTop:rect(toolbar).top,toolbarBottom:rect(toolbar).bottom,formRight:rect(form).right,panelContentRight:rect(panel).right-Number.parseFloat(getComputedStyle(panel).paddingRight),formWidth:rect(form).width,inputWidth:rect(input).width,inputTop:rect(input).top,buttonTop:rect(button).top,tableTop:rect(table).top,placeholder:input.placeholder,label:input.labels[0]?.textContent.trim(),buttonLabel:button.textContent.trim()}})()`,
        )
        assert.ok(
          academicLayout.headingBottom < academicLayout.toolbarTop,
          `${width}px title separated from toolbar`,
        )
        assert.ok(
          academicLayout.tableTop - academicLayout.toolbarBottom >= 16,
          `${width}px toolbar separated from table`,
        )
        assert.ok(
          academicLayout.inputWidth > 200 &&
            academicLayout.formRight <= academicLayout.panelContentRight + 1,
          `${width}px usable search toolbar`,
        )
        assert.equal(academicLayout.placeholder, 'SIS o nombre del estudiante')
        assert.equal(academicLayout.label, 'Buscar por SIS o estudiante')
        assert.equal(academicLayout.buttonLabel, 'Buscar')
        if (width <= 640) {
          assert.ok(
            academicLayout.inputTop < academicLayout.buttonTop,
            `${width}px search input stacks above button`,
          )
        } else {
          assert.ok(
            Math.abs(
              academicLayout.panelContentRight - academicLayout.formRight,
            ) <= 1,
            `${width}px toolbar aligns to panel right`,
          )
        }
        await noOverflow(`${width}: academic search and records`)
      }
      if (label === 'Revisar y aplicar') {
        await button('Generar revisión de habilitaciones')
        await wait(`document.getElementById('review-summary-title')`)
        const previewPayload = await evaluate(
          `hu34Ui.calls.find(call=>call.method==='post'&&call.url.endsWith('/evaluations/preview')).payload`,
        )
        assert.deepEqual(previewPayload, {
          configuration_revision: 4,
          catalog_revision: 'catalog-r7',
        })
        // HU34 E1: the result cards became a table with a detail panel. The same facts are asserted
        // on the new markup («Estado efectivo» is now «Estado final propuesto», «Se actualizará» is
        // «Se actualizará el registro», and the protected decision is the «Protegido» tag).
        // Nobody changes state in this snapshot, so the default filter «Solo cambios» is empty.
        const initial = await reviewState()
        assert.deepEqual(initial.pressed, ['Solo cambios (0)'])
        assert.deepEqual(initial.filters, ['Todos (3)', 'Solo cambios (0)', 'Habilitados (0)', 'Inhabilitados (1)', 'Pendientes (2)', 'Protegidos (1)'])
        assert.equal(initial.rows.length, 0)
        assert.ok(initial.text.includes('Ningún estudiante cambia de estado con esta evaluación.'))
        await noOverflow(`${width}: empty review filter`)
        await reviewFilter('Todos')
        const all = await reviewState()
        assert.equal(all.rows.length, 3)
        const brunoRow = all.rows.find((row) => row[0] === 'Bruno Inscrito Demo')
        const pendingRow = all.rows.find((row) => row[0] === 'Estudiante de prueba')
        assert.deepEqual(brunoRow.slice(1, 4), ['QA-003', 'Inhabilitado', 'Inhabilitado Protegido'])
        assert.deepEqual(pendingRow.slice(1, 4), ['QA-001', 'Habilitado', 'Pendiente Se conserva el estado actual'])
        await openDetail('Bruno Inscrito Demo')
        const bruno = await dialogState()
        assert.deepEqual([bruno.title, bruno.modal, bruno.inside, bruno.focusInside], ['Bruno Inscrito Demo', true, true, true], `${width}px detail panel`)
        await closeDialog()
        assert.equal(await evaluate(`document.activeElement?.getAttribute('aria-label')`), 'Ver detalle de Bruno Inscrito Demo', 'focus returns to the row action')
        await openDetail('Estudiante de prueba')
        const noOverride = await dialogState()
        await closeDialog()
        assert.deepEqual({ bruno: bruno.metrics, decision: brunoRow[3], notice: bruno.notice, reason: bruno.reason, noOverride: noOverride.metrics }, {
          bruno: {
            'Estado actual': 'Inhabilitado',
            'Motivo actual': '—',
            'Estado final propuesto': 'Inhabilitado',
            'Resultado calculado': 'Habilitado',
            'Cambia de estado': 'No',
            'Se actualizará el registro': 'No',
          },
          decision: 'Inhabilitado Protegido',
          notice: 'Se conserva la decisión vigente. Protegido.',
          reason: 'Se conserva la decisión manual vigente.',
          noOverride: {
            'Estado actual': 'Habilitado',
            'Motivo actual': '—',
            'Estado final propuesto': 'Pendiente',
            'Resultado calculado': 'Pendiente',
            'Cambia de estado': 'No',
            'Se actualizará el registro': 'No',
          },
        })
        assert.equal(noOverride.notice, null)
        assert.equal(noOverride.criteria.length, 1)
        assert.deepEqual(await reviewSummary(), { 'Total evaluado': 3, 'Habilitados propuestos': 0, 'Inhabilitados propuestos': 1, 'Sin decisión propuesta': 0, 'Solo trazabilidad': 0, Pendientes: 2, 'Cambios de estado': 0, 'Decisiones protegidas': 1 })
        await noOverflow(`${width}: populated pending results`)
      }
      if (label === 'Historial') {
        await wait(
          `document.body.innerText.includes('Bruno Inscrito Demo')&&document.body.innerText.includes('Pendiente de confirmación')`,
        )
        const historySummary = await evaluate(
          `(()=>{const grid=document.querySelector('.'+hu34Ui.styles.historyGrid);const academicCards=[...grid.children[0].querySelectorAll('.'+hu34Ui.styles.historyItem)];const evalCards=[...grid.children[1].querySelectorAll('.'+hu34Ui.styles.historyItem)];return {academic:academicCards.map(card=>({text:card.innerText,heading:card.querySelector('h4')?.textContent.trim(),hasDetails:!!card.querySelector('details')})),evaluations:evalCards.map(card=>({text:card.innerText,hasDetails:!!card.querySelector('details'),times:[...card.querySelectorAll('time')].map(time=>time.dateTime)}))}})()`,
        )
        assert.equal(
          historySummary.academic[0].heading,
          'Corrección de datos académicos',
        )
        assert.match(
          historySummary.academic[0].text,
          /Bruno Inscrito Demo · SIS 202600002/,
        )
        assert.match(
          historySummary.academic[0].text,
          /Primer parcial · Nota\s+25 → 30/,
        )
        assert.match(
          historySummary.academic[0].text,
          /Segundo parcial · Nota\s+25 → 30/,
        )
        assert.match(
          historySummary.academic[0].text,
          /Asistencia\s+17 \/ 20 → 18 \/ 20/,
        )
        assert.match(
          historySummary.academic[0].text,
          /Motivo\s+Prueba HU34: corrección de notas y preservación de decisión manual/,
        )
        assert.match(historySummary.academic[0].text, /Responsable: Usuario #9/)
        assert.equal(historySummary.academic[0].hasDetails, false)
        assert.doesNotMatch(
          historySummary.academic[0].text,
          /student_id|old_values|new_values|assessment_key|ACADEMIC_RECORD_CORRECTED/,
        )
        assert.equal(
          historySummary.academic[1].heading,
          'Importación de datos académicos',
        )
        assert.equal(historySummary.academic[1].hasDetails, false)
        assert.match(
          historySummary.evaluations[0].text,
          /Evaluación de habilitación/,
        )
        assert.match(historySummary.evaluations[0].text, /Estado: Confirmada/)
        assert.match(
          historySummary.evaluations[0].text,
          /3 estudiantes evaluados/,
        )
        assert.match(
          historySummary.evaluations[0].text,
          /1 habilitación actualizada · 2 sin cambios/,
        )
        assert.match(
          historySummary.evaluations[0].text,
          /1 decisión manual preservada/,
        )
        assert.match(historySummary.evaluations[0].text, /2 pendientes/)
        assert.match(
          historySummary.evaluations[1].text,
          /Estado: Pendiente de confirmación/,
        )
        assert.equal(historySummary.evaluations[0].hasDetails, false)
        assert.doesNotMatch(
          historySummary.evaluations[0].text,
          /preview_id|eligibility_policy_id|evaluation_id|exam_id|UUID|Política|versión|revisión/,
        )
        assert.deepEqual(historySummary.evaluations[0].times, [
          '2026-11-03T14:00:00Z',
        ])
        await button('Ver resultados')
        await wait(
          `document.body.innerText.includes('Detalle histórico de la evaluación')`,
        )
      }
      await noOverflow(`${width}: ${label}`)
    }
    await reset('/admin/eligibility-policies')
    await wait(`document.querySelector('.'+hu34Ui.styles.criterionCatalogCard)`)
    const catalogLayout = await evaluate(
      `(()=>{const grid=document.querySelector('.'+hu34Ui.styles.criterionCatalog);return {count:grid.children.length,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,text:document.body.innerText}})()`,
    )
    assert.equal(catalogLayout.count, 6)
    if (width <= 390) assert.equal(catalogLayout.columns, 1)
    else assert.ok(catalogLayout.columns >= 1)
    assert.match(catalogLayout.text, /Criterios de habilitación/)
    assert.match(catalogLayout.text, /Promedio mínimo de evaluaciones/)
    assert.match(catalogLayout.text, /Inactivo/)
    assert.doesNotMatch(catalogLayout.text, /Política|Versión/)
    await noOverflow(`${width}: admin criterion catalog`)
    if (width === 1440) await shot(`admin-criteria-${width}`)
    result.widths.push({
      width,
      checks: [
        'catalog criteria and active/inactive states',
        'responsive catalog layout',
        'no horizontal overflow',
      ],
    })
    console.log(
      `PASS ${width}px: catálogo de criterios, adaptación responsive; sin desborde`,
    )
  }
  // U3.3: shared page contract (PageContainer + PageHeader) for both eligibility pages in their loaded,
  // error and invalid-id states: one main and one h1 (32/24px, bold), 1280px container, header outside
  // any card, breadcrumbs kept exactly, header actions inside the header, no horizontal overflow.
  const contractStates = [
    { name: 'habilitaciones cargada', path: '/teacher/exams/17/eligibilities?view=past&search=QA&page=2', title: 'Habilitaciones del examen',
      crumbs: ['Mis exámenes', 'Habilitaciones'], actions: ['Habilitación automática', 'Volver al examen'], ready: "document.body.innerText.includes('Condiciones de revisión manual')" },
    { name: 'habilitaciones error', path: '/teacher/exams/17/eligibilities', examError: 'No se pudo consultar el examen.', title: 'Habilitaciones del examen',
      crumbs: ['Mis exámenes', 'Habilitaciones'], actions: ['Habilitación automática', 'Volver al examen'], ready: "!!document.querySelector('main [role=alert]')" },
    { name: 'habilitaciones id no válido', path: '/teacher/exams/abc/eligibilities', title: 'Habilitaciones del examen', crumbs: [], actions: [],
      ready: "document.body.innerText.includes('El identificador del examen no es válido.')" },
    { name: 'automática cargada', path: auto, title: 'Habilitación automática', crumbs: ['Mis exámenes', 'Habilitaciones', 'Habilitación automática'],
      actions: ['Volver a Habilitaciones'], ready: "!!document.getElementById('configuration-title')" },
    { name: 'automática error', path: auto, examError: 'No se pudo consultar el examen.', title: 'Habilitación automática',
      crumbs: ['Mis exámenes', 'Habilitaciones', 'Habilitación automática'], actions: ['Volver a Habilitaciones'], ready: "document.body.innerText.includes('No se pudo consultar el examen.')" },
    { name: 'automática id no válido', path: '/teacher/exams/abc/eligibilities/automatic', title: 'Habilitación automática', crumbs: [], actions: [],
      ready: "document.body.innerText.includes('El identificador del examen no es válido.')" },
  ]
  const contractFailures = []
  for (const width of [320, 390, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false })
    for (const state of contractStates) {
      await evaluate(`hu34Ui.examError=${JSON.stringify(state.examError ?? null)}`)
      await reset(state.path)
      await wait(state.ready)
      await pause(120)
      const page = await evaluate(`(()=>{const h=[...document.querySelectorAll('h1')],h1=h[0],s=getComputedStyle(h1),header=h1.closest('header'),container=h1.closest('section[aria-labelledby]');
        let wrapped=false;for(let el=h1.parentElement;el&&el.tagName!=='MAIN';el=el.parentElement){const c=getComputedStyle(el);if(c.boxShadow!=='none'||c.backgroundColor==='rgb(255, 255, 255)')wrapped=true}
        const nav=document.querySelector('nav[aria-label="Ruta de navegación"]');
        return {mains:document.querySelectorAll('main').length,h1s:h.length,title:h1.textContent.trim(),size:s.fontSize,weight:s.fontWeight,
          maxWidth:container?getComputedStyle(container).maxWidth:null,labelled:container?.getAttribute('aria-labelledby')===h1.id,wrapped,
          crumbs:nav?[...nav.querySelectorAll('li')].map(li=>li.textContent.trim()):[],
          actions:${JSON.stringify(state.actions)}.map(t=>{const a=[...document.querySelectorAll('a')].find(a=>a.textContent.trim()===t);return a&&header?.contains(a)?t:null}),
          overflow:document.documentElement.scrollWidth>innerWidth+1}})()`)
      const problems = []
      if (page.mains !== 1 || page.h1s !== 1 || page.title !== state.title) problems.push(`main/h1 ${page.mains}/${page.h1s} «${page.title}»`)
      if (page.size !== (width <= 640 ? '24px' : '32px') || page.weight !== '700') problems.push(`h1 ${page.size}/${page.weight}`)
      if (page.maxWidth !== '1280px' || !page.labelled) problems.push(`contenedor ${page.maxWidth} etiquetado=${page.labelled}`)
      if (page.wrapped) problems.push('cabecera dentro de una tarjeta')
      if (JSON.stringify(page.crumbs) !== JSON.stringify(state.crumbs)) problems.push('migas ' + JSON.stringify(page.crumbs))
      if (page.actions.some((action) => action === null)) problems.push('acciones fuera de la cabecera ' + JSON.stringify(page.actions))
      if (page.overflow) problems.push('desbordamiento horizontal')
      if (width === 390 || width === 1440) await shot(`u33-${state.name.replaceAll(' ', '-')}-${width}`)
      if (problems.length) contractFailures.push(`${width}px ${state.name}: ${problems.join(' · ')}`)
      console.log(`${problems.length ? 'FAIL' : 'PASS'} ${width}px contrato de página: ${state.name}${problems.length ? ': ' + problems.join(' · ') : ''}`)
    }
  }
  await evaluate('hu34Ui.examError=null')
  result.contract = contractFailures
  assert.deepEqual(contractFailures, [], 'contrato de página de habilitaciones')
  for (const onlyTaken of [false, true]) {
    await evaluate(`(()=>{hu34Ui.reset(${JSON.stringify(auto)},'correction');hu34Ui.configuration={...hu34Ui.configuration,mandatory_criteria:[],inactive_criteria:[],selected_criteria:onlyTaken?hu34Ui.configuration.selected_criteria.filter(c=>c.code==='PREVIOUS_ASSESSMENTS_TAKEN'):[]}})()`.replace('onlyTaken?', `${onlyTaken}?`))
    await wait(`document.getElementById('configuration-title')`)
    await button('Datos académicos')
    await wait(`document.body.innerText.includes('QA-081')`)
    const headers = await evaluate(`[...document.querySelectorAll('table.'+hu34Ui.styles.academicRecordsTable+' th')].map(el=>el.textContent)`)
    assert.deepEqual(headers, onlyTaken
      ? ['Estudiante', 'SIS', 'Rindió Primer parcial', 'Rindió Segundo parcial', 'Revisión', 'Acción']
      : ['Estudiante', 'SIS', 'Nota Primer parcial', 'Nota Segundo parcial', 'Asistencia', '% asistencia', 'Promedio', 'Revisión', 'Acción'])
    await button('Corregir')
    const correction = await evaluate(`'form.'+hu34Ui.styles.correction`)
    assert.equal(await evaluate(`document.querySelectorAll(${JSON.stringify(correction)}+' input[type=number]').length`), onlyTaken ? 0 : 4)
    if (onlyTaken) {
      assert.ok(await evaluate(`[...document.querySelectorAll(${JSON.stringify(correction)}+' select')].every(el=>el.disabled)`))
      assert.ok(await evaluate(`document.body.innerText.includes('nota oculta registrada')`))
    }
  }
  result.checks.push('no-criteria fallback and taken-only corrections protect existing hidden scores')
  // D1: one persisted score, inactive attendance, and hidden values survive correction.
  await evaluate(`(()=>{hu34Ui.reset(${JSON.stringify(auto)},'correction');const saved=hu34Ui.configuration;hu34Ui.configuration={...saved,mandatory_criteria:[],selected_criteria:saved.selected_criteria.filter(c=>c.code==='MIN_ASSESSMENT_SCORE'||c.code==='MIN_ATTENDANCE_PERCENTAGE'),inactive_criteria:saved.selected_criteria.filter(c=>c.code==='MIN_ATTENDANCE_PERCENTAGE')}})()`)
  await wait(`document.getElementById('configuration-title')`)
  await button('Datos académicos')
  await wait(`document.body.innerText.includes('QA-081')`)
  const recordHeaders = () => evaluate(`[...document.querySelectorAll('table.'+hu34Ui.styles.academicRecordsTable+' th')].map(el=>el.textContent)`)
  assert.deepEqual(await recordHeaders(), ['Estudiante','SIS','Nota Primer parcial','Revisión','Acción'])
  await button('Corregir')
  const dynamicForm = await evaluate(`'form.'+hu34Ui.styles.correction`)
  assert.equal(await evaluate(`document.querySelectorAll(${JSON.stringify(dynamicForm)}+' fieldset').length`), 1)
  assert.equal(await evaluate(`document.querySelectorAll(${JSON.stringify(dynamicForm)}+' input[type=number]').length`), 1)
  await input(dynamicForm+' textarea', 'Conservar datos ocultos')
  await button('Guardar corrección')
  await wait(`hu34Ui.calls.some(c=>c.method==='patch')`)
  const hiddenPayload = await evaluate(`hu34Ui.calls.find(c=>c.method==='patch').payload`)
  assert.deepEqual(hiddenPayload.assessments, {FIRST_PARTIAL:{was_taken:true,score:25},SECOND_PARTIAL:{was_taken:true,score:25}})
  assert.equal(hiddenPayload.attended_classes, 5)
  assert.equal(hiddenPayload.total_classes, 10)
  await button('Configurar criterios')
  await wait(`document.getElementById('configuration-title')`)
  await select('.'+await evaluate('hu34Ui.styles.optionalCriteria')+' select', 'SECOND_PARTIAL')
  await button('Datos académicos')
  await wait(`document.body.innerText.includes('Primero guarda')`)
  assert.equal(await evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Descargar plantilla CSV'))`), false)
  assert.deepEqual(await recordHeaders(), ['Estudiante','SIS','Nota Primer parcial','Revisión','Acción'])
  await button('Configurar criterios')
  await button('Guardar configuración')
  await wait(`document.body.innerText.includes('Configuración guardada')`)
  await button('Datos académicos')
  await wait(`[...document.querySelectorAll('th')].some(el=>el.textContent==='Nota Segundo parcial')`)
  assert.deepEqual(await recordHeaders(), ['Estudiante','SIS','Nota Segundo parcial','Revisión','Acción'])
  assert.ok(await evaluate(`!!document.querySelector('[aria-labelledby="academic-import-title"]')`))
  result.checks.push('persisted columns, inactive attendance, hidden correction data and unsaved CSV block')
  await evaluate(
    `(()=>{const saved=hu34Ui.configuration;hu34Ui.reset(${JSON.stringify(auto)});hu34Ui.configuration={...saved,mandatory_criteria:[],inactive_criteria:[],selected_criteria:saved.selected_criteria.filter(c=>c.code==='MIN_ATTENDANCE_PERCENTAGE')}})()`,
  )
  await wait(`document.querySelector('input[type=checkbox]')`)
  await button('Datos académicos')
  const csvGuide = `[...document.querySelectorAll('[aria-label="Columnas de la plantilla CSV"] span')].map(el=>el.textContent)`
  await wait(`${csvGuide}.length > 0`)
  assert.deepEqual(await evaluate(csvGuide), [
    'SIS', 'Nombre completo', 'Rindió Primer parcial', 'Asistencias', 'Total de clases',
  ])
  const downloadedHeader = await evaluate(`(async () => {
    const createObjectURL = URL.createObjectURL
    const anchorClick = HTMLAnchorElement.prototype.click
    let downloaded
    URL.createObjectURL = (blob) => {
      downloaded = blob.text()
      return createObjectURL.call(URL, blob)
    }
    HTMLAnchorElement.prototype.click = function () {
      if (!this.download) anchorClick.call(this)
    }
    try {
      const download = [...document.querySelectorAll('button')]
        .find(button => button.textContent.includes('Descargar plantilla CSV'))
      download.click()
      return (await downloaded).trim()
    } finally {
      URL.createObjectURL = createObjectURL
      HTMLAnchorElement.prototype.click = anchorClick
    }
  })()`)
  assert.equal(downloadedHeader, 'sis,nombre_completo,rindio_pp,asistencias,total_clases')
  await uploadAcademicCsv(
    'asistencia.csv',
    downloadedHeader + '\n202600001,Juan Perez,Sí,18,20\n',
  )
  await wait(`[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Validar y generar vista previa')&&!b.disabled)`)
  await button('Validar y generar vista previa')
  await wait(`document.querySelector('[aria-labelledby="academic-preview-title"] tbody tr')`)
  const previewCells = (selector) => evaluate(
    `[...document.querySelectorAll('[aria-labelledby="academic-preview-title"] ${selector}')].map(cell => cell.textContent.trim())`,
  )
  assert.deepEqual(await previewCells('thead th'), [
    'SIS', 'Nombre completo', 'Rindió Primer parcial', 'Asistencia', '% asistencia', 'Estado de validación',
  ])
  assert.deepEqual((await previewCells('tbody tr:first-child td')).slice(0, 4), [
    '202600001', 'Juan Perez', 'Sí', '18 / 20',
  ])
  assert.deepEqual(await evaluate(`hu34Ui.importedCsv.trim().split(/\\r?\\n/)`), [
    'sis,assessment_key,was_taken,score,attended_classes,total_classes',
    '202600001,FIRST_PARTIAL,true,,18,20',
  ])
  result.checks.push('attendance CSV and preview use only the selected fields and required assessment status')
  const arrayGroup = `document.querySelector('fieldset.'+hu34Ui.styles.assessmentOptions)`
  const remountKeepingConfiguration = async () => {
    await evaluate(
      `(()=>{const saved=hu34Ui.configuration;hu34Ui.reset(${JSON.stringify(auto)});hu34Ui.configuration=saved})()`,
    )
    await wait(`document.querySelector('fieldset')`)
  }
  await reset(auto)
  await wait(`document.querySelector('fieldset')`)
  assert.equal(
    await evaluate(`document.querySelectorAll('select[multiple]').length`),
    0,
  )
  await evaluate(`${arrayGroup}.querySelectorAll('input')[0].click()`)
  await evaluate(`${arrayGroup}.querySelectorAll('input')[1].click()`)
  assert.ok(
    await evaluate(
      `[...document.querySelectorAll('button')].find(b=>b.textContent==='Guardar configuración').disabled`,
    ),
  )
  await evaluate(`${arrayGroup}.querySelectorAll('input')[0].click()`)
  await evaluate(`${arrayGroup}.querySelectorAll('input')[1].focus()`)
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: ' ',
    code: 'Space',
    windowsVirtualKeyCode: 32,
  })
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: ' ',
    code: 'Space',
    windowsVirtualKeyCode: 32,
  })
  await wait(`[...${arrayGroup}.querySelectorAll('input')].every(c=>c.checked)`)
  await button('Guardar configuración')
  assert.deepEqual(
    await evaluate(
      `hu34Ui.calls.find(c=>c.method==='put').payload.criteria.find(c=>c.code==='PREVIOUS_ASSESSMENTS_TAKEN').parameters.assessment_keys`,
    ),
    ['FIRST_PARTIAL', 'SECOND_PARTIAL'],
  )
  await remountKeepingConfiguration()
  assert.deepEqual(
    await evaluate(
      `[...${arrayGroup}.querySelectorAll('input')].map(c=>c.checked)`,
    ),
    [true, true],
  )
  await evaluate(`${arrayGroup}.querySelectorAll('input')[0].click()`)
  await button('Guardar configuración')
  assert.deepEqual(
    await evaluate(
      `hu34Ui.calls.find(c=>c.method==='put').payload.criteria.find(c=>c.code==='PREVIOUS_ASSESSMENTS_TAKEN').parameters.assessment_keys`,
    ),
    ['SECOND_PARTIAL'],
  )
  await remountKeepingConfiguration()
  assert.deepEqual(
    await evaluate(
      `[...${arrayGroup}.querySelectorAll('input')].map(c=>c.checked)`,
    ),
    [false, true],
  )
  assert.ok(
    await evaluate(
      `document.querySelector('input[type=checkbox]').checked&&document.querySelector('input[type=checkbox]').disabled`,
    ),
  )
  result.checks.push(
    'two assessments persisted/reloaded; uncheck one preserves other; required remains locked',
  )

  await reset(auto, 'records-error')
  await button('Datos académicos')
  await wait(
    `document.body.innerText.includes('La búsqueda debe ser texto')&&document.body.innerText.includes('Importar datos académicos')`,
  )
  const schemaCalls = await evaluate(
    `hu34Ui.calls.filter(c=>c.url.endsWith('/import-schema')).length`,
  )
  assert.ok(
    await evaluate(
      `!Object.hasOwn(hu34Ui.calls.find(c=>c.url.endsWith('/academic-records')).params,'search')`,
    ),
  )
  await shot('schema-visible-records-error')
  await evaluate(`hu34Ui.mode='normal'`)
  await button('Recargar registros')
  await wait(`document.body.innerText.includes('No hay registros académicos')`)
  assert.equal(
    await evaluate(
      `hu34Ui.calls.filter(c=>c.url.endsWith('/import-schema')).length`,
    ),
    schemaCalls,
  )
  await reset(auto, 'schema-error')
  await button('Datos académicos')
  await wait(
    `document.body.innerText.includes('Reintentar esquema CSV')&&document.body.innerText.includes('No hay registros académicos')`,
  )
  const recordCalls = await evaluate(
    `hu34Ui.calls.filter(c=>c.url.endsWith('/academic-records')).length`,
  )
  await evaluate(`hu34Ui.mode='normal'`)
  await button('Reintentar esquema CSV')
  await wait(`document.body.innerText.includes('Importar datos académicos')`)
  assert.equal(
    await evaluate(
      `hu34Ui.calls.filter(c=>c.url.endsWith('/academic-records')).length`,
    ),
    recordCalls,
  )
  await reset(auto, 'late-academic')
  await button('Datos académicos')
  await wait(`hu34Ui.lateSchema&&hu34Ui.lateRecords`)
  await evaluate(`hu34Ui.mode='normal';hu34Ui.offeringId=9`)
  await input('input[type=search]', '9')
  await wait(
    `hu34Ui.calls.some(c=>c.url==='/academic-offerings/9/academic-records')&&document.body.innerText.includes('Importar datos académicos')`,
  )
  await evaluate(`hu34Ui.lateSchema();hu34Ui.lateRecords()`)
  await pause(160)
  assert.ok(
    await evaluate(
      `!document.body.innerText.includes('OLD_OFFERING')&&document.body.innerText.includes('No hay registros académicos')`,
    ),
  )
  result.checks.push(
    'independent schema/records loading, errors and retries; empty search omitted; late other-offering responses ignored',
  )

  await reset(auto, 'correction-conflict')
  await button('Datos académicos')
  await wait(`document.body.innerText.includes('QA-081')`)
  await button('Corregir')
  const correctionForm = await evaluate(`'form.'+hu34Ui.styles.correction`)
  const firstStatus = `${correctionForm} fieldset:nth-of-type(1) select`
  const firstScore = `${correctionForm} fieldset:nth-of-type(1) input[type=number]`
  const secondScore = `${correctionForm} fieldset:nth-of-type(2) input[type=number]`
  const attendanceGrid = `${correctionForm} .${await evaluate(`hu34Ui.styles.formGrid`)}`
  const attendedClasses = `${attendanceGrid} > label:nth-child(1) input`
  const totalClasses = `${attendanceGrid} > label:nth-child(2) input`
  const reason = `${correctionForm} textarea`
  await wait(`document.querySelector(${JSON.stringify(reason)})`)
  await select(firstStatus, 'not_taken')
  assert.equal(
    await evaluate(
      `document.querySelector(${JSON.stringify(firstScore)}).disabled`,
    ),
    true,
  )
  await select(firstStatus, 'taken')
  await input(firstScore, '30')
  await input(secondScore, '30')
  await input(attendedClasses, '0')
  await input(totalClasses, '12')
  await input(reason, 'Actualización de acta verificada')
  assert.deepEqual(
    await evaluate(
      `(()=>({scores:[...document.querySelectorAll(${JSON.stringify(`${correctionForm} fieldset input[type=number]`)})].map(el=>el.value),attendance:[document.querySelector(${JSON.stringify(attendedClasses)}).value,document.querySelector(${JSON.stringify(totalClasses)}).value],reason:document.querySelector(${JSON.stringify(reason)}).value}))()`,
    ),
    {
      scores: ['30', '30'],
      attendance: ['0', '12'],
      reason: 'Actualización de acta verificada',
    },
  )
  const serverRecordBeforeConflict = await evaluate(
    'structuredClone(hu34Ui.academicRecord)',
  )
  await button('Guardar corrección')
  await wait(
    `document.querySelector('[role=alert]')&&document.body.innerText.includes('El registro académico cambió en el servidor.')`,
  )
  assert.deepEqual(
    await evaluate('hu34Ui.academicRecord'),
    serverRecordBeforeConflict,
  )
  assert.equal(
    await evaluate(
      `document.querySelector(${JSON.stringify(firstScore)}).value`,
    ),
    '30',
  )
  assert.equal(
    await evaluate(
      `document.querySelector(${JSON.stringify(secondScore)}).value`,
    ),
    '30',
  )
  assert.equal(
    await evaluate(
      `document.querySelector(${JSON.stringify(attendedClasses)}).value`,
    ),
    '0',
  )
  assert.equal(
    await evaluate(`document.querySelector(${JSON.stringify(reason)}).value`),
    'Actualización de acta verificada',
  )
  await button('Recargar registros sin perder esta corrección')
  await wait(
    `document.querySelector(${JSON.stringify(reason)})&&document.querySelector(${JSON.stringify(firstScore)}).value==='30'`,
  )
  await evaluate(`hu34Ui.mode='correction'`)
  await button('Guardar corrección')
  await wait(
    `!document.querySelector(${JSON.stringify(correctionForm)})&&document.body.innerText.includes('0 / 12')`,
  )
  const correctionCall = await evaluate(
    `hu34Ui.calls.filter(call=>call.url.includes('/academic-records/81')&&call.method==='patch').at(-1)`,
  )
  assert.deepEqual(correctionCall.payload, {
    revision: 7,
    reason: 'Actualización de acta verificada',
    assessments: {
      FIRST_PARTIAL: { was_taken: true, score: 30 },
      SECOND_PARTIAL: { was_taken: true, score: 30 },
    },
    attended_classes: 0,
    total_classes: 12,
  })
  assert.ok(await evaluate(`document.body.innerText.includes('0 / 12')`))
  result.checks.push(
    'academic correction edits both scores, was_taken, reason and attendance; exact revision/payload; 409 preserves server and form state, reload and retry recover',
  )

  await reset(auto, 'criteria-conflict')
  await button('Guardar configuración')
  await wait(`document.querySelector('article [role=alert]')`)
  assert.ok(
    await evaluate(
      `document.querySelector('article [role=alert]').closest('article').querySelector('strong').textContent==='Evaluaciones previas rendidas'`,
    ),
  )
  assert.ok(
    await evaluate(
      `document.querySelector('article [role=alert]').closest('article').querySelector('input').checked`,
    ),
  )
  await reset(auto)
  await button('Revisar y aplicar')
  await button('Generar revisión de habilitaciones')
  await wait(`document.getElementById('review-summary-title')`)
  // HU34 E1: the same three facts, now read from the table filter and the detail panel.
  await reviewFilter('Pendientes')
  const pendingReview = await reviewState()
  assert.deepEqual(pendingReview.pressed, ['Pendientes (2)'])
  assert.equal(pendingReview.rows.filter((row) => row[3].startsWith('Pendiente')).length, 2)
  assert.equal(pendingReview.rows.length, 2)
  await openDetail('Estudiante de prueba')
  const pendingDetail = await dialogState()
  await closeDialog()
  await reviewFilter('Protegidos')
  await openDetail('Bruno Inscrito Demo')
  const protectedDetail = await dialogState()
  await closeDialog()
  assert.ok(
    protectedDetail.text.includes('Se conserva la decisión manual vigente.') &&
      pendingDetail.text.includes('Datos del primer parcial') &&
      pendingDetail.text.includes('Datos del segundo parcial'),
  )
  // The confirmation states the whole snapshot is applied, whatever the visible filter.
  await button('Aplicar habilitaciones')
  await wait(`document.querySelector('dialog[open]')`)
  const applyDialog = await dialogState()
  assert.equal(applyDialog.title, 'Aplicar habilitaciones')
  assert.ok(applyDialog.text.includes('los resultados de los 3 estudiantes de esta revisión, no solo los que muestra la tabla'))
  assert.deepEqual(await confirmCalls(), [])
  await button('Aplicar a 3 estudiantes')
  await wait(`document.body.innerText.includes('Proceso confirmado')`)
  assert.ok(
    await evaluate(
      `document.body.innerText.includes('No se modificaron habilitaciones')&&document.body.innerText.includes('Hay estudiantes pendientes por información insuficiente. Sus habilitaciones vigentes se conservan')&&document.body.innerText.includes('Actualizadas: 0 · Sin cambios: 1 · Decisiones manuales preservadas: 1 · Pendientes: 2')`,
    ),
  )
  await shot('confirmation-pending')
  await button('Historial')
  await wait(
    `document.querySelector('.'+hu34Ui.styles.historyGrid).children[1].querySelectorAll('time').length===2`,
  )
  assert.deepEqual(
    await evaluate(
      `[...document.querySelector('.'+hu34Ui.styles.historyGrid).children[1].querySelectorAll('article')[0].querySelectorAll('time')].map(el=>el.dateTime)`,
    ),
    ['2026-11-03T14:00:00Z'],
  )
  assert.ok(
    await evaluate(
      `document.querySelector('.'+hu34Ui.styles.historyGrid).children[1].querySelector('time').textContent.includes('10:00:00')`,
    ),
  )
  await button('Ver resultados')
  await wait(
    `document.body.innerText.includes('Detalle histórico de la evaluación')`,
  )
  assert.ok(
    await evaluate(
      `!document.querySelector('.'+hu34Ui.styles.historyGrid+' details')&&document.body.innerText.includes('Datos del primer parcial')`,
    ),
  )
  await shot('history-human-readable')
  result.checks.push(
    'computed/current/effective/update/policy metrics distinguish Bruno manual override; non-override computed/effective match; pending results, exact confirmation counters and original ISO/La Paz history',
  )

  await reset(auto)
  await wait(
    `document.getElementById('criterion-MIN_ATTENDANCE_PERCENTAGE-minimum_percentage')`,
  )
  await input('#criterion-MIN_ATTENDANCE_PERCENTAGE-minimum_percentage', '91.5')
  await input(
    '#manual-review-conditions',
    'Verificar acta y documentación entregada.',
  )
  await button('Guardar configuración')
  const saved = await evaluate(`hu34Ui.calls.find(c=>c.method==='put').payload`)
  assert.equal(saved.revision, 4)
  assert.equal(saved.catalog_revision, 'catalog-r7')
  assert.equal(
    saved.manual_review_conditions,
    'Verificar acta y documentación entregada.',
  )
  assert.ok(
    !saved.criteria.some((c) => c.code === 'SECOND_INSTANCE_PARTIAL_AVERAGE'),
  )
  assert.equal(
    saved.criteria.find((c) => c.code === 'MIN_ATTENDANCE_PERCENTAGE')
      .parameters.minimum_percentage,
    91.5,
  )
  await reset(auto, 'conflict')
  await wait(`document.getElementById('configuration-title')`)
  await input('#criterion-MIN_ATTENDANCE_PERCENTAGE-minimum_percentage', '92')
  await button('Guardar configuración')
  await wait(`document.querySelector('[role=alert]')`)
  assert.equal(
    await evaluate(
      `document.querySelector('#criterion-MIN_ATTENDANCE_PERCENTAGE-minimum_percentage').value`,
    ),
    '92',
  )
  await button('Recargar configuración del servidor')
  await wait(
    `document.querySelector('#criterion-MIN_ATTENDANCE_PERCENTAGE-minimum_percentage').value==='86'`,
  )
  await reset(auto, 'loading')
  assert.ok(
    await evaluate(
      `document.body.innerText.includes('Cargando catálogo y configuración')`,
    ),
  )
  await reset(auto, 'error')
  await wait(`document.querySelector('[role=alert]')`)
  await evaluate(`hu34Ui.mode='normal'`)
  await button('Reintentar')
  await wait(`document.getElementById('configuration-title')`)
  await reset('/admin/eligibility-policies')
  await wait(`document.querySelector('.'+hu34Ui.styles.criterionCatalogCard)`)
  await evaluate(
    `(()=>{const card=[...document.querySelectorAll('.'+hu34Ui.styles.criterionCatalogCard)].find(item=>item.querySelector('h2').textContent==='Puntaje acumulado mínimo');card.querySelector('button').click()})()`,
  )
  await input('form input', 'Puntaje acumulado mínimo actualizado')
  await input(
    'form textarea',
    'Descripción actualizada para nuevas configuraciones.',
  )
  await evaluate(`hu34Ui.mode='criterion-conflict'`)
  await button('Guardar cambios')
  await wait(`document.querySelector('[role=alert]')`)
  assert.equal(
    await evaluate(`document.querySelector('form input').value`),
    'Puntaje acumulado mínimo actualizado',
  )
  await evaluate(`hu34Ui.mode='normal'`)
  await button('Cargar revisión actual conservando mis cambios')
  await button('Guardar cambios')
  await wait(
    `document.body.innerText.includes('Los datos del criterio fueron actualizados.')`,
  )
  const criterionSaved = await evaluate(
    `hu34Ui.calls.filter(c=>c.method==='patch'&&!c.url.endsWith('/status')).at(-1)`,
  )
  assert.equal(
    criterionSaved.url,
    '/admin/eligibility-criteria/MIN_ACCUMULATED_SCORE',
  )
  assert.deepEqual(criterionSaved.payload, {
    revision: 2,
    name: 'Puntaje acumulado mínimo actualizado',
    description: 'Descripción actualizada para nuevas configuraciones.',
  })
  await evaluate(
    `(()=>{const card=[...document.querySelectorAll('.'+hu34Ui.styles.criterionCatalogCard)].find(item=>item.querySelector('h2').textContent==='Puntaje acumulado mínimo actualizado');const trigger=card.querySelectorAll('button')[1];trigger.focus();trigger.click()})()`,
  )
  await wait(`document.querySelector('dialog[role=alertdialog][open]')`)
  assert.ok(
    await evaluate(
      `document.querySelector('dialog[role=alertdialog][open]').innerText.includes('Los resultados históricos se conservan.')`,
    ),
  )
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await wait(`!document.querySelector('dialog[role=alertdialog][open]')`)
  assert.equal(await evaluate('document.activeElement.textContent.trim()'), 'Desactivar')
  await evaluate('document.activeElement.click()')
  await wait(`document.querySelector('dialog[role=alertdialog][open]')`)
  await button('Confirmar')
  await wait(
    `document.body.innerText.includes('Los resultados históricos no fueron modificados.')`,
  )
  const statusChange = await evaluate(
    `hu34Ui.calls.filter(c=>c.method==='patch'&&c.url.endsWith('/status')).at(-1)`,
  )
  assert.equal(
    statusChange.url,
    '/admin/eligibility-criteria/MIN_ACCUMULATED_SCORE/status',
  )
  assert.deepEqual(statusChange.payload, { revision: 3, status: 'INACTIVE' })
  await evaluate(
    `(()=>{const card=[...document.querySelectorAll('.'+hu34Ui.styles.criterionCatalogCard)].find(item=>item.querySelector('h2').textContent==='Puntaje acumulado mínimo actualizado');card.querySelectorAll('button')[2].click()})()`,
  )
  await wait(
    `document.querySelector('[aria-label="Historial de Puntaje acumulado mínimo actualizado"] article')`,
  )
  assert.ok(
    await evaluate(
      `document.querySelector('[aria-label="Historial de Puntaje acumulado mínimo actualizado"]').innerText.includes('Usuario #9')`,
    ),
  )
  assert.ok(
    await evaluate(
      `document.querySelector('[aria-label="Historial de Puntaje acumulado mínimo actualizado"]').innerText.includes('Nombre: Nombre anterior → Puntaje acumulado mínimo actualizado')`,
    ),
  )
  assert.ok(
    await evaluate(
      `[...document.querySelectorAll('.'+hu34Ui.styles.criterionCatalogCard)].some(card=>card.innerText.includes('Umbral mayor que 25'))`,
    ),
  )
  assert.ok(
    await evaluate(
      `!document.body.innerText.includes('Crear política')&&!document.body.innerText.includes('Agregar criterio')`,
    ),
  )
  // HU34 E2+E3: remote pagination and server-owned flags/summary.
  const installBigSnapshot = `(()=>{
      const all=Array.from({length:230},(_,index)=>{const i=index+1,k=i%10;
        const current=k===1||k===3?'INELIGIBLE':k===4?null:'ELIGIBLE';const pending=k===4,protectedRow=k===3;
        const computed=pending?'PENDING':k===2?'INELIGIBLE':'ELIGIBLE';
        const effective=protectedRow?'INELIGIBLE':pending?null:computed;
        const will=k===1||k===2||k===5;
        return {student:{id:1000+i,display_name:i===7?'Ángela Núñez Prueba':'Estudiante QA '+String(i).padStart(4,'0'),sis:'QA-'+String(i).padStart(4,'0')},computed_status:computed,current_status:current,effective_status:effective,manual_override_preserved:protectedRow,will_update:will,state_will_change:k===1||k===2,traceability_only:k===5,protected_source:protectedRow?(i===3?'MANUAL':'LEGACY'):null,current_reason:protectedRow?'Proyecto pendiente':null,effective_reason:protectedRow?'Proyecto pendiente':k===2?'Promedio insuficiente':null,reason:'Explicación automática',missing_fields:pending?['assessments.FIRST_PARTIAL']:[],criteria_results:[{code:'SECOND_INSTANCE_PARTIAL_AVERAGE',status:pending?'PENDING':'PASSED',actual_value:pending?null:30,required_value:25}],eligibility_revision:1};});
      hu34Ui.pages=()=>({...hu34Ui.evaluation,id:90,preview_id:'preview-big-90',results:{data:all,meta:{current_page:1,per_page:10,total:230,last_page:23}},summary:{total:230,eligible:184,ineligible:23,pending:23}});return true;})()`
  const openBigReview = async (mode = 'normal', expired = false) => {
    await reset(auto, mode)
    await evaluate(installBigSnapshot)
    if (expired) await evaluate('hu34Ui.expired=true')
    await wait('document.getElementById("configuration-title")')
    await button('Revisar y aplicar')
    await button('Generar revisión de habilitaciones')
    await wait('document.getElementById("review-summary-title")')
  }
  const applyButtonDisabled = () =>
    evaluate(
      `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Aplicar habilitaciones').disabled`,
    )
  const globalSummary = {
    'Total evaluado': 230,
    'Habilitados propuestos': 161,
    'Inhabilitados propuestos': 46,
    'Sin decisión propuesta': 23,
    'Solo trazabilidad': 23,
    Pendientes: 23,
    'Cambios de estado': 46,
    'Decisiones protegidas': 23,
  }
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1024,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await openBigReview()
  assert.deepEqual(
    await evaluate(
      `hu34Ui.calls.filter(c=>c.url.endsWith('/evaluations/preview')).map(c=>c.params)`,
    ),
    [{ page: 1, per_page: 10, filter: 'CHANGES', search: '' }],
  )
  assert.equal(
    await evaluate(
      `hu34Ui.calls.filter(c=>c.method==='get'&&c.url.endsWith('/evaluations/90')).length`,
    ),
    0,
  )
  assert.deepEqual(await reviewSummary(), globalSummary)
  for (const [label, filter, total] of [
    ['Todos', 'ALL', 230],
    ['Solo cambios', 'CHANGES', 46],
    ['Habilitados', 'ELIGIBLE', 161],
    ['Inhabilitados', 'INELIGIBLE', 46],
    ['Pendientes', 'PENDING', 23],
    ['Protegidos', 'PROTECTED', 23],
  ]) {
    await reviewFilter(label)
    const state = await reviewState()
    assert.equal(state.rows.length, 10)
    assert.ok(state.footer.includes('de ' + total))
    assert.deepEqual(await reviewSummary(), globalSummary)
    assert.deepEqual(
      await evaluate(
        `hu34Ui.calls.filter(c=>c.method==='get'&&c.url.endsWith('/evaluations/90')).at(-1).params`,
      ),
      { filter, search: '', page: 1, per_page: 10 },
    )
    await button('Siguiente')
    await pause(100)
    assert.ok((await reviewState()).footer.includes('Página 2'))
  }
  await reviewSearch('QA-0013')
  assert.deepEqual(
    (await reviewState()).rows.map((r) => r.slice(1, 4)),
    [['QA-0013', 'Inhabilitado', 'Inhabilitado Protegido · Heredado']],
  )
  await openDetail('Estudiante QA 0013')
  const legacy = await dialogState()
  assert.equal(legacy.metrics['Motivo actual'], 'Proyecto pendiente')
  assert.equal(legacy.reason, 'Proyecto pendiente')
  assert.ok(legacy.text.includes('Explicación automática'))
  await closeDialog()
  await reviewSearch('QA-0003')
  await openDetail('Estudiante QA 0003')
  assert.ok((await dialogState()).text.includes('Protegido · Manual'))
  await closeDialog()
  await reviewFilter('Todos')
  await reviewSearch('angela nunez')
  assert.equal(
    (await reviewState()).rows.length,
    0,
    'server search preserves accents',
  )
  assert.deepEqual(await reviewSummary(), globalSummary)
  assert.equal(
    await applyButtonDisabled(),
    false,
    'empty filtered page can apply the whole snapshot',
  )
  await reviewSearch('Ángela Núñez')
  assert.equal((await reviewState()).rows[0][1], 'QA-0007')
  await reviewSearch('QA-0005')
  await openDetail('Estudiante QA 0005')
  const trace = await dialogState()
  assert.equal(trace.metrics['Cambia de estado'], 'No')
  assert.ok(trace.text.includes('Solo trazabilidad: Sí'))
  await closeDialog()
  await reviewSearch('')
  await reviewFilter('Protegidos')
  await button('Siguiente')
  await pause(100)
  await button('Aplicar habilitaciones')
  await wait('document.querySelector("dialog[open]")')
  assert.deepEqual((await dialogState()).metrics, {
    'Habilitados propuestos': '161',
    'Inhabilitados propuestos': '46',
    'Cambios de estado': '46',
    'Solo trazabilidad': '23',
    'Sin decisión propuesta': '23',
    'Decisiones protegidas': '23',
    Pendientes: '23',
  })
  assert.deepEqual(await confirmCalls(), [])
  await button('Aplicar a 230 estudiantes')
  await wait('document.body.innerText.includes("Proceso confirmado")')
  assert.deepEqual(await confirmCalls(), [
    {
      url: '/exams/17/eligibility-automation/evaluations/preview-big-90/confirm',
      payload: null,
    },
  ])
  // A delayed response is ignored after changing filters, including transports that ignore abort.
  await openBigReview()
  await evaluate('hu34Ui.holdFilter="ALL"')
  await reviewFilter('Todos')
  assert.equal(await applyButtonDisabled(), true)
  await reviewFilter('Protegidos')
  await evaluate('hu34Ui.releaseReview()')
  await pause(100)
  assert.deepEqual((await reviewState()).pressed, ['Protegidos (23)'])
  assert.ok((await reviewState()).rows.every((r) => r[3].includes('Protegido')))
  assert.deepEqual(await reviewSummary(), globalSummary)
  // Delayed responses from an unmounted snapshot never replace the next snapshot.
  await evaluate('hu34Ui.holdFilter="ALL"')
  await reviewFilter('Todos')
  await evaluate('window.releaseOldReview=hu34Ui.releaseReview')
  await openBigReview()
  await evaluate('window.releaseOldReview()')
  await pause(100)
  assert.deepEqual((await reviewState()).pressed, ['Solo cambios (46)'])
  assert.ok((await reviewState()).rows.every((row) => row[3].endsWith('Cambia')))
  for (const mode of ['query-error', 'query-conflict', 'wrong-snapshot']) {
    await openBigReview(mode)
    await reviewFilter('Todos')
    assert.equal(await applyButtonDisabled(), true, mode)
    assert.deepEqual(await confirmCalls(), [])
  }
  for (const width of [320, 375, 640, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: width < 768,
    })
    await openBigReview()
    await noOverflow(width + ': remote review')
    await reviewFilter('Todos')
    await openDetail('Estudiante QA 0001')
    const detail = await dialogState()
    assert.deepEqual(
      [detail.modal, detail.inside, detail.focusInside],
      [true, true, true],
    )
    await closeDialog()
    await button('Aplicar habilitaciones')
    await wait('document.querySelector("dialog[open]")')
    await pause(150)
    const dialog = await dialogState()
    assert.deepEqual(
      [dialog.modal, dialog.inside, dialog.focusInside],
      [true, true, true],
    )
    await closeDialog()
    await noOverflow(width + ': after dialogs')
    const cells = await evaluate(
      `(()=>{const row=${reviewSection}.querySelector('tbody tr');const clipped=[];for(const td of row.querySelectorAll('td')){const box=td.getBoundingClientRect();for(const el of td.querySelectorAll('span,button,strong')){const r=el.getBoundingClientRect();if(r.width>0&&(r.left<box.left-1||r.right>box.right+1))clipped.push(td.dataset.label)}}return clipped})()`,
    )
    assert.deepEqual(cells, [], `${width}px cell content stays inside the table`)
    if (width === 320 || width === 1440) await shot('remote-review-' + width)
  }
  await openBigReview('normal', true)
  assert.equal(await applyButtonDisabled(), true)
  assert.deepEqual(await confirmCalls(), [])
  await openBigReview('confirm-conflict')
  await button('Aplicar habilitaciones')
  await wait('document.querySelector("dialog[open]")')
  await button('Aplicar a 230 estudiantes')
  await wait(
    'document.body.innerText.includes("La información cambió. Recarga los datos y genera una nueva revisión.")',
  )
  assert.equal(await applyButtonDisabled(), true)
  // No criteria uses the server result. A legacy protected decision remains unchanged.
  await reset(auto, 'no-criteria')
  await evaluate(
    `hu34Ui.pages=()=>({...hu34Ui.evaluation,id:91,preview_id:'no-criteria-91',configuration:{...hu34Ui.configuration,criteria:[],mandatory_criteria:[],selected_criteria:[]},results:{data:[{...hu34Ui.evaluation.results.data[0],computed_status:'ELIGIBLE',effective_status:'ELIGIBLE',current_status:'INELIGIBLE',will_update:true,state_will_change:true,criteria_results:[]},{...hu34Ui.evaluation.results.data[2],protected_source:'LEGACY',criteria_results:[]}],meta:{}},summary:{total:2,eligible:2,ineligible:0,pending:0}});true`,
  )
  await wait('document.getElementById("configuration-title")')
  await button('Revisar y aplicar')
  await button('Generar revisión de habilitaciones')
  await wait('document.getElementById("review-summary-title")')
  assert.equal((await reviewState()).rows[0][3], 'Habilitado Cambia')
  assert.equal((await reviewSummary())['Habilitados propuestos'], 1)
  await reviewFilter('Protegidos')
  assert.ok((await reviewState()).rows[0][3].includes('Heredado'))
  result.checks.push(
    'remote review: filters, search, pagination, global summary, empty page, protected sources, reasons, races, whole confirmation, no criteria and responsive',
  )
  // HU34 E4: server previews of technical MERGE files and guarded confirmation.
  const mergePanel = '[aria-labelledby="academic-merge-preview-title"]'
  const reasonInput = '#academic-merge-reason'
  const openMerge = async (mode = 'normal') => {
    await reset(auto, mode)
    await wait('document.getElementById("configuration-title")')
    await button('Datos académicos')
    await wait('document.getElementById("academic-import-mode")')
    await select('#academic-import-mode', 'MERGE')
  }
  const previewMerge = async (text, reason = 'Corrección justificada') => {
    await uploadAcademicCsv('partial.csv', text)
    await pause(100)
    await input(reasonInput, reason)
    await button('Validar y generar vista previa')
    await wait(`document.querySelector('${mergePanel}')`)
  }
  const attendanceCsv = 'sis,attended_classes,total_classes\n1,0,20\n'
  const mixedCsv =
    'sis,assessment_key,was_taken,score,attended_classes,total_classes\nNEW,,,,0,20\n1,FIRST_PARTIAL,,0,,\n1,SECOND_PARTIAL,,70,,\n1,,,,11,20\n2,,,,10,20\n'
  await openMerge()
  assert.equal(
    await evaluate('document.querySelector("#academic-merge-reason").maxLength'),
    500,
  )
  await uploadAcademicCsv('attendance.csv', attendanceCsv)
  await pause(100)
  await button('Validar y generar vista previa')
  await wait(
    'document.body.innerText.includes("Justificación obligatoria para actualizar.")',
  )
  assert.equal(await evaluate(`!!document.querySelector('${mergePanel}')`), false)
  await input(reasonInput, 'a'.repeat(500))
  await button('Validar y generar vista previa')
  await wait(`document.querySelector('${mergePanel}')`)
  assert.equal(await evaluate('hu34Ui.mergePending.reason.length'), 500)
  assert.equal(
    await evaluate('hu34Ui.importedCsv'),
    'sis,attended_classes,total_classes\r\n1,0,20\r\n',
  )
  const difference = await evaluate(
    `document.querySelector('${mergePanel}').innerText`,
  )
  assert.ok(
    difference.includes('Actualizar: 1') &&
      difference.includes('Anterior') &&
      difference.includes('Propuesto'),
  )
  assert.ok(difference.includes('Nota: 60') && difference.includes('Nota: 70'))
  await input(reasonInput, 'Nueva justificación')
  assert.equal(await evaluate(`!!document.querySelector('${mergePanel}')`), false)
  await previewMerge(mixedCsv)
  const mixed = await evaluate(
    `document.querySelector('${mergePanel}').innerText`,
  )
  assert.ok(mixed.includes('Crear: 1 · Actualizar: 1 · Sin cambios: 1'))
  assert.ok(mixed.includes('Nota: 0') && mixed.includes('Nota: 70'))
  assert.equal(await evaluate('hu34Ui.importedCsv.includes("false")'), false)
  await uploadAcademicCsv('replacement.csv', attendanceCsv)
  await pause(100)
  assert.equal(await evaluate(`!!document.querySelector('${mergePanel}')`), false)
  await button('Validar y generar vista previa')
  await wait(`document.querySelector('${mergePanel}')`)
  await select('#academic-import-mode', 'CREATE_ONLY')
  assert.equal(await evaluate(`!!document.querySelector('${mergePanel}')`), false)
  // No justification is required when all rows create records.
  await openMerge()
  await previewMerge('sis,attended_classes,total_classes\nNEW,0,20\n', '')
  await button('Confirmar importación')
  await wait('document.body.innerText.includes("Importación confirmada")')
  assert.equal(await evaluate(`!!document.querySelector('${mergePanel}')`), false)
  assert.equal(await evaluate('hu34Ui.mergeConfirmation.created_records'), 1)
  // A concurrent change invalidates the reviewed snapshot and allows regeneration.
  await openMerge('merge-conflict')
  await previewMerge(attendanceCsv)
  await button('Confirmar importación')
  await wait(
    'document.body.innerText.includes("Los datos cambiaron o la vista previa caducó")',
  )
  assert.equal(await evaluate(`!!document.querySelector('${mergePanel}')`), false)
  await evaluate('hu34Ui.mode="normal"')
  await button('Validar y generar vista previa')
  await wait(`document.querySelector('${mergePanel}')`)
  await button('Confirmar importación')
  await wait('document.body.innerText.includes("Importación confirmada")')
  // Retrying after a lost confirmation response sends the same preview and no body.
  await openMerge('merge-retry')
  await previewMerge(attendanceCsv)
  await button('Confirmar importación')
  await wait('document.body.innerText.includes("Respuesta interrumpida")')
  await button('Confirmar importación')
  await wait('document.body.innerText.includes("Importación confirmada")')
  const retries = await evaluate(
    'hu34Ui.calls.filter(c=>c.url.includes("/imports/merge-preview-")&&c.url.endsWith("/confirm")).map(c=>({url:c.url,payload:c.payload??null}))',
  )
  assert.equal(retries.length, 2)
  assert.deepEqual(retries[0], retries[1])
  assert.equal(retries[0].payload, null)
  await openMerge('merge-expired')
  await previewMerge(attendanceCsv)
  assert.equal(
    await evaluate(`document.querySelector('${mergePanel} button').disabled`),
    true,
  )
  // Backend validation can reject a taken-state change that would retain a hidden score.
  await openMerge()
  await uploadAcademicCsv(
    'invalid.csv',
    'sis,assessment_key,was_taken\n1,FIRST_PARTIAL,false\n',
  )
  await pause(100)
  await input(reasonInput, 'Revisar estado')
  await button('Validar y generar vista previa')
  await wait('document.body.innerText.includes("requiere corrección explícita")')
  assert.equal(await evaluate(`!!document.querySelector('${mergePanel}')`), false)
  for (const width of [320, 375, 640, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: width < 768,
    })
    await openMerge()
    await previewMerge(mixedCsv)
    await noOverflow(width + ': MERGE differences')
    if (width === 320 || width === 1440) await shot('merge-' + width)
  }
  // Full replacement correction accepts attendance-only records and keeps an empty assessments map.
  await reset(auto, 'correction')
  await evaluate(
    'hu34Ui.academicRecord={...hu34Ui.academicRecord,assessments:{},attended_classes:10,total_classes:20}',
  )
  await wait('document.getElementById("configuration-title")')
  await button('Datos académicos')
  await wait('document.body.innerText.includes("Estudiante de prueba")')
  await button('Corregir')
  const attendanceForm = await evaluate(`'form.'+hu34Ui.styles.correction`)
  await input(attendanceForm + ' textarea', 'Ajustar asistencia')
  await input(
    attendanceForm +
      ' .' +
      (await evaluate('hu34Ui.styles.formGrid')) +
      ' input[type=number]',
    '0',
  )
  await button('Guardar corrección')
  await wait(
    'hu34Ui.calls.some(c=>c.method==="patch"&&c.url.includes("/academic-records/"))',
  )
  const correctedAttendance = await evaluate(
    'hu34Ui.calls.find(c=>c.method==="patch"&&c.url.includes("/academic-records/")).payload',
  )
  assert.deepEqual(correctedAttendance.assessments, {})
  assert.equal(correctedAttendance.attended_classes, 0)
  assert.equal(correctedAttendance.total_classes, 20)
  assert.equal(correctedAttendance.revision, 7)
  result.checks.push(
    'MERGE attendance, zero, two assessments, before/proposed, actions, justification, invalidation, conflict, expiry, retry, responsive and attendance-only correction',
  )
  result.checks.push(
    'optional parameters/revision unchanged',
    'required not sent',
    'configuration 409/reload',
    'loading/error/retry',
    'catalog revision and manual review conditions in teacher config',
    'admin catalog name/description edit with 409 revision refresh',
    'criterion status confirmation and audit history',
    'institutional second-instance threshold is read-only and fixed',
  )
  assert.deepEqual(result.errors, [])
  console.log(
    'PASS comportamiento HU34: configuración por examen, catálogo ADMIN, revisión manual e historial. Sin llamadas backend.',
  )
} catch (error) {
  result.failure = error.stack
  throw error
} finally {
  try {
    await writeFile(
      join(output, 'browser-results.json'),
      JSON.stringify(result, null, 2) + '\n',
    )
  } finally {
    // Runs even if writing the results fails.
    ws?.close()
    await cleanupBrowserProfile(browserProfile, chrome)
    await vite?.close()
  }
}
