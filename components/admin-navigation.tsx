"use client";
import Link from 'next/link';
import {useEffect,useId,useState} from 'react';
import {adminDefinitions} from '@/lib/upstream/registry';
import {useApp} from './providers';
import {Icon} from './ui';

const groups=[
 {id:'people',fa:'کاربران و سازمان‌ها',en:'People & organizations',icon:'Users',roots:['users','admins','companies','growth']},
 {id:'finance',fa:'مالی و اشتراک‌ها',en:'Billing & subscriptions',icon:'Wallet',roots:['financial','packages','subscriptions','credit-tiers','billing','revenue','affiliate','referrals','invites','payment-providers']},
 {id:'business',fa:'کسب‌وکار و فروش',en:'Business & sales',icon:'BriefcaseBusiness',roots:['crm','startup-inquiries','seo-intelligence','lead-connectors','industry-packs','categories']},
 {id:'ai',fa:'هوش مصنوعی و مصرف',en:'AI & usage',icon:'BrainCircuit',roots:['llm','models','provider-fallback','usage','analytics','prompts','ai-chat','chats']},
 {id:'learning',fa:'آموزش، فیتنس و بازی',en:'Learning, fitness & games',icon:'GraduationCap',roots:['student','academy','ai-courses','fitness','play','games']},
 {id:'content',fa:'تولید محتوا و تماس',en:'Content & calls',icon:'Clapperboard',roots:['video-factory','voice-studio','voice-agent','generated-websites','public-share','moderation']},
 {id:'system',fa:'تنظیمات و زیرساخت',en:'Settings & infrastructure',icon:'Settings',roots:['modules','module-access','tools','settings','cloudflare','system','logs','backups']},
] as const;
const extras:[string,string,string][]=[['growth','رشد مشتریان','Customer growth'],['payment-providers','درگاه‌های پرداخت','Payment providers'],['moderation','بازبینی محتوا','Content review'],['backups','پشتیبان‌ها','Backups']];
const entries=[...adminDefinitions.filter(([slug])=>!slug.includes('[')&&slug!=='dashboard').map(([slug,fa,en])=>({href:'/admin/'+slug,fa,en,root:slug.split('/')[0]})),...extras.map(([slug,fa,en])=>({href:'/admin/'+slug,fa,en,root:slug}))];
const aliases:Record<string,string>={overview:'dashboard',roles:'admins',finance:'financial',customers:'financial/customers',invoices:'financial',plans:'packages','billing-rates':'billing/rates',promotions:'billing/promotions',providers:'llm',fallback:'provider-fallback','chat-settings':'ai-chat','video-jobs':'video-factory','voice-jobs':'voice-studio',courses:'ai-courses',fit:'fitness',coaches:'fitness/marketplace',websites:'generated-websites',connectors:'lead-connectors',seo:'seo-intelligence',status:'system'};
const normalize=(s:string)=>s.toLowerCase().replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[\s\u200c]/g,'');
export function AdminNavigation({path,onExpand}:{path:string;onExpand?:()=>void}){
 const {fa,n}=useApp();const id=useId();
 const segment=path.slice(7).split('/')[0];
 const current=aliases[segment]?'/admin/'+aliases[segment]+path.slice(7+segment.length):path;
 const active=entries.filter(e=>current===e.href||current.startsWith(e.href+'/')).sort((a,b)=>b.href.length-a.href.length)[0];
 const activeGroup=groups.find(g=>g.roots.some(r=>r===active?.root))?.id||null;
 const [open,setOpen]=useState<string|null>(activeGroup),[query,setQuery]=useState('');
 useEffect(()=>{setOpen(activeGroup);setQuery('');},[path,activeGroup]);
 const matches=entries.filter(e=>normalize(e.fa+' '+e.en+' '+e.href).includes(normalize(query)));
 return <div className="admin-navigation"><label className="admin-nav-search"><Icon name="Search" size={16}/><input aria-label={fa?'جست‌وجوی بخش مدیریت':'Search admin sections'} placeholder={fa?'جست‌وجوی بخش مدیریت…':'Find an admin section…'} value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label={fa?'پاک‌کردن جست‌وجو':'Clear search'} onClick={()=>setQuery('')}><Icon name="X" size={14}/></button>}</label>
 <nav className="admin-nav-groups" aria-label={fa?'بخش‌های مدیریت':'Administration sections'}>
 <Link href="/admin/dashboard" className={'admin-overview-link '+(current==='/admin/dashboard'?'active':'')} aria-current={current==='/admin/dashboard'?'page':undefined} title={fa?'نمای کلی مدیریت':'Admin overview'}><Icon name="LayoutDashboard" size={19}/><span>{fa?'نمای کلی مدیریت':'Admin overview'}</span></Link>
 {groups.map(group=>{const items=matches.filter(e=>group.roots.some(root=>root===e.root));if(!items.length)return null;const expanded=!!query.trim()||open===group.id;const groupId=id+'-'+group.id;return <div className={'admin-nav-group '+(group.id===activeGroup?'current-group':'')} key={group.id}><button className="admin-nav-group-toggle" aria-expanded={expanded} aria-controls={groupId} title={fa?group.fa:group.en} onClick={()=>{onExpand?.();setOpen(expanded?null:group.id);}}><Icon name={group.icon} size={19}/><span>{fa?group.fa:group.en}</span><small>{n(items.length)}</small><Icon name="ChevronDown" size={14} className={expanded?'expanded':''}/></button><div id={groupId} hidden={!expanded} className="admin-nav-group-items">{items.map(entry=><Link href={entry.href} key={entry.href} className={active?.href===entry.href?'active':''} aria-current={active?.href===entry.href?'page':undefined} title={fa?entry.fa:entry.en}><span>{fa?entry.fa:entry.en}</span>{active?.href===entry.href&&<i className="tiny-dot"/>}</Link>)}</div></div>;})}
 {query&&!matches.length&&<p className="admin-nav-empty" role="status">{fa?'بخشی پیدا نشد.':'No matching section.'}</p>}
 </nav></div>;
}
