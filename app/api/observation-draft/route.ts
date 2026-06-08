import { NextResponse } from "next/server";
import { generateAiObservationDraft } from "@/lib/observation-draft-ai.server";
import { generateMockObservationDraft } from "@/lib/observation-draft-mock";
import { validateDraftInput } from "@/lib/observation-draft-shared";
import type { ObservationDraftResult } from "@/lib/observation-drafting";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const validation = validateDraftInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const result: ObservationDraftResult = await generateAiObservationDraft(
      validation.data,
    );
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Observation draft generation failed.";

    const fallback = generateMockObservationDraft(validation.data, {
      extraWarnings: [
        `Using demo drafting because the AI service is unavailable (${message}).`,
      ],
    });

    return NextResponse.json(fallback);
  }
}
