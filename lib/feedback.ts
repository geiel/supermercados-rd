"use server";

import * as Sentry from "@sentry/nextjs";
import { db } from "@/db";
import { feedback, productIssueReports, productIssueEnum, categorySuggestions, categorySuggestionTypeEnum } from "@/db/schema/feedback";

export type ProductIssue = (typeof productIssueEnum.enumValues)[number];
export type CategorySuggestionType = (typeof categorySuggestionTypeEnum.enumValues)[number];

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
    Sentry.logger.error("Error submitting feedback:", { error });
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
    Sentry.logger.error("Error submitting issue report:", { error });
    return { success: false, error: "Error al reportar el problema" };
  }
}

type SubmitCategorySuggestionData = {
  type: CategorySuggestionType;
  suggestedName?: string;
  existingGroupId?: number;
  productId?: number;
  email?: string;
  notes?: string;
};

export async function submitCategorySuggestion(data: SubmitCategorySuggestionData) {
  try {
    await db.insert(categorySuggestions).values({
      type: data.type,
      suggestedName: data.suggestedName || null,
      existingGroupId: data.existingGroupId || null,
      productId: data.productId || null,
      userEmail: data.email || null,
      notes: data.notes || null,
    });

    return { success: true };
  } catch (error) {
    Sentry.logger.error("Error submitting category suggestion:", { error });
    return { success: false, error: "Error al enviar la sugerencia" };
  }
}
