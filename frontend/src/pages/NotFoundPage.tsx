import { Link } from "react-router-dom";
import { buttonClass } from "@/components/common/Button";

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="font-display text-6xl font-bold text-lagoon-700">404</p>
      <h1 className="mt-3 text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-ocean-700">The page you are looking for does not exist or has moved.</p>
      <Link to="/" className={`${buttonClass("primary", "md")} mt-6`}>Go to the home page</Link>
    </div>
  );
}
