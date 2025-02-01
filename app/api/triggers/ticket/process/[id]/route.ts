import { Database } from "@/database.types";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient<Database>();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Call FastAPI backend to process ticket
    const response = await fetch(
      `${process.env.FASTAPI_URL}/api/tickets/${id}/process`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.FASTAPI_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to process ticket");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
