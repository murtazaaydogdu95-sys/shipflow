/**
 * Data migration script: Migrate existing users and projects to the Organization model.
 *
 * Run with: npx tsx prisma/migrate-to-orgs.ts
 *
 * This script:
 * 1. Finds all users who own projects (via ProjectMember where role=OWNER)
 * 2. Creates a personal workspace org for each user
 * 3. Assigns all their projects to the new org
 * 4. Copies user plan and lemonSqueezyCustomerId to the org
 * 5. Migrates existing Subscription from userId to orgId
 * 6. Sets user.currentOrgId
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting organization migration...\n");

  // Find all users (not just project owners, since every user needs an org)
  const users = await prisma.user.findMany({
    include: {
      projects: {
        include: { project: true },
      },
      subscription: true,
    },
  });

  console.log(`Found ${users.length} users to migrate.\n`);

  let orgsCreated = 0;
  let projectsMigrated = 0;
  let subscriptionsMigrated = 0;

  for (const user of users) {
    // Skip users who already have an org
    const existingMembership = await prisma.orgMember.findFirst({
      where: { userId: user.id },
    });
    if (existingMembership) {
      console.log(`  Skipping ${user.email} — already has org membership`);
      continue;
    }

    const name = user.name || user.email?.split("@")[0] || "My";
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-workspace-${user.id.slice(-6)}`;

    // Create the org
    const org = await prisma.organization.create({
      data: {
        name: `${name}'s Workspace`,
        slug,
        plan: user.plan || "FREE",
        lemonSqueezyCustomerId: user.lemonSqueezyCustomerId,
        members: {
          create: { userId: user.id, role: "OWNER" },
        },
      },
    });
    orgsCreated++;
    console.log(`  Created org "${org.name}" (${org.slug}) for ${user.email}`);

    // Assign user's projects to the org
    const ownedProjectIds = user.projects
      .filter((pm) => pm.role === "OWNER")
      .map((pm) => pm.projectId);

    if (ownedProjectIds.length > 0) {
      await prisma.project.updateMany({
        where: { id: { in: ownedProjectIds } },
        data: { orgId: org.id },
      });
      projectsMigrated += ownedProjectIds.length;
      console.log(`    Assigned ${ownedProjectIds.length} projects to org`);
    }

    // Migrate subscription from user to org
    if (user.subscription) {
      await prisma.subscription.update({
        where: { id: user.subscription.id },
        data: { orgId: org.id },
      });
      subscriptionsMigrated++;
      console.log(`    Migrated subscription to org`);
    }

    // Set user's currentOrgId
    await prisma.user.update({
      where: { id: user.id },
      data: { currentOrgId: org.id },
    });
  }

  console.log(`\nMigration complete!`);
  console.log(`  Organizations created: ${orgsCreated}`);
  console.log(`  Projects migrated: ${projectsMigrated}`);
  console.log(`  Subscriptions migrated: ${subscriptionsMigrated}`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
