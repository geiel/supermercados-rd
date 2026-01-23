import { NextResponse } from "next/server";

import { getChildGroupsByGroupId, getGroupByHumanId } from "@/lib/group-children";

type RouteParams = {
  params: Promise<{
    group_human_id: string;
  }>;
};

export async function GET(_: Request, { params }: RouteParams) {
  const { group_human_id } = await params;

  try {
    const group = await getGroupByHumanId(group_human_id);

    if (!group) {
      return NextResponse.json(
        { message: "Group not found." },
        { status: 404 }
      );
    }

    const children = await getChildGroupsByGroupId(group.id);
    return NextResponse.json({ groups: children });
  } catch (error) {
    console.error("[api/groups/children] Failed to load child groups", error);
    return NextResponse.json(
      { message: "Unable to load child groups at the moment." },
      { status: 500 }
    );
  }
}
