import { useEffect } from "react";
import homePage from "./pages/home.html?raw";
import donationsPage from "./pages/donations.html?raw";

function extractBody(markup) {
  const documentMarkup = new DOMParser().parseFromString(markup, "text/html");
  documentMarkup.querySelectorAll("script").forEach((script) => script.remove());
  return documentMarkup.body.innerHTML;
}

const homeMarkup = extractBody(homePage);
const donationsMarkup = extractBody(donationsPage);

export default function App() {
  const isDonationsPage = window.location.pathname.endsWith(
    "/donaciones/donaciones.html"
  );

  useEffect(() => {
    document.title = isDonationsPage
      ? "Donaciones | Huellas Callejeras"
      : "Huellas Callejeras";

    if (isDonationsPage) {
      import("./styles/donaciones.css");
      import("./scripts/donaciones.js");
      return;
    }

    import("./scripts/script.js");
  }, [isDonationsPage]);

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: isDonationsPage ? donationsMarkup : homeMarkup
      }}
    />
  );
}
