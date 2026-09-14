import { createFileRoute } from "@tanstack/react-router";
import { ConsultationPage } from "~/components/ConsultationPage";
import { getConsultation } from "~/content/consultations";
import { pageHead } from "~/content/site";

const consultation = getConsultation("release-clauses");

export const Route = createFileRoute("/consult/release-clauses")({
  head: () =>
    pageHead({
      title: `${consultation.title}: FPDS consultation`,
      description: consultation.description,
      path: "/consult/release-clauses/",
    }),
  component: () => <ConsultationPage consultation={consultation} />,
});
