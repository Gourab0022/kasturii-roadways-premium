import {isOwner} from '../auth';import Login from '../login';
export const dynamic='force-dynamic';
export default async function Setup(){if(!await isOwner())return <main className="admin"><a href="/admin">← Admin login</a><h1>Owner password setup</h1><p>Only the site owner can set or reset the shared admin password. Sign in using your authorized owner account.</p><a className="btn" href="/signin-with-chatgpt?return_to=/admin/setup" target="_top">Verify owner account</a></main>;return <Login setup/>;}
