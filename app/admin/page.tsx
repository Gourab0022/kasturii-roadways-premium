import {env} from 'cloudflare:workers';import Admin from './panel';import Login from './login';import {authenticated,passwordConfigured} from './auth';
export const dynamic='force-dynamic';
export default async function Page(){if(!await authenticated())return <Login configured={await passwordConfigured()}/>;const rows=await env.DB!.prepare('SELECT id,data,created FROM enquiries ORDER BY id DESC LIMIT 100').all();return <Admin enquiries={rows.results}/>;}
