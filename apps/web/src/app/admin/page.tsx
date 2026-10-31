export default function AdminPage() {
  const cmsUrl = process.env.NEXT_PUBLIC_CMS_ADMIN_URL ?? "http://localhost:1337/admin";
  return (
    <main className="admin">
      <h1>CMS administration</h1>
      <p>Content editing is managed in the Strapi administration panel.</p>
      <a className="btn" href={cmsUrl}>Open Strapi admin</a>
      <p><a href="/">Return to website</a></p>
    </main>
  );
}
