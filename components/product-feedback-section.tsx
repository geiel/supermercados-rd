"use client";

import { FeedbackDrawer } from "@/components/feedback-drawer";
import { ReportIssueDrawer } from "@/components/report-issue-drawer";

type Shop = {
  id: number;
  name: string;
  logo: string;
};

type ProductFeedbackSectionProps = {
  productId: number;
  shops: Shop[];
};

export function ProductFeedbackSection({
  productId,
  shops,
}: ProductFeedbackSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="font-bold text-2xl">Feedback</div>
      <div className="flex items-start gap-2">
        <p className="text-sm">
          La información mostrada proviene de múltiples fuentes externas y debe
          usarse solo como guía.
        </p>
      </div>

      <p className="text-sm">
        ¿Has notado algo incorrecto en este producto? ¿Tienes sugerencias de
        mejora?
      </p>

      <div className="flex items-center gap-3 text-sm">
        <FeedbackDrawer productId={productId}>
          <button className="text-primary underline underline-offset-4 cursor-pointer">
            Enviar comentario
          </button>
        </FeedbackDrawer>
        <span className="text-muted-foreground">|</span>
        <ReportIssueDrawer productId={productId} shops={shops}>
          <button className="text-primary underline underline-offset-4 cursor-pointer">
            Reportar problema
          </button>
        </ReportIssueDrawer>
      </div>
    </section>
  );
}
