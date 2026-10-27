import {env} from 'cloudflare:workers';
import {cookies} from 'next/headers';
import {getChatGPTUser} from '../chatgpt-auth';
import {digest,randomToken} from './crypto';
export const COOKIE='__Host-kasturii-admin';
export async function isOwner(){const u=await getChatGPTUser();const allowed=((env as any).ADMIN_EMAILS||'').toLowerCase().split(',').map((x:string)=>x.trim()).filter(Boolean);return !!u&&allowed.includes(u.email.toLowerCase());}
export async function passwordConfigured(){return !!await env.DB!.prepare("SELECT id FROM settings WHERE id='admin_password'").first();}
export async function authenticated(){const token=(await cookies()).get(COOKIE)?.value;if(!token||! /^[a-f0-9]{64}$/.test(token))return false;return !!await env.DB!.prepare('SELECT token FROM admin_sessions WHERE token=? AND expires>?').bind(await digest(token),Date.now()).first();}
export async function session(){const token=randomToken();await env.DB!.prepare('DELETE FROM admin_sessions WHERE expires<=?').bind(Date.now()).run();await env.DB!.prepare('INSERT INTO admin_sessions(token,expires) VALUES(?,?)').bind(await digest(token),Date.now()+8*60*60*1000).run();return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`;}
export function sameOrigin(r:Request){return r.headers.get('origin')===new URL(r.url).origin;}
export function json(body:unknown,status=200,extra:Record<string,string>={}){return Response.json(body,{status,headers:{'Cache-Control':'no-store',...extra}});}
