// Browser QA for DS2.1 and D5: real pages and Header, a data router and simulated HTTP (no backend).
// Checks computed layout at 320/390/768/1024/1440px, menus and local CSV selection with long names.
// It never confirms imports, saves or status changes. Run from the frontend root;
// requires local Chrome (EIDA_QA_CHROME overrides the path).
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'vite'
import { cleanupBrowserProfile, createBrowserProfile } from '../../../tests/browserProfile.mjs'

const baseline = process.env.EIDA_D5_PHASE === 'before'
const structuralBaseline = baseline && Boolean(process.env.EIDA_LAYOUT_BASE_REF)
const evidence = join(process.cwd(), '.validation.local', process.env.EIDA_LAYOUT_OUTPUT ?? 'visual-d5', process.env.EIDA_D5_PHASE ?? 'after')
await mkdir(evidence, { recursive: true })

// Synthetic QA fixtures (not real institutional data).
const demo = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {createMemoryRouter, RouterProvider, Link} from 'react-router';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import {ImportRoomsPage} from '/src/features/rooms/pages/ImportRoomsPage.tsx';
import {ImportSubjectsPage} from '/src/features/subjects/pages/ImportSubjectsPage.tsx';
import {AdminRoomsPage} from '/src/features/rooms/pages/AdminRoomsPage.tsx';
import {AdminSubjectsPage} from '/src/features/subjects/pages/AdminSubjectsPage.tsx';
import {AdminAcademicTermsPage} from '/src/features/academic-terms/pages/AdminAcademicTermsPage.tsx';
import {AdminNotFoundPage} from '/src/features/users/pages/AdminNotFoundPage.tsx';
import {AdminReadPage} from '/src/features/users/pages/AdminReadPage.tsx';
import {AdminNewsPage} from '/src/features/portal-news/pages/AdminNewsPage.tsx';
import {NewsPage,NewsDetailPage} from '/src/features/portal-news/pages/NewsPage.tsx';
import {AdminServicesPage} from '/src/features/portal-services/pages/AdminServicesPage.tsx';
import {ServicesPage,ServiceDetailPage} from '/src/features/portal-services/pages/ServicesPage.tsx';
import {AdminInformationPage} from '/src/features/portal-information/pages/AdminInformationPage.tsx';
import {InformationPage} from '/src/features/portal-information/pages/InformationPage.tsx';
import {AdminCalendarPage} from '/src/features/portal-calendar/pages/AdminCalendarPage.tsx';
import {AdminTeachersPage} from '/src/features/teachers/pages/AdminTeachersPage.tsx';
import {AdminCourseOfferingsPage} from '/src/features/course-offerings/pages/AdminCourseOfferingsPage.tsx';
import {AdminUserHistoryPage} from '/src/features/users/pages/AdminUserHistoryPage.tsx';
import {ManageAccounts} from '/src/features/users/pages/AdminManageUsersPage.tsx';
import {AdminUserRolesPage} from '/src/features/users/pages/AdminUserRolesPage.tsx';
import {ImportStudentsPage} from '/src/features/students/pages/ImportStudentsPage.tsx';
import {AdminManageStudentsPage} from '/src/features/students/pages/AdminManageStudentsPage.tsx';
import {ImportCourseOfferingsPage} from '/src/features/course-offerings/pages/ImportCourseOfferingsPage.tsx';
import {TeacherSubjectStudentsPage} from '/src/features/students/pages/TeacherSubjectStudentsPage.tsx';
import {ImportSubjectStudentsPage} from '/src/features/students/pages/ImportSubjectStudentsPage.tsx';
import {TeacherSubjectsPage} from '/src/features/subjects/pages/TeacherSubjectsPage.tsx';
import {TeacherStudentsPage} from '/src/features/students/pages/TeacherStudentsPage.tsx';
import {TeacherExamsPage} from '/src/features/exams/pages/TeacherExamsPage.tsx';
import {TeacherExamDetailPage} from '/src/features/exams/pages/TeacherExamDetailPage.tsx';
import {ExamCollaboratorsPage} from '/src/features/collaborations/pages/ExamCollaboratorsPage.tsx';
import {CollaboratorPage} from '/src/features/collaborations/pages/CollaboratorPage.tsx';
import {CollaborationsProvider} from '/src/features/collaborations/components/CollaborationsProvider.tsx';
import {StudentLayout} from '/src/layouts/StudentLayout/StudentLayout.tsx';
import {StudentProfilePage} from '/src/features/students/pages/StudentProfilePage.tsx';
import {StudentQrPage} from '/src/features/students/pages/StudentQrPage.tsx';
import {Header} from '/src/shared/components/Header/Header.tsx';
import {setStudentImportIdentity} from '/src/features/students/utils/studentImportDraft.ts';
setStudentImportIdentity({id:1,status:'ACTIVE',must_change_password:false,roles:['ADMINISTRADOR']});
const e=React.createElement;
const career={id:1,code:'QA-SIS',name:'Carrera QA Sistemas',status:'ACTIVE'};
const account={id:15,full_name:'Persona QA de prueba',first_names:'Persona',last_names:'QA de prueba',email:'persona.qa.con.correo.institucional.largo@example.edu',institutional_code:'QA-15',identity_number:'123',status:'ACTIVE',roles:[],student_id:null,teacher_id:null,student_status:null,teacher_status:null};
const page=(data,extra={})=>({data,meta:{current_page:1,last_page:1,total:data.length,per_page:15,from:data.length?1:null,to:data.length||null,...extra}});
const fixtures={
  '/admin/students':page([{id:8,sis_code:'QA-008',first_names:'Estudiante',last_names:'QA',email:'estudiante.qa@example.edu',status:'ACTIVE'}]),
  '/admin/academic-terms/active':{data:{id:1,name:'Periodo QA 2026',start_date:'2026-01-01',end_date:'2026-12-31',status:'ACTIVE'}},
  '/admin/users':page([account]),
  '/admin/users/15':{data:account},
  '/admin/users/15/roles':{data:[{id:2,name:'DOCENTE',status:'ACTIVE',assigned:false}]},
  '/admin/teachers':page([]),
  '/admin/users/history':page([{id:1,user_id:15,actor_id:1,actor_name:'Responsable QA con nombre y apellidos extensos',action:'ROLE_ASSIGNED',created_at:'2026-11-07T10:00:00-04:00',old_context:{},new_context:{role:'DOCENTE'}}]),
  '/admin/academic-terms':page([]),
  '/admin/course-offerings':page([]),
  '/admin/portal/event-categories':{data:[]},
  '/admin/portal/events':page([]),
  '/admin/rooms':page([{id:1,code:'QA-101',name:'Aula QA 101',location:'Bloque QA',capacity:40,status:'ACTIVE'},{id:2,code:'QA-202',name:'Laboratorio QA 202',location:'Bloque QA',capacity:25,status:'INACTIVE'}]),
  '/admin/subjects':page([{id:1,code:'QA-111',name:'Materia QA de programación',status:'ACTIVE',careers:[career]}]),
  '/admin/subjects/careers':{data:[career]},
  '/admin/careers':page([career,{id:2,code:'QA-IND',name:'Carrera QA Industrial',status:'INACTIVE'}]),
  '/admin/portal/news':{data:[{id:41,title:'Noticia QA publicada',summary:'Resumen QA.',image_url:null,published_at:'2026-11-04T10:00:00-04:00',status:'PUBLISHED',revision:1,created_by:1,updated_by:1,published_by:1},{id:42,title:'Noticia QA en borrador',summary:'Resumen QA.',image_url:null,published_at:null,status:'DRAFT',revision:1,created_by:1,updated_by:1,published_by:null}],meta:{current_page:1,last_page:1,per_page:15,total:2}},
  '/portal/news':{data:[{id:41,title:'Noticia QA publicada',summary:'Resumen QA.',image_url:null,published_at:'2026-11-04T10:00:00-04:00'}],meta:{current_page:1,last_page:1,per_page:15,total:1}},
  '/admin/portal/services':{data:[{id:42,name:'Servicio QA activo',description:'Descripción QA.',icon:'link',url:'https://qa.example.edu/activo',display_order:1,status:'ACTIVE',revision:1,needs_review:false},{id:43,name:'Servicio QA inactivo',description:'Descripción QA.',icon:'link',url:'https://qa.example.edu/inactivo',display_order:2,status:'INACTIVE',revision:1,needs_review:false}],meta:{current_page:1,last_page:1,per_page:15,total:2}},
  '/portal/services':{data:[{id:42,name:'Servicio QA activo',description:'Descripción QA.',icon:'link',url:'https://qa.example.edu/activo',display_order:1}],meta:{current_page:1,last_page:1,per_page:15,total:1}},
  '/admin/portal/information/sections':{data:[{id:144,key:'about',revision:2,is_published:true,has_unpublished_changes:false,draft:{title:'Sección QA institucional',description:'Descripción QA.',links:[],sort_order:1},published:{title:'Sección QA institucional',description:'Descripción QA.',links:[],sort_order:1},published_at:'2026-11-05T10:00:00-04:00',created_by:1,updated_by:1}],meta:{current_page:1,last_page:1,per_page:15,total:1}},
  '/portal/information':{data:{sections:[{id:1,key:'about',title:'Sección QA institucional',description:'Descripción QA.',links:[],sort_order:1}],faqs:[{id:1,question:'¿Pregunta QA?',answer:'Respuesta QA.',sort_order:1}]}},
  // DS4.1a: teacher offerings (7 manageable, 8 read-only) and the enrollments of offering 7.
  '/teacher/dashboard/subjects':{data:[
    {course_offering_id:7,subject:{code:'QA-111',name:'Materia QA de programación con un nombre largo',status:'ACTIVE'},academic_term:{name:'Periodo QA 2026',status:'ACTIVE'},status:'ACTIVE',can_manage:true},
    {course_offering_id:8,subject:{code:'QA-222',name:'Materia QA de consulta',status:'ACTIVE'},academic_term:{name:'Periodo QA 2025',status:'INACTIVE'},status:'ACTIVE',can_manage:false}]},
  '/course-offerings/7/enrollments':{data:[{id:3,sis_code:'QA-301',first_names:'Estudiante',last_names:'QA inscrito'}]},
  '/course-offerings/8/enrollments':{data:[]},
  // U1: teacher exam list (page 1 of 1). U2: student profile and exams (no QR available yet).
  '/teacher/exams':{data:[{id:5,name:'Parcial QA de programación',subject_name:'Materia QA de programación con un nombre largo',subject_code:'QA-111',exam_date:'2026-11-20',status:'SCHEDULED',start_time:'10:00:00',duration_minutes:90,academic_term_name:'Periodo QA 2026',evaluation_type:'partial',room:{id:1,name:'Aula QA 101',code:'QA-101'},course_offering_id:7}],meta:{current_page:1,last_page:1,total:1}},
  // U3.1: exam detail (loaded) and a server failure (error state, simulated 500).
  '/teacher/exams/5':{data:{id:5,name:'Parcial QA de programación',subject_name:'Materia QA de programación con un nombre largo',subject_code:'QA-111',exam_date:'2026-11-20',start_time:'10:00:00',duration_minutes:90,status:'SCHEDULED',course_offering_id:7,rules:'Sin material de consulta.',updated_at:'2026-11-08T10:00:00-04:00',can_edit:true,can_cancel:true,academic_term_name:'Periodo QA 2026',evaluation_type:'partial',room:{id:1,code:'QA-101',name:'Aula QA 101'}}},
  '/teacher/exams/99':{__status:500},
  // R3: public news/service details (loaded and server failure).
  '/portal/news/41':{data:{id:41,title:'Noticia QA publicada',summary:'Resumen QA.',content:'Contenido QA de la noticia publicada.',image_url:null,published_at:'2026-11-04T10:00:00-04:00'}},
  '/portal/news/99':{__status:500},
  '/portal/services/42':{data:{id:42,name:'Servicio QA activo',description:'Descripción QA.',icon:'link',url:'https://qa.example.edu/activo',display_order:1}},
  '/portal/services/99':{__status:500},
  // U3.2: collaborators of exam 5, the collaborator's own exams and the assign dialog's user search.
  '/exams/5/collaborators':{data:[{id:1,user_id:21,display_name:'Colaborador QA con nombre extenso',email:'colaborador.qa@example.edu',identity_number:'QA-21',profile_photo_url:null,assigned_at:'2026-11-08T10:00:00-04:00',assigned_by:1,assigned_by_name:'Docente QA'}]},
  '/me/collaborations':{data:[{exam_id:5,exam_name:'Parcial QA de programación',subject_name:'Materia QA de programación con un nombre largo',exam_date:'2026-11-20',start_time:'10:00:00',duration_minutes:90,room:'Aula QA 101'}]},
  '/users':{data:[],meta:{current_page:1,per_page:10,total:0,last_page:1}},
  '/students/profile':{message:'OK',data:{profile_photo_url:null,personal_data:{first_names:'Estudiante',last_names:'QA con apellidos extensos',identity_number:'QA-123'},academic_data:{sis_code:'QA-STU-01',email:'estudiante.qa.con.correo.institucional.largo@example.edu',career_code:'QA-SIS',career_name:'Carrera QA Sistemas'}}},
  '/students/exams':{message:'OK',data:[{exam_id:5,subject:'Materia QA de programación con un nombre largo',exam_title:'Parcial QA de programación',scheduled_at:'2026-11-20T10:00:00-04:00',qr_status:'UPCOMING',is_qr_available:false,qr_code_base64:null,token:null}]},
  '/admin/audit-logs':page([{id:1,actor_id:1,action:'UPDATE',entity_type:'Room',entity_id:1,created_at:'2026-01-01T10:00:00Z',old_context:{},new_context:{}}]),
};
const qa=window.pageLayoutQa={calls:[],unexpected:[]};
const respond=(method)=>async(url,body)=>{
  qa.calls.push({method,url});
  if(method==='get'&&qa.overrides?.[url])return Promise.reject(Object.assign(new Error('QA: simulated override'),{isAxiosError:true,response:{status:qa.overrides[url],data:{}}}));
  if(method==='get'&&fixtures[url]?.__status)throw Object.assign(new Error('QA: simulated '+fixtures[url].__status),{isAxiosError:true,response:{status:fixtures[url].__status,data:{}}});
  if(method==='get'&&fixtures[url])return {data:structuredClone(fixtures[url])};
  qa.unexpected.push(method+' '+url);
  throw Object.assign(new Error('QA: unexpected request '+method+' '+url),{isAxiosError:true,response:{status:501,data:{}}});
};
qa.client={get:respond('get'),post:respond('post'),put:respond('put'),patch:respond('patch'),delete:respond('delete')};
const routes=[
  {path:'/admin/students/manage',element:e(AdminManageStudentsPage)},
  {path:'/admin/users/manage',element:e(ManageAccounts)},
  {path:'/admin/users/roles',element:e(ManageAccounts,{rolesView:true})},
  {path:'/admin/users/:userId/roles',element:e(AdminUserRolesPage)},
  {path:'/admin/students/import',element:e(ImportStudentsPage)},
  {path:'/admin/teachers/assignments/import',element:e(ImportCourseOfferingsPage)},
  {path:'/admin/teachers',element:e(AdminTeachersPage)},
  {path:'/admin/teachers/assignments',element:e(AdminCourseOfferingsPage)},
  {path:'/admin/users/history',element:e(AdminUserHistoryPage)},
  {path:'/admin/portal/events',element:e(AdminCalendarPage)},
  {path:'/admin/rooms/import',element:e(ImportRoomsPage)},
  {path:'/admin/subjects/import',element:e(ImportSubjectsPage)},
  {path:'/admin/rooms',element:e(AdminRoomsPage)},
  {path:'/admin/subjects',element:e(AdminSubjectsPage)},
  {path:'/admin/academic-terms',element:e(AdminAcademicTermsPage)},
  {path:'/admin/ruta-inexistente',element:e(AdminNotFoundPage)},
  {path:'/admin/careers',element:e(AdminReadPage,{kind:'careers'})},
  {path:'/admin/audit-logs',element:e(AdminReadPage,{kind:'audit-logs'})},
].map((route)=>({...route,element:e('main',{'data-qa':'layout-main'},route.element)})).concat([
  {path:'/admin/portal/news',element:e('main',{'data-qa':'layout-main'},e(AdminNewsPage))},
  {path:'/news',element:e(NewsPage)},
  {path:'/news/:newsId',element:e(NewsDetailPage)},
  {path:'/admin/portal/services',element:e('main',{'data-qa':'layout-main'},e(AdminServicesPage))},
  {path:'/services',element:e(ServicesPage)},
  {path:'/services/:serviceId',element:e(ServiceDetailPage)},
  {path:'/admin/portal/information',element:e('main',{'data-qa':'layout-main'},e(AdminInformationPage))},
  {path:'/information',element:e(InformationPage)},
  {path:'/teacher/students/:courseOfferingId',element:e(TeacherSubjectStudentsPage)},
  {path:'/teacher/students/:courseOfferingId/import',element:e(ImportSubjectStudentsPage)},
  {path:'/teacher/subjects',element:e(TeacherSubjectsPage)},
  {path:'/teacher/students',element:e(TeacherStudentsPage)},
  {path:'/teacher/exams',element:e(TeacherExamsPage)},
  {path:'/teacher/exams/:examId',element:e(TeacherExamDetailPage)},
  {path:'/teacher/exams/:examId/collaborators',element:e(CollaborationsProvider,null,e(ExamCollaboratorsPage))},
  {path:'/collaborator',element:e(CollaborationsProvider,null,e(CollaboratorPage))},
  {path:'/students',element:e(StudentLayout),children:[{path:'profile',element:e(StudentProfilePage)},{path:'qr',element:e(StudentQrPage)}]},
]).map(route=>({...route,element:e(React.Fragment,null,e(Header,{user:route.path.startsWith('/admin')?{name:'Administradora QA con nombre y apellidos extraordinariamente largos',role:'admin'}:null}),route.element)}));
// Navigation fixture for the real student breadcrumb. No backend or production home data involved.
routes.push({path:'/',element:e('main',{'data-qa-home':true},e('h1',null,'Inicio QA'),
  e(Link,{to:'/students/profile'},'Mi perfil'),e(Link,{to:'/students/qr'},'Mis exámenes'))});
