import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Store } from "lucide-react";
import { useStorefront } from "@/hooks/queries";
import { StorefrontView } from "@/components/storefront/StorefrontView";
import { Loading } from "@/components/common/States";
import { buttonClass } from "@/components/common/Button";
import { Button } from "@/components/common/Button";
import { QrCard } from "@/components/common/QrCard";
import { storeUrl } from "@/lib/utils";

export default function StorefrontPage() {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const preview = params.get("preview") === "1";
  const q = useStorefront(slug, preview);
  if (q.isLoading) return <Loading label="Loading storefront…" />;
  if (q.isError || !q.data) return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <Store className="mx-auto h-12 w-12 text-ocean-400" aria-hidden />
      <h1 className="mt-4 text-3xl font-bold">Storefront not available</h1>
      <p className="mt-2 text-ocean-700">This storefront does not exist, or its owner has not published it yet.</p>
      <Link to="/discover" className={`${buttonClass("primary", "md")} mt-6`}>Browse businesses</Link>
    </div>
  );
  const { business, items, isPreview } = q.data;
  return (
    <div>
      {isPreview && (
        <div className="bg-sun-100 px-4 py-2 text-center text-sm font-semibold text-sun-700">
          Draft preview: only you can see this. <Link to="/business" className="underline">Back to editor</Link>
        </div>
      )}
      <h1 className="sr-only">{business.name}</h1>
      <StorefrontView business={business} items={items} mode={isPreview ? "preview" : "live"} draftNotice={isPreview} />
      {!isPreview && (
        <details className="mx-auto max-w-3xl px-5 pb-6">
          <summary className="cursor-pointer rounded-lg py-2 text-sm font-semibold text-ocean-700">Share this storefront (QR code)</summary>
          <div className="card mt-2 p-5"><QrCard url={storeUrl(business.slug)} name={business.name} /></div>
        </details>
      )}
      {isPreview && <div className="px-4 pb-6 text-center"><Link to="/business"><Button variant="secondary"><ArrowLeft className="h-4 w-4" aria-hidden />Back to editor</Button></Link></div>}
    </div>
  );
}
