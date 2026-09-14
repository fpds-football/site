import { createFileRoute } from "@tanstack/react-router";
import { ConsultationPage } from "~/components/ConsultationPage";
import { getConsultation } from "~/content/consultations";
import { pageHead } from "~/content/site";

const consultation = getConsultation("wages");

export const Route = createFileRoute("/consult/wages")({
  head: () =>
    pageHead({
      title: `${consultation.title}: FPDS consultation`,
      description: consultation.description,
      path: "/consult/wages/",
    }),
  component: () => <ConsultationPage consultation={consultation} />,
});
