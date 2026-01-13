"use server";

import { db } from "@/db";
import { feedback, productIssueReports, productIssueEnum } from "@/db/schema/feedback";

export type ProductIssue = (typeof productIssueEnum.enumValues)[number];

type SubmitFeedbackData = {
  feedback: string;
  email?: string;
  productId?: number;
};

type SubmitIssueReportData = {
  issue: ProductIssue;
  productId: number;
  shopId?: number;
  userId?: string;
};

export async function submitFeedback(data: SubmitFeedbackData) {
  try {
    await db.insert(feedback).values({
      feedback: data.feedback,
      userEmail: data.email || null,
    });

    return { success: true };
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return { success: false, error: "Error al enviar el comentario" };
  }
}

export async function submitIssueReport(data: SubmitIssueReportData) {
  try {
    await db.insert(productIssueReports).values({
      issue: data.issue,
      productId: data.productId,
      shopId: data.shopId || null,
      userId: data.userId || null,
    });

    return { success: true };
  } catch (error) {
    console.error("Error submitting issue report:", error);
    return { success: false, error: "Error al reportar el problema" };
  }
}
