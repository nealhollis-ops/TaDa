import { InviteClient } from "./invite-client";

export const metadata = { title: "Team invitation" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InviteClient token={token} />;
}
