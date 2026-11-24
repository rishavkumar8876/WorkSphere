import { PrismaClient, UserRole, OrgMemberRole, ProjectStatus, TaskStatus, TaskPriority, MilestoneStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting WorkSphere database seeding...');

  // Common password hash for test accounts
  const salt = await bcrypt.genSalt(10);
  const commonPasswordHash = await bcrypt.hash('Password123!', salt);

  // 1. Create Platform Admin (Global oversight)
  const platformAdmin = await prisma.user.upsert({
    where: { email: 'admin@worksphere.io' },
    update: {},
    create: {
      email: 'admin@worksphere.io',
      passwordHash: commonPasswordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: UserRole.PLATFORM_ADMIN,
    },
  });
  console.log(`✅ Platform Admin seeded: ${platformAdmin.email}`);

  // 2. Create Tenant 1: Acme Corporation
  const acmeOrg = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      plan: 'enterprise',
    },
  });
  console.log(`✅ Organization 1 seeded: ${acmeOrg.name} (${acmeOrg.id})`);

  // 3. Create Tenant 1 Users across roles
  const orgOwner = await prisma.user.upsert({
    where: { email: 'owner@acme.com' },
    update: {},
    create: {
      email: 'owner@acme.com',
      passwordHash: commonPasswordHash,
      firstName: 'Alice',
      lastName: 'Owner',
      role: UserRole.ORG_OWNER,
    },
  });

  const projectManager = await prisma.user.upsert({
    where: { email: 'pm@acme.com' },
    update: {},
    create: {
      email: 'pm@acme.com',
      passwordHash: commonPasswordHash,
      firstName: 'Bob',
      lastName: 'Manager',
      role: UserRole.PROJECT_MANAGER,
    },
  });

  const teamMember = await prisma.user.upsert({
    where: { email: 'dev@acme.com' },
    update: {},
    create: {
      email: 'dev@acme.com',
      passwordHash: commonPasswordHash,
      firstName: 'Charlie',
      lastName: 'Developer',
      role: UserRole.TEAM_MEMBER,
    },
  });

  const auditor = await prisma.user.upsert({
    where: { email: 'auditor@acme.com' },
    update: {},
    create: {
      email: 'auditor@acme.com',
      passwordHash: commonPasswordHash,
      firstName: 'Diana',
      lastName: 'Auditor',
      role: UserRole.AUDITOR,
    },
  });

  // Link users to Acme Corporation
  const members = [
    { userId: orgOwner.id, role: OrgMemberRole.OWNER },
    { userId: projectManager.id, role: OrgMemberRole.ADMIN },
    { userId: teamMember.id, role: OrgMemberRole.MEMBER },
    { userId: auditor.id, role: OrgMemberRole.MEMBER },
  ];

  for (const m of members) {
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: acmeOrg.id,
          userId: m.userId,
        },
      },
      update: {},
      create: {
        organizationId: acmeOrg.id,
        userId: m.userId,
        role: m.role,
      },
    });
  }
  console.log('✅ Acme Organization members assigned');

  // 4. Create Tenant 2: Beta Innovations (For Cross-Tenant Boundary Tests)
  const betaOrg = await prisma.organization.upsert({
    where: { slug: 'beta-corp' },
    update: {},
    create: {
      name: 'Beta Innovations',
      slug: 'beta-corp',
      plan: 'pro',
    },
  });

  const betaOwner = await prisma.user.upsert({
    where: { email: 'owner@beta.com' },
    update: {},
    create: {
      email: 'owner@beta.com',
      passwordHash: commonPasswordHash,
      firstName: 'Bradley',
      lastName: 'BetaOwner',
      role: UserRole.ORG_OWNER,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: betaOrg.id,
        userId: betaOwner.id,
      },
    },
    update: {},
    create: {
      organizationId: betaOrg.id,
      userId: betaOwner.id,
      role: OrgMemberRole.OWNER,
    },
  });
  console.log(`✅ Organization 2 seeded for tenant isolation: ${betaOrg.name}`);

  // 5. Seed Project for Acme
  const project = await prisma.project.upsert({
    where: {
      organizationId_key: {
        organizationId: acmeOrg.id,
        key: 'WS',
      },
    },
    update: {},
    create: {
      organizationId: acmeOrg.id,
      name: 'WorkSphere Platform Rollout',
      key: 'WS',
      description: 'Primary full-stack development and milestone tracking for WorkSphere.',
      status: ProjectStatus.ACTIVE,
      ownerId: projectManager.id,
    },
  });
  console.log(`✅ Project seeded: ${project.name} (${project.key})`);

  // 6. Seed Milestone
  const milestone = await prisma.milestone.create({
    data: {
      organizationId: acmeOrg.id,
      projectId: project.id,
      title: 'Milestone 1: Core Architecture & OCC',
      status: MilestoneStatus.IN_PROGRESS,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 days
    },
  });

  // 7. Seed Sample Tasks with Version 1 (OCC ready)
  const task1 = await prisma.task.create({
    data: {
      organizationId: acmeOrg.id,
      projectId: project.id,
      milestoneId: milestone.id,
      title: 'Implement Multi-Tenant JWT Refresh Rotation',
      description: 'Setup access token rotation and detect token reuse attacks.',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      assigneeId: teamMember.id,
      reporterId: projectManager.id,
      version: 1,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      organizationId: acmeOrg.id,
      projectId: project.id,
      milestoneId: milestone.id,
      title: 'Implement Optimistic Concurrency Control on Task updates',
      description: 'Ensure concurrent edits reject stale version with 409 Conflict.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.URGENT,
      assigneeId: teamMember.id,
      reporterId: projectManager.id,
      version: 1,
    },
  });

  // Seed subtasks
  await prisma.subtask.createMany({
    data: [
      { taskId: task2.id, title: 'Add version column to Task model', isCompleted: true, position: 1 },
      { taskId: task2.id, title: 'Check WHERE id = $id AND version = $version', isCompleted: false, position: 2 },
      { taskId: task2.id, title: 'Write Supertest concurrent update test', isCompleted: false, position: 3 },
    ],
  });

  // Seed comment
  await prisma.comment.create({
    data: {
      organizationId: acmeOrg.id,
      taskId: task2.id,
      authorId: projectManager.id,
      content: 'Critical capstone requirement: verify that version is incremented on every update.',
    },
  });

  console.log(`✅ Seeded tasks: ${task1.title}, ${task2.title}`);
  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
