import { createFileRoute } from "@tanstack/react-router";
import { ConsultationPage } from "~/components/ConsultationPage";
import { getConsultation } from "~/content/consultations";
import { pageHead } from "~/content/site";

const consultation = getConsultation("medical-availability");

export const Route = createFileRoute("/consult/medical-availability")({
  head: () =>
    pageHead({
      title: `${consultation.title}: FPDS consultation`,
      description: consultation.description,
      path: "/consult/medical-availability/",
    }),
  component: () => <ConsultationPage consultation={consultation} />,
});
