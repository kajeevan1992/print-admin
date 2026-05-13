CREATE TABLE IF NOT EXISTS "DeploymentBuild" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT,
  "deploymentId" TEXT,
  "environment" TEXT NOT NULL DEFAULT 'production',
  "status" TEXT NOT NULL DEFAULT 'queued',
  "sourceRef" TEXT,
  "commitSha" TEXT,
  "buildNumber" INTEGER NOT NULL DEFAULT 1,
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "healthStatus" TEXT NOT NULL DEFAULT 'unknown',
  "rollbackOfBuildId" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "DeploymentBuild_status_idx" ON "DeploymentBuild" ("status");
CREATE INDEX IF NOT EXISTS "DeploymentBuild_tenantId_idx" ON "DeploymentBuild" ("tenantId");
CREATE INDEX IF NOT EXISTS "DeploymentBuild_deploymentId_idx" ON "DeploymentBuild" ("deploymentId");

CREATE TABLE IF NOT EXISTS "DeploymentLog" (
  "id" TEXT PRIMARY KEY,
  "deploymentBuildId" TEXT NOT NULL,
  "level" TEXT NOT NULL DEFAULT 'info',
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeploymentLog_deploymentBuildId_fkey" FOREIGN KEY ("deploymentBuildId") REFERENCES "DeploymentBuild"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "DeploymentLog_build_idx" ON "DeploymentLog" ("deploymentBuildId", "createdAt");

CREATE TABLE IF NOT EXISTS "DeploymentEvent" (
  "id" TEXT PRIMARY KEY,
  "deploymentBuildId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payloadJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeploymentEvent_deploymentBuildId_fkey" FOREIGN KEY ("deploymentBuildId") REFERENCES "DeploymentBuild"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "DeploymentEvent_build_idx" ON "DeploymentEvent" ("deploymentBuildId", "createdAt");

CREATE TABLE IF NOT EXISTS "DeploymentHealthCheck" (
  "id" TEXT PRIMARY KEY,
  "deploymentBuildId" TEXT NOT NULL,
  "checkName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'unknown',
  "targetUrl" TEXT,
  "statusCode" INTEGER,
  "message" TEXT,
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeploymentHealthCheck_deploymentBuildId_fkey" FOREIGN KEY ("deploymentBuildId") REFERENCES "DeploymentBuild"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "DeploymentHealthCheck_build_idx" ON "DeploymentHealthCheck" ("deploymentBuildId", "checkedAt");