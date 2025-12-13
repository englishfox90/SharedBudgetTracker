import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Validates that the user is authenticated and has access to the specified account
 * Returns the accountId if valid, or an error response if invalid
 */
export async function validateAccountAccess(accountId?: string | null): Promise<{ accountId: number } | NextResponse> {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userAccountId = (session.user as any).accountId;

  if (!userAccountId) {
    return NextResponse.json({ error: "No account associated with user" }, { status: 403 });
  }

  // If specific accountId provided, verify it matches user's account
  if (accountId) {
    const requestedAccountId = parseInt(accountId, 10);
    if (isNaN(requestedAccountId)) {
      return NextResponse.json({ error: "Invalid account ID" }, { status: 400 });
    }
    if (requestedAccountId !== parseInt(userAccountId, 10)) {
      return NextResponse.json({ error: "Access denied to this account" }, { status: 403 });
    }
    return { accountId: requestedAccountId };
  }

  // No specific account requested, return user's account
  return { accountId: parseInt(userAccountId, 10) };
}