const root=createRoot(document.getElementById('root'));
qa.show=(path)=>{qa.calls=[];qa.unexpected=[];qa.overrides=qa.nextOverrides??{};qa.authUser=qa.nextAuthUser;qa.nextOverrides=undefined;qa.nextAuthUser=undefined;root.render(e(RouterProvider,{key:path+Math.random(),router:createMemoryRouter(routes,{initialEntries:[path]})}));};
`

const screens = [
  {path:'/admin/students/manage',title:'Gestión de estudiantes',crumbs:['Inicio','Estudiantes','Gestionar estudiantes'],structural:true,actions:['+ Registrar estudiante','+ Importar CSV']},
  {path:'/admin/users/manage',title:'Gestión de usuarios',crumbs:['Inicio','Usuarios','Gestionar usuarios'],structural:true,rows:['QA de prueba Persona']},
  {path:'/admin/users/roles',title:'Roles y permisos',crumbs:['Inicio','Usuarios','Roles y permisos'],structural:true,rows:['QA de prueba Persona']},
  {path:'/admin/users/15/roles',title:'Gestionar roles y permisos',crumbs:['Inicio','Roles y permisos','Gestionar roles y permisos'],structural:true,rows:['Asignar rol']},
  {path:'/admin/students/import',title:'Importar estudiantes',crumbs:['Inicio','Estudiantes','Importar estudiantes'],structural:true,csv:true},
  {path:'/admin/teachers/assignments/import',title:'Importar asignaciones de materias',crumbs:['Inicio','Docentes','Asignación de materias','Importar asignaciones'],structural:true,csv:true},
  {path:'/admin/teachers',title:'Gestión de docentes',crumbs:['Inicio','Docentes','Gestionar docentes'],legacy:baseline},
  {path:'/admin/teachers/assignments',title:'Materias asignadas a docentes',crumbs:['Inicio','Docentes','Asignación de materias'],legacy:baseline},
  {path:'/admin/users/history',title:'Historial de usuarios y roles',crumbs:baseline&&!structuralBaseline?[]:['Inicio','Historial de usuarios y roles'],legacy:baseline,rows:['Responsable QA con nombre y apellidos extensos']},
  {path:'/admin/portal/events',title:'Gestión del calendario',crumbs:['Inicio','Gestión del calendario'],legacy:baseline},
  { path: '/admin/rooms/import', title: 'Importar aulas', crumbs: ['Inicio', 'Aulas', 'Importar aulas'], kind: 'import', csv: true },
  { path: '/admin/subjects/import', title: 'Importar materias', crumbs: ['Inicio', 'Materias', 'Importar materias'], kind: 'import', csv: true },
  { path: '/admin/rooms', title: 'Gestión de aulas', crumbs: ['Inicio', 'Aulas', 'Gestionar aulas'], kind: 'catalog',
    actions: ['+ Importar aulas (CSV)', '+ Registrar aula'], rows: ['Aula QA 101', 'Laboratorio QA 202'] },
  { path: '/admin/subjects', title: 'Gestión de materias', crumbs: ['Inicio', 'Materias', 'Gestionar materias'], kind: 'catalog',
    actions: ['+ Importar materias (CSV)', '+ Registrar materia'], rows: ['Materia QA de programación'] },
  // DS3.1: Periodos académicos adopts PageContainer/PageHeader (structural admin contract).
  { path: '/admin/academic-terms', title: 'Periodos académicos', crumbs: ['Inicio', 'Periodos académicos'], structural: true, focusTitle: true,
    description: 'Consulta las gestiones disponibles para organizar las ofertas académicas y conservar su historial.', actions: ['+ Registrar periodo'], rows: ['Periodo QA 2026'] },
  // DS3.2: admin catch-all route (router `*` under AdminLayout).
  { path: '/admin/ruta-inexistente', title: 'Página no encontrada', crumbs: ['Inicio', 'Página no encontrada'], structural: true,
    description: 'La sección administrativa que buscas no existe o no se encuentra disponible.', actions: ['Volver al inicio'] },
  { path: '/admin/careers', title: 'Carreras', crumbs: baseline && !structuralBaseline ? [] : ['Inicio', 'Carreras'], kind: 'read', description: 'Consulta del catálogo. Incluye carreras activas e inactivas.',
    rows: ['Carrera QA Sistemas', 'Carrera QA Industrial'] },
  { path: '/admin/portal/news', title: 'Gestión de noticias', crumbs: ['Inicio', 'Gestión de noticias'], kind: 'news-admin',
    description: 'Crea, publica y archiva las noticias del portal institucional.', actions: ['Crear noticia'], rows: ['Noticia QA publicada', 'Noticia QA en borrador'] },
  { path: '/news', title: 'Noticias institucionales', crumbs: ['Inicio', 'Noticias institucionales'], kind: 'news-public', rows: ['Noticia QA publicada'] },
  { path: '/admin/portal/services', title: 'Gestión de servicios', crumbs: ['Inicio', 'Gestión de servicios'], kind: 'portal-admin', selects: 1,
    description: 'Administra los servicios y enlaces institucionales.', actions: ['Crear servicio'], rows: ['Servicio QA activo', 'Servicio QA inactivo'] },
  { path: '/services', title: 'Servicios institucionales', crumbs: ['Inicio', 'Servicios institucionales'], kind: 'portal-public', rows: ['Servicio QA activo'] },
  { path: '/admin/portal/information', title: 'Gestión de información y FAQ', crumbs: ['Inicio', 'Gestión de información y FAQ'], kind: 'portal-admin', selects: 2,
    description: 'Administra las secciones institucionales y las preguntas frecuentes del portal.', rows: ['Sección QA institucional'] },
  { path: '/information', title: 'Información institucional', crumbs: ['Inicio', 'Información institucional'], kind: 'portal-public', rows: ['Sección QA institucional', '¿Pregunta QA?'] },
  { path: '/admin/audit-logs', title: 'Auditoría', crumbs: baseline && !structuralBaseline ? [] : ['Inicio', 'Auditoría'], kind: 'read', legacy: baseline, description: 'El total cuenta eventos.', rows: ['UPDATE'] },
  // DS4.1a: teacher pages own their main landmark (AppLayout has none).
  { path: '/teacher/students/7', title: 'Materia QA de programación con un nombre largo', crumbs: ['Inicio', 'Mis materias', 'Estudiantes de Materia QA de programación con un nombre largo'],
    structural: true, teacher: 'manage', noDescription: true, actions: ['+ Agregar estudiante manualmente', 'Importar estudiantes (CSV)'], rows: ['QA-301', 'Periodo QA 2026'] },
  { path: '/teacher/students/8', title: 'Materia QA de consulta', crumbs: ['Inicio', 'Mis materias', 'Estudiantes de Materia QA de consulta'],
    structural: true, teacher: 'readonly', noDescription: true, actions: ['+ Agregar estudiante manualmente', 'Importar estudiantes (CSV)'], rows: ['Oferta de solo consulta'] },
  { path: '/teacher/students/99', title: 'No se pudo acceder a la materia', crumbs: ['Inicio', 'Mis materias', 'Estudiantes de la materia'],
    structural: true, teacher: 'error', noDescription: true, actions: ['← Volver a mis materias'], rows: ['no está disponible para este docente'] },
  { path: '/teacher/students/7/import', title: 'Importar estudiantes', crumbs: ['Inicio', 'Mis materias', 'Estudiantes inscritos', 'Importar estudiantes'],
    structural: true, csv: true, description: 'Materia QA de programación con un nombre largo · Periodo QA 2026' },
  // U1: teacher lists own their main; header and breadcrumbs sit outside the content card.
  { path: '/teacher/subjects', title: 'Mis materias', crumbs: ['Inicio', 'Mis materias'], structural: true, card: true,
    description: 'Gestiona tus materias, crea examenes y administra estudiantes.', rows: ['Materia QA de programación con un nombre largo'] },
  { path: '/teacher/students', title: 'Estudiantes', crumbs: ['Inicio', 'Estudiantes', 'Gestionar estudiantes'], structural: true, card: true,
    description: 'Selecciona una materia para consultar la lista de estudiantes inscritos.', rows: ['Materia QA de programación con un nombre largo'] },
  { path: '/teacher/exams', title: 'Mis exámenes', crumbs: ['Inicio', 'Mis exámenes'], structural: true, card: true,
    description: 'Consulta tus exámenes por materia, fecha y estado.', rows: ['Parcial QA de programación'] },
  // U3.1: exam detail keeps its section cards; no page-wide card around the header.
  { path: '/teacher/exams/5', title: 'Parcial QA de programación', crumbs: ['Inicio', 'Mis exámenes', 'Detalle del examen'], structural: true, examDetail: 'loaded',
    description: 'Materia QA de programación con un nombre largo · QA-111', rows: ['Preparación del ingreso', 'Normas y restricciones', 'Edición del examen'] },
  { path: '/teacher/exams/99', title: 'Detalle del examen', crumbs: ['Inicio', 'Mis exámenes', 'Detalle del examen'], structural: true, examDetail: 'error',
    description: 'Consulta la información de tu evaluación.', rows: ['No se pudo consultar el examen'] },
  // U3.2: collaborators keep their breadcrumbs exactly (no «Inicio»); the collaborator page has none.
  { path: '/teacher/exams/5/collaborators', title: 'Colaboradores temporales', crumbs: ['Mis exámenes', 'Colaboradores'], structural: true, card: true, collab: 'assign',
    description: 'Gestiona a los usuarios autorizados para colaborar en este examen.', rows: ['Colaboradores asignados', 'Colaborador QA con nombre extenso'] },
  { path: '/teacher/exams/99/collaborators', title: 'Colaboradores temporales', crumbs: ['Mis exámenes', 'Colaboradores'], structural: true, card: true, collab: 'error',
    description: 'Gestiona a los usuarios autorizados para colaborar en este examen.', rows: ['Reintentar'] },
  { path: '/collaborator', title: 'Apartado de colaborador', crumbs: [], structural: true, card: true, collab: 'own', authUser: { id: 21, must_change_password: false },
    description: 'Consulta los exámenes en los que tienes una autorización temporal y accede a las herramientas de control de ingreso.', rows: ['Parcial QA de programación', 'Control de ingreso'] },
  { path: '/collaborator#error', title: 'Apartado de colaborador', crumbs: [], structural: true, card: true, collab: 'error', authUser: { id: 21, must_change_password: false }, overrides: { '/me/collaborations': 500 },
    description: 'Consulta los exámenes en los que tienes una autorización temporal y accede a las herramientas de control de ingreso.', rows: ['Reintentar'] },
  // R3: public details keep their generic h1 and exact breadcrumbs; the item title stays in the content.
  { path: '/news/41', title: 'Detalle de noticia', crumbs: ['Inicio', 'Detalle de noticia'], kind: 'portal-detail', back: 'Volver a noticias', rows: ['Noticia QA publicada', 'Contenido QA de la noticia publicada.'] },
  { path: '/news/99', title: 'Detalle de noticia', crumbs: ['Inicio', 'Detalle de noticia'], kind: 'portal-detail', back: 'Volver a noticias', detailError: true, rows: ['Reintentar'] },
  { path: '/services/42', title: 'Detalle de servicio', crumbs: ['Inicio', 'Detalle de servicio'], kind: 'portal-detail', back: 'Volver a servicios', rows: ['Servicio QA activo'] },
  { path: '/services/99', title: 'Detalle de servicio', crumbs: ['Inicio', 'Detalle de servicio'], kind: 'portal-detail', back: 'Volver a servicios', detailError: true, rows: ['Reintentar'] },
  // StudentLayout owns main; shared breadcrumbs preserve the provisional title accent.
  { path: '/students/profile', title: 'Mi perfil', crumbs: ['Inicio', 'Mi perfil'], structural: true, student: true,
    description: 'Consulta tu información personal y académica registrada en el sistema.', rows: ['QA-STU-01'] },
  { path: '/students/qr', title: 'Mis exámenes', crumbs: ['Inicio', 'Mis exámenes'], structural: true, student: true,
    description: 'Consulta tus exámenes programados y accede a tu código QR cuando esté disponible.', rows: ['Parcial QA de programación'] },
].filter(screen => process.env.EIDA_LAYOUT_SCOPE === 'r3' ? screen.kind === 'portal-detail' : process.env.EIDA_LAYOUT_SCOPE === 'u3f2' ? screen.collab : process.env.EIDA_LAYOUT_SCOPE === 'u3f1' ? screen.examDetail : process.env.EIDA_LAYOUT_SCOPE === 'u12' ? /^\/(teacher\/(subjects|students|exams)$|students\/)/.test(screen.path) : process.env.EIDA_LAYOUT_SCOPE === 'd53' ? ['/admin/students/manage','/admin/teachers'].includes(screen.path) : process.env.EIDA_LAYOUT_SCOPE !== 'd52' || screen.structural || ['/admin/users/history','/information','/news','/services'].includes(screen.path))

// Collected in the page: structure, visibility and overflow of the key elements.
const inspect = `(()=>{
  const vw=innerWidth, r=(el)=>el.getBoundingClientRect();
  const visible=(el)=>{if(!el)return false;const b=r(el);const s=getComputedStyle(el);return b.width>0&&b.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&b.left>=-1&&b.right<=vw+1};
  const h1s=[...document.querySelectorAll('h1')];
  const nav=document.querySelector('nav[aria-label="Ruta de navegación"]');
  const buttons=[...document.querySelectorAll('a,button')];
  const action=(label)=>{const el=buttons.find((b)=>b.textContent.trim()===label);return {label,found:!!el,visible:visible(el),name:el?(el.getAttribute('aria-label')||el.textContent.trim()):''}};
  const header=h1s[0]?.closest('header'), container=header?.parentElement, description=header?.querySelector('p:last-child');
  const panelControls=[...document.querySelectorAll('main section[aria-label] button,main section[aria-label] select,main section[aria-label] input:not([type=file])')].filter(el=>r(el).width>0);
  const escapedControls=panelControls.filter(el=>{const panel=el.closest('section[aria-label]'),b=r(el),p=r(panel);return b.left<p.left-1||b.right>p.right+1||el.scrollWidth>el.clientWidth+1}).map(el=>el.textContent.trim().slice(0,60));
  const overflowing=[...document.querySelectorAll('#root *')].filter((el)=>{const b=r(el);return b.width>0&&b.right>vw+1&&getComputedStyle(el).position!=='fixed'}).slice(0,8).map((el)=>el.tagName+'.'+String(el.className).slice(0,40));
  return {
    scroll:document.documentElement.scrollWidth, vw,
    client:document.documentElement.clientWidth,
    layout:header&&container?{x:r(h1s[0]).left,width:r(container).width,maxWidth:getComputedStyle(container).maxWidth,padding:getComputedStyle(container).padding,breadcrumbGap:nav?getComputedStyle(nav).marginBottom:null,headerGap:getComputedStyle(header).marginBottom,descriptionGap:description?getComputedStyle(description).marginTop:null}:null,
    descriptionX:description?r(description).left:null,
    vertical:header?{navTop:nav?r(nav).top:null,navBottom:nav?r(nav).bottom:null,headingTop:r(h1s[0]).top,
      headerTop:r(header).top,headerBottom:r(header).bottom,contentTop:header.nextElementSibling?r(header.nextElementSibling).top:null}:null,
    escapedControls,
    headingSurface:(()=>{for(let el=h1s[0];el;el=el.parentElement){const bg=getComputedStyle(el).backgroundColor;if(bg!=='rgba(0, 0, 0, 0)'&&bg!=='transparent')return bg}return getComputedStyle(document.body).backgroundColor})(),
    bodySurface:getComputedStyle(document.body).backgroundColor,
    current:nav?.querySelector('[aria-current=page]')?.textContent.trim(),
    links:nav?[...nav.querySelectorAll('a')].map(a=>a.getAttribute('href')):[],
    mains:document.querySelectorAll('main').length,
    h1:h1s.map((h)=>({text:h.textContent.trim(),id:h.id,tab:h.getAttribute('tabindex'),visible:visible(h),clipped:h.scrollWidth>h.clientWidth+1,weight:getComputedStyle(h).fontWeight,size:getComputedStyle(h).fontSize,lineHeight:getComputedStyle(h).lineHeight,margin:getComputedStyle(h).margin})),
    crumbs:nav?[...nav.querySelectorAll('li')].map((li)=>li.textContent.trim()):[], crumbsVisible:visible(nav),
    labelled:document.querySelector('section[aria-labelledby]')?.getAttribute('aria-labelledby')??null,
    text:document.body.innerText,
    search:!!document.querySelector('form[role="search"], input[type="search"]'),
    table:!!document.querySelector('table, [role="table"], [role="list"], ul, article'),
    fileInputs:document.querySelectorAll('input[type="file"]').length,
    templateButton:visible(buttons.find((b)=>/plantilla/i.test(b.textContent))),
    panelButtons:buttons.filter((b)=>visible(b)).map((b)=>b.textContent.trim()).filter(Boolean),
    overflowing, actions:window.__qaActions?window.__qaActions.map(action):[],
  };
})()`

let vite, chrome, ws, browserProfile
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
const results = []
const detailLooks = {}
const widths = process.env.EIDA_LAYOUT_WIDTHS?.split(',').map(Number) ?? [320,390,768,1024,1440]
// Run only the requested screens without repeating unrelated migrations.
const selectedPaths = process.env.EIDA_LAYOUT_PATHS?.split(',')
const selectedScreens = selectedPaths ? screens.filter(screen => selectedPaths.includes(screen.path)) : screens
assert.ok(selectedScreens.length, 'No matching pageLayout screens')
try {
  browserProfile = await createBrowserProfile('ds21-page-layout')
  const profile = browserProfile.dir
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
    plugins: [{
      name: 'ds21-page-layout-qa',
      enforce: 'pre',
      resolveId(id) { if (id === '/__ds21-layout.js') return '\0ds21-layout-qa' },
      load(id) {
        if (id === '\0ds21-layout-qa') return demo
        const normalized = id.replaceAll('\\', '/')
        if (normalized.endsWith('/src/shared/api/httpClient.ts'))
          return 'export const httpClient={get:(...a)=>window.pageLayoutQa.client.get(...a),post:(...a)=>window.pageLayoutQa.client.post(...a),put:(...a)=>window.pageLayoutQa.client.put(...a),patch:(...a)=>window.pageLayoutQa.client.patch(...a),delete:(...a)=>window.pageLayoutQa.client.delete(...a)};'
        // authUser is only set by screens that need a signed-in user (U3.2 collaborations provider).
        if (normalized.endsWith('/src/features/auth/hooks/useAuth.ts')) return 'export const useAuth=()=>({notify(){},user:window.pageLayoutQa?.authUser});'
        if (baseline && /\/src\/.*\.(tsx|css)$/.test(normalized)) {
          const path = normalized.slice(normalized.indexOf('/src/') + 1)
          try { return execFileSync('git', ['show', (process.env.EIDA_LAYOUT_BASE_REF ?? 'f56e082') + ':' + path], { encoding: 'utf8' }) } catch { /* virtual modules use the current source */ }
        }

      },
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.split('?')[0] !== '/__ds21-layout') return next()
          res.setHeader('Content-Type', 'text/html')
          res.end(await server.transformIndexHtml('/__ds21-layout',
            '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__ds21-layout.js"></script></html>'))
        })
      },
    }],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  assert.equal((await fetch(origin + '/__ds21-layout')).status, 200)
  console.log('QA: servidor local listo; iniciando Chrome sin ventana')
  chrome = spawn(process.env.EIDA_QA_CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
    { windowsHide: true, stdio: 'ignore' })
  let launchError
  chrome.on('error', (error) => { launchError = error })
  let port
  for (let index = 0; index < 80 && !port; index++) {
    if (launchError) throw launchError
    try { port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]) } catch { await pause(250) }
  }
  assert.ok(port, 'Chrome debugging port')
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  ws = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl)
  await new Promise((done, reject) => { ws.addEventListener('open', done, { once: true }); ws.addEventListener('error', reject, { once: true }) })

  let id = 0
  const pending = new Map()
  const exceptions = []
  const consoleErrors = []
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) {
      const request = pending.get(message.id)
      pending.delete(message.id)
      message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result)
    }
    if (message.method === 'Runtime.exceptionThrown')
      exceptions.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text)
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error')
      consoleErrors.push(message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' ').slice(0, 300))
  })
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id
    pending.set(next, { resolve, reject })
    ws.send(JSON.stringify({ id: next, method, params }))
  })
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
    return result.result.value
  }
  const wait = async (expression, label) => {
    for (let index = 0; index < 80; index++) { if (await evaluate(expression)) return; await pause(100) }
    throw new Error(`Tiempo agotado: ${label}`)
  }
  await send('Runtime.enable')
  await send('Page.enable')
  await send('Page.navigate', { url: origin + '/__ds21-layout' })
  await wait(`!!window.pageLayoutQa?.show`, 'arranque de la app QA')

  for (const width of widths) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 })
    await pause(150)
    for (const screen of selectedScreens) {
      const label = `${width}px ${screen.title}`
      const before = { exceptions: exceptions.length, console: consoleErrors.length }
      await evaluate(`window.__qaActions=${JSON.stringify(screen.actions ?? [])};pageLayoutQa.nextOverrides=${JSON.stringify(screen.overrides ?? {})};pageLayoutQa.nextAuthUser=${JSON.stringify(screen.authUser ?? null) === 'null' ? 'undefined' : JSON.stringify(screen.authUser)};pageLayoutQa.show(${JSON.stringify(screen.path)})`)
      await wait(`document.querySelector('h1')?.textContent.trim()===${JSON.stringify(screen.title)}`, `${label}: título`)
      if (screen.rows) await wait(`${JSON.stringify(screen.rows)}.every((t)=>document.body.innerText.includes(t))`, `${label}: filas`)
      if (screen.csv) await wait(`!!document.querySelector('input[type=file]')`, `${label}: formulario CSV`)
      await pause(150)
      const page = await evaluate(inspect)
      const unexpected = await evaluate('pageLayoutQa.unexpected')
      const failures = []
      const check = (ok, message) => { if (!ok) failures.push(message) }
      check(page.scroll <= page.client + 1, `desbordamiento horizontal ${page.scroll}>${page.client} ${page.overflowing.join(', ')}`)
      check(page.mains === 1, `${page.mains} <main> (se esperaba solo el del layout)`)
      check(page.h1.length === 1, `${page.h1.length} h1`)
      if (!baseline) check(page.h1[0]?.size === (width <= 640 ? '24px' : '32px'), 'escala H1: '+page.h1[0]?.size)
      if (!baseline && screen.path === '/admin/students/manage') check(page.h1[0]?.margin === '0px', 'margen H1: '+page.h1[0]?.margin)
      if (!screen.legacy) check(page.h1[0]?.weight === '700', `peso del h1 ${page.h1[0]?.weight}`)
      check(page.h1[0]?.text === screen.title && page.h1[0].visible && !page.h1[0].clipped, `h1 incorrecto/oculto/recortado ${JSON.stringify(page.h1[0])}`)
      check(JSON.stringify(page.crumbs) === JSON.stringify(screen.crumbs), `migas ${JSON.stringify(page.crumbs)}`)
      if (screen.crumbs.length) {
        check(page.crumbsVisible, 'migas no visibles')
        check(page.current === screen.crumbs.at(-1), 'aria-current de breadcrumb')
        check(page.links.every(href => ['/', '/admin', '/admin/rooms', '/admin/subjects', '/admin/teachers', '/admin/users/manage', '/admin/users/roles', '/admin/students/manage', '/admin/teachers/assignments', '/teacher/subjects', '/teacher/students/7', '/teacher/exams'].includes(href)), 'ruta breadcrumb desconocida')
      }
      if (!baseline) check(page.headingSurface === page.bodySurface, 'superficie de página: '+page.headingSurface+' / '+page.bodySurface)
      if (!baseline && (screen.structural || screen.path === '/admin/users/history')) {
        check(page.layout?.maxWidth === '1280px', 'ancho administrativo: '+JSON.stringify(page.layout))
        const expectedWidth=Math.min(page.client,1280), padding=page.layout.padding.split(' '), gutter=parseFloat(padding[1] ?? padding[0])
        check(Math.abs(page.layout.width-expectedWidth)<=1, 'contenedor fuera del ancho disponible')
        check(Math.abs(page.layout.x-((page.client-expectedWidth)/2+gutter))<=1, 'alineación H1 y contenedor')
        check(page.h1[0]?.lineHeight === (width <= 640 ? '30px' : '40px'), 'altura de línea H1')
        check((screen.crumbs.length ? page.layout?.breadcrumbGap === '24px' : page.layout?.breadcrumbGap === null) && page.layout?.headerGap === '24px' && page.layout?.descriptionGap === (screen.noDescription ? null : '8px'), 'espaciado de encabezado: '+JSON.stringify(page.layout))
        check(page.escapedControls.length === 0, 'controles CSV recortados/fuera del panel: '+page.escapedControls.join(', '))
      }
      if (!baseline && ['/information', '/news', '/services'].includes(screen.path)) {
        check(page.layout?.maxWidth === '960px', 'contrato público narrow: '+JSON.stringify(page.layout))
        check(page.layout?.headerGap === '24px', 'separación pública')
      }
      if (!baseline && screen.path === '/information') {
        check(page.layout?.descriptionGap === '8px', 'subtítulo fuera de PageHeader')
        check(Math.abs(page.descriptionX-page.layout.x)<=1, 'subtítulo desalineado del H1')
      }
      if (!baseline && screen.card) {
        // The content card follows the header inside the same container, aligned with the h1, and holds the list.
        const card = await evaluate(`(()=>{const h=document.querySelector('h1'),header=h.closest('header'),container=header.parentElement;
          const el=[...container.children].find(c=>c!==header&&!c.contains(header)&&getComputedStyle(c).boxShadow!=='none');if(!el)return null;
          const s=getComputedStyle(el),r=el.getBoundingClientRect(),cr=header.getBoundingClientRect();
          return {bg:s.backgroundColor,radius:s.borderTopLeftRadius,left:Math.round(r.left-cr.left),right:Math.round(cr.right-r.right),h1Inside:el.contains(h),rows:${JSON.stringify(screen.rows)}.every(t=>el.innerText.includes(t))}})()`)
        check(card && card.bg === 'rgb(255, 255, 255)' && card.radius !== '0px' && !card.h1Inside && card.rows && Math.abs(card.left) <= 1 && Math.abs(card.right) <= 1, 'tarjeta de contenido: ' + JSON.stringify(card))
      }
      if (!baseline && screen.examDetail) {
        // Section cards stay; actions and navigation are still there; no ancestor card wraps the h1.
        const detail = await evaluate(`(()=>{const h=document.querySelector('h1');let wrapped=false;for(let el=h.parentElement;el&&el.tagName!=='MAIN';el=el.parentElement){const s=getComputedStyle(el);if(s.boxShadow!=='none'||s.backgroundColor==='rgb(255, 255, 255)')wrapped=true}
          const cards=[...document.querySelectorAll('main section, main article')].filter(el=>{const s=getComputedStyle(el);return s.backgroundColor==='rgb(255, 255, 255)'&&parseFloat(s.borderTopLeftRadius)>0}).length;
          const names=[...document.querySelectorAll('main a, main button')].map(el=>el.textContent.trim());
          return {wrapped,cards,names,alert:!!document.querySelector('main [role=alert]')}})()`)
        check(!detail.wrapped, 'la cabecera sigue dentro de una tarjeta')
        if (screen.examDetail === 'loaded') check(detail.cards >= 3 && ['Distribución de listas', 'Control sin conexión', 'Editar examen'].every(n => detail.names.includes(n)), 'secciones/acciones del detalle: ' + JSON.stringify(detail))
        else check(detail.alert && detail.names.includes('Reintentar'), 'estado de error: ' + JSON.stringify(detail))
      }
      if (!baseline && screen.collab === 'error') check(await evaluate(`!!document.querySelector('main [role=alert]')`), 'estado de error sin alerta')
      if (!baseline && screen.collab === 'assign') {
        // The assign dialog (CollaborationModal, top layer) opens above the page and Escape returns focus.
        await evaluate(`(()=>{const b=[...document.querySelectorAll('main button')].find(b=>b.textContent.trim()==='+ Asignar colaborador');b.focus();b.click()})()`)
        await wait(`!!document.querySelector('[role=dialog][aria-modal=true]')`, `${label}: abrir asignar colaborador`)
        await pause(100)
        const dialog = await evaluate(`(()=>{const d=document.querySelector('[role=dialog][aria-modal=true]'),c=d.querySelector('[aria-label="Cerrar modal"]').getBoundingClientRect(),hit=document.elementFromPoint(c.left+c.width/2,c.top+c.height/2);
          return {title:d.querySelector('h2')?.textContent,closeOnTop:!!hit&&d.contains(hit),focusInside:d.contains(document.activeElement),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1}})()`)
        check(dialog.title === 'Asignar colaborador' && dialog.closeOnTop && dialog.focusInside && !dialog.overflow, 'diálogo de asignar: ' + JSON.stringify(dialog))
        await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
        await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
        await wait(`!document.querySelector('[role=dialog][aria-modal=true]')`, `${label}: Escape cierra asignar colaborador`)
        check(await evaluate(`document.activeElement?.textContent.trim()==='+ Asignar colaborador'`), 'foco no devuelto a «+ Asignar colaborador»')
        check(await evaluate(`pageLayoutQa.calls.every(call=>call.method==='get')`), 'escritura inesperada en colaboradores')
      }
      if (screen.kind === 'portal-detail') {
        // R3 contract: 960px reading width like the public lists, PageHeader spacing and h1 scale.
        if (!baseline && !page.layout) check(false, 'detalle público sin cabecera/contenedor comunes')
        if (!baseline && page.layout) {
          check(page.layout?.maxWidth === '960px' && page.layout?.headerGap === '24px' && page.layout?.breadcrumbGap === '24px', 'contrato de detalle público: ' + JSON.stringify(page.layout))
          check(page.h1[0]?.lineHeight === (width <= 640 ? '30px' : '40px'), 'altura de línea H1 ' + page.h1[0]?.lineHeight)
          const expectedWidth = Math.min(page.client, 960), padding = page.layout.padding.split(' '), gutter = parseFloat(padding[1] ?? padding[0])
          check(Math.abs(page.layout.width - expectedWidth) <= 1 && Math.abs(page.layout.x - ((page.client - expectedWidth) / 2 + gutter)) <= 1, 'alineación del detalle: ' + JSON.stringify(page.layout))
        }
        // Styles of "Volver a…" and of the error "Reintentar" button (portalBase .page button) must not change.
        const look = await evaluate(`(()=>{const pick=(el)=>{if(!el)return null;const s=getComputedStyle(el);return [s.minHeight,s.paddingTop,s.paddingLeft,s.borderTopWidth,s.borderTopStyle,s.borderTopColor,s.borderTopLeftRadius,s.backgroundColor,s.color,s.fontSize,s.fontWeight,s.textDecorationLine].join('|')};
          const back=[...document.querySelectorAll('main a')].find(a=>a.textContent.trim()===${JSON.stringify(screen.back)}),retry=[...document.querySelectorAll('main button')].find(b=>b.textContent.trim()==='Reintentar');
          return {back:pick(back),retry:pick(retry),alert:!!document.querySelector('main [role=alert]'),article:!!document.querySelector('main article')}})()`)
        check(look.back, 'falta «' + screen.back + '»')
        if (screen.detailError) check(look.alert && look.retry, 'estado de error sin alerta o sin Reintentar')
        detailLooks[`${screen.path}@${width}`] = look
      }
      if (!baseline && screen.student) {
        // Accent underline kept provisionally (no Figma reference to verify); the content panels stay as cards.
        const student = await evaluate(`(()=>{const h=document.querySelector('h1'),a=getComputedStyle(h,'::after');
          const panels=[...document.querySelectorAll('main section, main article, main div')].filter(el=>{const s=getComputedStyle(el);return s.backgroundColor==='rgb(255, 255, 255)'&&parseFloat(s.borderTopLeftRadius)>=12}).length;
          return {accent:a.content!=='none'&&a.backgroundColor!=='rgba(0, 0, 0, 0)',accentWidth:a.width,panels,mainId:document.querySelector('main')?.id}})()`)
        check(student.accent && student.panels >= 1 && student.mainId === 'student-content', 'contrato de estudiante: ' + JSON.stringify(student))
        check(JSON.stringify(page.links) === JSON.stringify(['/']), 'Inicio debe enlazar a /')
        const v=page.vertical;
        check(v.navTop>=0 && v.navBottom<=v.headerTop && v.headerBottom<=v.contentTop && v.contentTop<900,
          'espacio vertical/solapamiento: '+JSON.stringify(v))
      }
      if (screen.csv) check(page.fileInputs >= 1 && page.templateButton, 'archivo o plantilla CSV ausente')
      if (screen.description) check(page.text.includes(screen.description), 'descripción ausente')
      for (const action of page.actions) check(action.found && action.visible && action.name, `acción ${action.label} ${JSON.stringify(action)}`)
      if (screen.kind === 'import') {
        check(page.fileInputs >= 1, 'sin input de archivo CSV')
        check(page.labelled === `${screen.path.includes('rooms') ? 'import-rooms' : 'import-subjects'}-title`, `aria-labelledby ${page.labelled}`)
      }
      // The h1 keeps its id and tabIndex: dialogs return focus to it (AcademicTermModal).
      if (screen.focusTitle) check(page.h1[0]?.tab === '-1' && page.labelled === page.h1[0]?.id && page.h1[0]?.id === 'academic-terms-title', `id/tabIndex del h1 ${JSON.stringify(page.h1[0])} / ${page.labelled}`)
      if (screen.kind === 'catalog') {
        check(page.search, 'sin formulario de búsqueda')
        check(page.table, 'sin tabla/lista')
        check(page.h1[0]?.tab === '-1' && page.labelled === page.h1[0]?.id, `id/tabIndex del h1 ${JSON.stringify(page.h1[0])} / ${page.labelled}`)
      }
      if (screen.kind === 'news-admin') {
        check(page.search, 'sin búsqueda de noticias')
        check(await evaluate("!!document.querySelector('select[name=news_status]')"), 'sin filtro de estado')
        check(page.text.includes('Gestionar'), 'acción Gestionar ausente')
      }
      if (screen.kind === 'portal-admin') {
        check(page.search, 'sin búsqueda')
        const selects = await evaluate("document.querySelectorAll('[role=group][aria-label=Filtros] select, select').length")
        check(selects >= screen.selects, `filtros: ${selects} select (se esperaban ${screen.selects})`)
        check(page.text.includes('Gestionar'), 'acción Gestionar ausente')
      }
      if (screen.kind === 'portal-public') check(page.labelled === null, 'la página pública no debe etiquetar una section con aria-labelledby')
      if (screen.kind === 'read') {
        for (const row of screen.rows) check(page.text.includes(row), `fila ${row} ausente`)
        check(page.text.includes('Ver detalle'), 'acción "Ver detalle" ausente')
        if (screen.path === '/admin/careers') check(page.search, 'sin búsqueda en Carreras')
      }
      check(unexpected.length === 0, `peticiones inesperadas ${unexpected.join(', ')}`)
      check(exceptions.length === before.exceptions, `excepciones JS: ${exceptions.slice(before.exceptions).join(' | ')}`)
      const newConsole = consoleErrors.slice(before.console)
      check(newConsole.length === 0, `console.error: ${newConsole.join(' | ')}`)
      const shotName = `${screen.path.replaceAll('/', '_').slice(1)}-${width}.png`
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      await writeFile(join(evidence, shotName), Buffer.from(shot.data, 'base64'))
      if (!baseline && screen.path === '/admin/students/manage') {
        await evaluate(`(()=>{const button=[...document.querySelectorAll('main button')].find(b=>b.textContent.includes('+ Registrar estudiante'));button.focus();button.click()})()`)
        await wait(`!!document.querySelector('[role=dialog] form, dialog[open] form')`, 'formulario de registro de estudiante')
        await evaluate(`[...document.querySelectorAll('[role=dialog] button, dialog[open] button')].find(b=>b.textContent.trim()==='Cancelar').click()`)
        await wait(`!document.querySelector('[role=dialog], dialog[open]')`, 'cancelar registro de estudiante')
        await evaluate(`[...document.querySelectorAll('main button')].find(b=>b.textContent.trim()==='Desactivar').click()`)
        await wait(`document.body.innerText.includes('Desactivar cuenta')`, 'confirmación de estado')
        await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Cancelar').click()`)
        await wait(`!document.body.innerText.includes('Desactivar cuenta')`, 'cancelar cambio de estado')
        check(await evaluate(`pageLayoutQa.calls.every(call=>call.method==='get')`),'escritura inesperada en botones de estudiante')
        await evaluate(`document.querySelector('main a[href="/admin/students/import"]').click()`)
        await wait(`document.querySelector('h1')?.textContent==='Importar estudiantes'`, 'navegación a importar CSV')
      }
      if (!baseline && screen.teacher) {
        const state = await evaluate(`(()=>{const find=(t)=>[...document.querySelectorAll('main a,main button')].find(el=>el.textContent.trim()===t);const add=find('+ Agregar estudiante manualmente'),imp=find('Importar estudiantes (CSV)');return {add:add&&{tag:add.tagName,disabled:add.disabled,cls:add.className},imp:imp&&{tag:imp.tagName,disabled:!!imp.disabled,href:imp.getAttribute('href'),cls:imp.className},eyebrow:document.querySelector('main header p')?.textContent.trim()??null,alert:!!document.querySelector('[role=alert]')}})()`)
        if (screen.teacher === 'error') check(state.alert && !state.add && state.eyebrow === null, 'estado de error: '+JSON.stringify(state))
        else {
          check(state.eyebrow === 'Materia', 'eyebrow de materia: '+state.eyebrow)
          check(/button/.test(state.add?.cls) && /button/.test(state.imp?.cls), 'clases Button: '+JSON.stringify(state))
          if (screen.teacher === 'readonly') check(state.add.disabled && state.imp.tag === 'BUTTON' && state.imp.disabled, 'solo consulta deshabilitado: '+JSON.stringify(state))
          else {
            check(!state.add.disabled && state.imp.tag === 'A' && state.imp.href === '/teacher/students/7/import', 'acciones habilitadas: '+JSON.stringify(state))
            await evaluate(`(()=>{const b=[...document.querySelectorAll('main button')].find(b=>b.textContent.trim()==='+ Agregar estudiante manualmente');b.focus();b.click()})()`)
            await wait(`!!document.querySelector('dialog[open]')`, 'abrir inscripción manual')
            check(await evaluate(`document.querySelector('dialog[open]').contains(document.activeElement)`), 'foco inicial fuera del diálogo')
            await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
            await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
            await wait(`!document.querySelector('dialog')`, 'Escape cierra inscripción manual')
            check(await evaluate(`document.activeElement?.textContent.trim()==='+ Agregar estudiante manualmente'`), 'foco no devuelto al botón que abrió el diálogo')
            check(await evaluate(`pageLayoutQa.calls.every(call=>call.method==='get')`), 'escritura inesperada en inscripción manual')
          }
        }
      }
      // DS2.2d: Subjects and Academic terms use Button/ButtonLink; the create dialog keeps Escape and focus return.
      const createLabel = { '/admin/subjects': '+ Registrar materia', '/admin/academic-terms': '+ Registrar periodo' }[screen.path]
      if (!baseline && createLabel) {
        const ds = (selector) => `[...document.querySelectorAll(${JSON.stringify(selector)})].filter(el=>/(^|_)button(_|$)/.test(el.className)&&!/Button/.test(el.className)).length`
        check(await evaluate(ds('main button, main a')) >= (screen.path === '/admin/subjects' ? 3 : 1), 'botones de página sin Button')
        await evaluate(`(()=>{const b=[...document.querySelectorAll('main button')].find(b=>b.textContent.trim()===${JSON.stringify(createLabel)});b.focus();b.click()})()`)
        await wait(`!!document.querySelector('dialog[open] form')`, `${label}: abrir registro`)
        check(await evaluate(ds('dialog[open] footer button, dialog[open] form button')) >= 2, 'pie del diálogo sin Button')
        await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
        await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
        await wait(`!document.querySelector('dialog[open]')`, `${label}: Escape cierra el registro`)
        check(await evaluate(`document.activeElement?.textContent.trim()===${JSON.stringify(createLabel)}`), 'foco no devuelto al botón de registro')
        check(await evaluate(`pageLayoutQa.calls.every(call=>call.method==='get')`), 'escritura inesperada en registro')
      }
      if (screen.path === '/admin/users/manage') {
        const menuSelector='button[aria-controls][aria-label*="principal"]'
        if (await evaluate(`(()=>{const b=document.querySelector('${menuSelector}');return !!b&&b.getBoundingClientRect().width>0})()`)) {
          await evaluate(`(()=>{const button=document.querySelector('${menuSelector}');button.focus();button.click()})()`)
          await wait(`document.querySelector('${menuSelector}')?.getAttribute('aria-expanded')==='true'`, 'abrir menú global')
          check(await evaluate(`document.documentElement.scrollWidth<=document.documentElement.clientWidth+1`), 'overflow al abrir menú global')
          await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
          await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
          await wait(`document.querySelector('${menuSelector}')?.getAttribute('aria-expanded')==='false'`, 'cerrar menú global')
        }
        await evaluate(`(()=>{const button=document.querySelector('button[aria-haspopup="menu"]');button.focus();button.click()})()`)
        await wait(`document.querySelector('button[aria-haspopup="menu"]')?.getAttribute('aria-expanded')==='true'`, 'abrir cuenta')
        check(await evaluate(`(()=>{const menu=document.querySelector('[role=menu]');if(!menu)return false;const r=menu.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1})()`), 'menú de cuenta recortado')
        check(await evaluate(`document.querySelector('button[aria-haspopup="menu"]').textContent.includes('extraordinariamente largos')`), 'nombre completo inaccesible')
        const menuShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})
        await writeFile(join(evidence,shotName.replace('.png','-account.png')),Buffer.from(menuShot.data,'base64'))
        await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
        await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
        await wait(`document.querySelector('button[aria-haspopup="menu"]')?.getAttribute('aria-expanded')==='false'`, 'cerrar cuenta')
      }
      // DS4.2a: the shared CSV panels use Design System buttons, a coherent heading outline and keyboard access.
      if (!baseline && screen.csv) {
        const panel = await evaluate(`(()=>{const levels=[...document.querySelectorAll('main h1, main h2, main h3, main h4')].map(h=>Number(h.tagName[1]));
          const legacy=[...document.querySelectorAll('main button, main a')].filter(el=>/(template|cancel|continue|selectFile|removeFile|changeFile|pager|downloadView)Button/.test(el.className)&&!/(^|_)button(_|$)/.test(el.className)).length;
          const ds=[...document.querySelectorAll('main button')].filter(el=>/(^|_)button(_|$)/.test(el.className)).length;
          return {levels,legacy,ds,h2:levels.filter(l=>l===2).length}})()`)
        check(panel.levels[0] === 1 && panel.levels.every((level, index) => index === 0 || level <= panel.levels[index - 1] + 1), 'jerarquía de títulos '+JSON.stringify(panel.levels))
        check(panel.h2 >= 1, 'panel sin h2')
        check(panel.legacy === 0 && panel.ds >= 2, 'botones del panel: '+JSON.stringify(panel))
        await evaluate('document.activeElement?.blur();document.body.focus()')
        let reached = false
        for (let index = 0; index < 60 && !reached; index++) {
          await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9})
          await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9})
          reached = await evaluate(`/plantilla/i.test(document.activeElement?.textContent??'')`)
        }
        check(reached, 'Tab no alcanza «Descargar plantilla»')
        if (reached) check(await evaluate(`(()=>{const s=getComputedStyle(document.activeElement);return s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0})()`), 'foco no visible en «Descargar plantilla»')
      }
      if (screen.csv) {
        await evaluate(`(()=>{const dt=new DataTransfer();dt.items.add(new File(['sis_code,identity_number,first_names,last_names,email,career,profile_photo\\n'], 'padron_con_nombre_extremadamente_largo_para_verificar_que_el_archivo_y_los_botones_siguen_accesibles_en_pantallas_pequenas.csv',{type:'text/csv'}));const input=document.querySelector('input[type=file]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}))})()`)
        await pause(150)
        const selected=await evaluate(inspect)
        check(selected.scroll<=selected.client+1,'overflow con nombre CSV largo: '+selected.scroll+'/'+selected.client)
        check(selected.escapedControls.length===0,'controles CSV inaccesibles tras seleccionar archivo: '+selected.escapedControls.join(', '))
        check(selected.text.includes('padron_con_nombre_extremadamente_largo'), 'selección CSV no visible')
        const selectedShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})
        await writeFile(join(evidence,shotName.replace('.png','-selected.png')),Buffer.from(selectedShot.data,'base64'))
      }
      if (!baseline && screen.student) {
        // Real pointer navigation to Inicio and back through the explicitly registered student routes.
        const point=await evaluate(`(()=>{const a=document.querySelector('nav[aria-label="Ruta de navegación"] a');a.scrollIntoView({block:'center'});a.focus();const r=a.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`)
        await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1})
        await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1})
        await wait(`!!document.querySelector('[data-qa-home]')`, `${label}: navegar a Inicio`)
        await evaluate(`(()=>{const a=[...document.querySelectorAll('[data-qa-home] a')].find(a=>a.getAttribute('href')===${JSON.stringify(screen.path)});a.focus();a.click()})()`)
        await wait(`document.querySelector('h1')?.textContent.trim()===${JSON.stringify(screen.title)}`, `${label}: volver a ruta real`)
        await wait(`${JSON.stringify(screen.rows)}.every((t)=>document.body.innerText.includes(t))`, `${label}: contenido al volver`)
        check(await evaluate(`document.querySelectorAll('main').length===1 && document.querySelectorAll('h1').length===1`), 'landmarks tras navegar')
      }
      results.push({ width, path:screen.path, screen: screen.title, pass: failures.length === 0, failures, layout:page.layout, vertical:page.vertical, heading:page.h1[0], surface:page.headingSurface, breadcrumbs:page.crumbs, visibleButtons: page.panelButtons.slice(0, 12) })
      console.log(`${failures.length ? 'FAIL' : 'PASS'} ${label}${failures.length ? ': ' + failures.join(' · ') : ''}`)
    }
  }
  await writeFile(join(evidence, 'result.json'), JSON.stringify(results, null, 2))
  // R3: compare the "Volver a…"/"Reintentar" styles with a snapshot taken before the change.
  if (Object.keys(detailLooks).length) {
    await writeFile(join(evidence, 'portal-detail-styles.json'), JSON.stringify(detailLooks, null, 2))
    if (process.env.EIDA_PORTAL_DETAIL_BASELINE) {
      const before = JSON.parse(await readFile(process.env.EIDA_PORTAL_DETAIL_BASELINE, 'utf8'))
      const changed = Object.keys(detailLooks).filter((key) => before[key] && (before[key].back !== detailLooks[key].back || before[key].retry !== detailLooks[key].retry))
      assert.deepEqual(changed, [], 'estilos de «Volver a…»/«Reintentar» distintos de la instantánea previa')
      console.log(`R3: estilos de «Volver a…» y «Reintentar» idénticos a la instantánea previa (${Object.keys(before).length} combinaciones)`)
    }
  }
  if (!baseline) for (const width of widths) {
    const admin=results.filter(result=>result.width===width && ['/admin/students/manage','/admin/teachers','/admin/users/manage','/admin/users/roles','/admin/users/15/roles','/admin/users/history','/admin/students/import','/admin/teachers/assignments/import'].includes(result.path))
    // Tall CSV pages reserve the browser's vertical scrollbar: compare the shared contract,
    // while each page's width and alignment are checked against its own clientWidth above.
    if (admin.length) assert.equal(new Set(admin.map(result=>JSON.stringify((({x,width,...contract})=>contract)(result.layout)))).size,1,`${width}: contrato administrativo computado desigual`)
  }
  await writeFile(join(evidence, 'result.json'), JSON.stringify(results, null, 2))
  const failed = results.filter((result) => !result.pass)
  if (!structuralBaseline) assert.equal(failed.length, 0, `${failed.length} combinaciones con fallos`)
  console.log(`${structuralBaseline ? 'BASELINE registrada' : 'QA pageLayout PASS'} ${results.length - failed.length}/${results.length} · evidencia en ${evidence}`)
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await vite?.close()
}
