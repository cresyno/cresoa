import ClientPage from './ClientPage';

export async function generateStaticParams() {
  return [{ slug: "default", id: "default" }];
}

export default function Page() {
  return <ClientPage />;
}
